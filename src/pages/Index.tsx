import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, LoaderCircle, ShieldAlert, ShieldCheck, ShieldHalf, ShieldX, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Vulnerability = {
  id: number;
  file: string;
  line: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
};

const severityIcons = {
  'Critical': <ShieldAlert className="h-5 w-5 text-red-500" />,
  'High': <ShieldX className="h-5 w-5 text-orange-500" />,
  'Medium': <ShieldHalf className="h-5 w-5 text-yellow-500" />,
  'Low': <ShieldCheck className="h-5 w-5 text-blue-500" />,
};

const Index = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Vulnerability[] | null>(null);
  const { toast } = useToast();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      toast({ title: "Error", description: "Please enter a GitHub repository URL.", variant: "destructive" });
      return;
    }
    if (!apiKey) {
      toast({ title: "Error", description: "Please enter your Gemini API Key.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResults(null);
    
    try {
      const urlParts = repoUrl.replace(/^(https?:\/\/)?github\.com\//, '').split('/');
      if (urlParts.length < 2) {
        toast({ title: "Error", description: "Invalid GitHub repository URL.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const [owner, repo] = urlParts;

      toast({ title: "Scanning...", description: "Fetching package.json from GitHub." });
      const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`;
      const githubResponse = await fetch(githubApiUrl);

      if (!githubResponse.ok) {
        if (githubResponse.status === 404) {
             toast({ title: "Scan Update", description: "No package.json found. Currently, only package.json is scanned.", variant: "default" });
        } else {
             toast({ title: "Error", description: `Failed to fetch package.json: ${githubResponse.statusText}`, variant: "destructive" });
        }
        setIsLoading(false);
        return;
      }

      const fileData = await githubResponse.json();
      const packageJsonContent = atob(fileData.content);

      toast({ title: "Scanning...", description: "Analyzing dependencies with Gemini AI." });
      const prompt = `
        Analyze the following package.json content for security vulnerabilities in its dependencies.
        For each vulnerability, provide the package name, version, severity, and a concise description of the vulnerability.
        The severity MUST be one of: 'Critical', 'High', 'Medium', 'Low'.
        Respond with ONLY a valid JSON array of objects. Each object in the array must have the following schema: { "id": number, "file": "package.json", "line": number, "severity": "Critical" | "High" | "Medium" | "Low", "description": string }.
        The 'line' number should be your best guess for the line number of the dependency in the JSON file, or 0 if not applicable. The 'id' should be a unique number for each vulnerability.
        If there are no vulnerabilities, return an empty array [].
        Do not include any text, notes, or explanations before or after the JSON array.

        Here is the package.json content:
        ${packageJsonContent}
      `;

      const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
      const geminiResponse = await fetch(geminiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error("Gemini API Error:", errorData);
        toast({ title: "Gemini API Error", description: errorData?.error?.message || "An unknown error occurred.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const geminiData = await geminiResponse.json();
      if (!geminiData.candidates || geminiData.candidates.length === 0) {
        toast({ title: "AI Error", description: "The AI returned an empty response.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const responseText = geminiData.candidates[0].content.parts[0].text;
      const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      let vulnerabilities: Vulnerability[] = [];
      try {
        vulnerabilities = JSON.parse(cleanedResponse);
      } catch (e) {
        console.error("Failed to parse AI response:", cleanedResponse);
        throw new Error("The AI returned a response in an unexpected format.");
      }

      setResults(vulnerabilities);
      if (vulnerabilities.length > 0) {
        toast({ title: "Scan Complete", description: `Found ${vulnerabilities.length} potential vulnerabilities.` });
      } else {
        toast({ title: "Scan Complete", description: "No vulnerabilities found in package.json." });
      }

    } catch (error) {
      console.error("Scan failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <div className="absolute top-0 left-0 w-72 h-72 bg-accent/20 rounded-full filter blur-3xl animate-blob" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-blue-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8">
        <header className="w-full max-w-5xl mx-auto mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              VulnCheck AI
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Scan Your GitHub Repositories for Vulnerabilities with AI
            </p>
        </header>

        <main className="w-full max-w-2xl mx-auto">
          <form onSubmit={handleScan} className="space-y-4">
            <div className="relative">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="text"
                placeholder="https://github.com/owner/repo"
                className="pl-10 h-12 bg-card border-border/50 focus:ring-accent focus:ring-offset-background"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </div>
             <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="password"
                placeholder="Enter your Gemini API Key"
                className="pl-10 h-12 bg-card border-border/50 focus:ring-accent focus:ring-offset-background"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold bg-accent text-primary-foreground border-2 border-transparent transition-all duration-300 hover:bg-transparent hover:text-accent hover:border-accent"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin h-6 w-6" />
              ) : (
                "Scan Repository"
              )}
            </Button>
             <p className="text-xs text-center text-muted-foreground pt-2">
                Your API key is used only for this session and is not stored. For production, use server-side handling.
             </p>
          </form>

          {results && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-center mb-6">Scan Results</h2>
              {results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((vuln) => (
                    <Card key={vuln.id} className="bg-card/80 backdrop-blur-sm border-border/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          {severityIcons[vuln.severity]}
                          <span className="text-lg">{vuln.severity} Severity</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="font-mono text-sm text-accent mb-2">{vuln.file}:{vuln.line}</p>
                        <p className="text-muted-foreground">{vuln.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                 <Card className="bg-card/80 backdrop-blur-sm border-border/30">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center text-center p-6">
                        <ShieldCheck className="h-12 w-12 text-green-500 mb-4" />
                        <p className="text-lg font-semibold">No Vulnerabilities Found</p>
                        <p className="text-muted-foreground mt-1">The scan of package.json completed successfully.</p>
                      </div>
                    </CardContent>
                  </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
