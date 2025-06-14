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
      const urlParts = repoUrl.replace(/^(https?:\/\/)?github\.com\//, '').replace(/\.git$/, '').split('/');
      if (urlParts.length < 2) {
        toast({ title: "Error", description: "Invalid GitHub repository URL.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const [owner, repo] = urlParts;

      toast({ title: "Starting Scan...", description: "Fetching repository file list." });
      
      const repoInfoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
       if (!repoInfoResponse.ok) {
        if (repoInfoResponse.status === 404) {
          throw new Error("Repository not found. Make sure the URL is correct and the repository is public.");
        }
        if (repoInfoResponse.status === 403) {
          const errorData = await repoInfoResponse.json().catch(() => ({ message: "Rate limit likely exceeded or repository is private."}));
          console.error("GitHub API Error:", errorData);
          throw new Error(`GitHub API access forbidden. ${errorData.message}`);
        }
        throw new Error(`Failed to fetch repository info: ${repoInfoResponse.statusText} (Status: ${repoInfoResponse.status})`);
      }
      const repoInfo = await repoInfoResponse.json();
      const defaultBranch = repoInfo.default_branch;

      const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
       if (!treeResponse.ok) {
        if (treeResponse.status === 404) {
          throw new Error("Could not find the repository's file tree. The default branch may not exist or is empty.");
        }
        if (treeResponse.status === 403) {
          const errorData = await treeResponse.json().catch(() => ({ message: "Rate limit likely exceeded or repository is private."}));
          console.error("GitHub API Error:", errorData);
          throw new Error(`GitHub API access forbidden while fetching file tree. ${errorData.message}`);
        }
        throw new Error(`Failed to fetch repository file tree: ${treeResponse.statusText} (Status: ${treeResponse.status})`);
      }
      const treeData = await treeResponse.json();
      if(treeData.truncated) {
        toast({ title: "Warning", description: "Repository is too large, some files may not be scanned.", variant: "default" });
      }

      const scannableExtensions = ['.js', '.jsx', '.ts', '.tsx', 'package.json', 'Dockerfile', '.yml', '.yaml', '.py', '.go', '.java', '.rb', '.hcl'];
      const scannableFiles = ['requirements.txt', 'pom.xml', 'build.gradle'];
      const ignoredPaths = ['node_modules/', 'dist/', 'build/', '.git/', 'vendor/'];

      const filesToScan = treeData.tree.filter((file: any) => 
        file.type === 'blob' &&
        !ignoredPaths.some(ignoredPath => file.path.startsWith(ignoredPath)) &&
        (scannableExtensions.some(ext => file.path.endsWith(ext)) || scannableFiles.includes(file.path.split('/').pop()))
      );

      if (filesToScan.length === 0) {
        toast({ title: "Scan Complete", description: "No scannable files found in the repository.", variant: "default" });
        setResults([]);
        setIsLoading(false);
        return;
      }

      setResults([]);
      let vulnerabilityIdCounter = 1;
      let allVulnerabilities: Vulnerability[] = [];

      for (const [index, file] of filesToScan.entries()) {
        toast({ title: "Scanning...", description: `Analyzing ${file.path} (${index + 1}/${filesToScan.length})` });

        try {
            const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`;
            const githubFileResponse = await fetch(fileUrl);
    
            if (!githubFileResponse.ok) {
              console.warn(`Could not fetch file: ${file.path}. Status: ${githubFileResponse.statusText}`);
              continue; // Skip this file
            }
    
            const fileData = await githubFileResponse.json();
            
            if (fileData.size > 100000) { 
              console.warn(`Skipping large file: ${file.path}`);
              continue;
            }

            if (!fileData.content) {
              console.warn(`Skipping empty file: ${file.path}`);
              continue;
            }

            const fileContent = atob(fileData.content);
    
            const prompt = `
              Analyze the following code from the file '${file.path}' for security vulnerabilities.
              For each vulnerability, provide a concise description.
              The severity MUST be one of: 'Critical', 'High', 'Medium', 'Low'.
              Respond with ONLY a valid JSON array of objects. Each object in the array must have the following schema: { "id": number, "file": string, "line": number, "severity": "Critical" | "High" | "Medium" | "Low", "description": string }.
              The 'file' attribute MUST be exactly '${file.path}'.
              The 'line' number should be the best guess for the line where the vulnerability is found. The 'id' can be a placeholder, it will be reassigned.
              If there are NO vulnerabilities in this file, you MUST return an empty array [].
              Do not include any text, notes, or explanations before or after the JSON array.
    
              Here is the code from '${file.path}':
              \`\`\`
              ${fileContent}
              \`\`\`
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
              console.error(`Gemini API Error for ${file.path}:`, errorData);
              toast({ title: "Gemini API Error", description: `Analysis failed for ${file.path}.`, variant: "destructive" });
              continue;
            }
    
            const geminiData = await geminiResponse.json();
             if (!geminiData.candidates || geminiData.candidates.length === 0 || !geminiData.candidates[0].content?.parts) {
              console.warn(`The AI returned an empty or invalid response for ${file.path}.`, geminiData);
              continue;
            }

            const responseText = geminiData.candidates[0].content.parts[0].text;
            const cleanedResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            let vulnerabilitiesInFile: Vulnerability[] = [];
            try {
              if (cleanedResponse) {
                vulnerabilitiesInFile = JSON.parse(cleanedResponse);
              }
            } catch (e) {
              console.error(`Failed to parse AI response for ${file.path}:`, cleanedResponse);
              toast({ title: "AI Response Error", description: `Could not parse analysis for ${file.path}.`, variant: "destructive" });
              continue;
            }

            if (vulnerabilitiesInFile.length > 0) {
                const newVulnerabilities = vulnerabilitiesInFile.map(v => ({
                    ...v,
                    id: vulnerabilityIdCounter++,
                    file: file.path
                }));
                allVulnerabilities = [...allVulnerabilities, ...newVulnerabilities];
                setResults([...allVulnerabilities]);
            }
        } catch (fileError) {
            console.error(`Error processing file ${file.path}:`, fileError);
            toast({ title: "File Processing Error", description: `An error occurred while scanning ${file.path}.`, variant: "destructive" });
        }
      }

      if (allVulnerabilities.length > 0) {
        toast({ title: "Scan Complete", description: `Found ${allVulnerabilities.length} potential vulnerabilities across ${filesToScan.length} files.` });
      } else {
        toast({ title: "Scan Complete", description: `Scanned ${filesToScan.length} files. No vulnerabilities found.` });
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
