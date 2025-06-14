
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

const mockVulnerabilities: Vulnerability[] = [
  {
    id: 1,
    file: 'package.json',
    line: 25,
    severity: 'High',
    description: "Outdated dependency 'axios@0.21.1' with known prototype pollution vulnerability (CVE-2023-45857).",
  },
  {
    id: 2,
    file: 'src/utils/auth.js',
    line: 112,
    severity: 'Critical',
    description: "Hardcoded API secret found. Secrets should be stored in environment variables or a secret manager.",
  },
  {
    id: 3,
    file: 'routes/user.js',
    line: 45,
    severity: 'Medium',
    description: "Potential SQL injection vector found. Use parameterized queries instead of string concatenation.",
  },
    {
    id: 4,
    file: 'public/index.html',
    line: 8,
    severity: 'Low',
    description: "Missing Content Security Policy (CSP) header. Helps prevent XSS attacks.",
  },
];

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
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setResults(mockVulnerabilities);
    setIsLoading(false);
    toast({ title: "Scan Complete", description: "Found 4 potential vulnerabilities." });
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
