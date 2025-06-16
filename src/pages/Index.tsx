import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, LoaderCircle, ShieldAlert, ShieldCheck, ShieldHalf, ShieldX, Files, Lock, Wrench, FileCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

type Vulnerability = {
  id: number;
  file: string;
  line: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  remediation: string;
};

const severityIcons = {
  'Critical': <ShieldAlert className="h-5 w-5 text-red-500" />,
  'High': <ShieldX className="h-5 w-5 text-orange-500" />,
  'Medium': <ShieldHalf className="h-5 w-5 text-yellow-500" />,
  'Low': <ShieldCheck className="h-5 w-5 text-blue-500" />,
};

const Index = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'fetch' | 'scan' | null>(null);
  const [results, setResults] = useState<Vulnerability[] | null>(null);
  const [repoFiles, setRepoFiles] = useState<any[] | null>(null);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFileContentForVulnId, setLoadingFileContentForVulnId] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleFetchFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      toast({ title: "Error", description: "Please enter a GitHub repository URL.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    setActiveAction('fetch');
    setResults(null);
    setRepoFiles(null);
    setRepoInfo(null);
    
    try {
      const githubRepoUrlPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-._]+)\/([a-zA-Z0-9-._]+)(?:\.git)?\/?$/;
      const match = repoUrl.match(githubRepoUrlPattern);

      if (!match) {
        toast({ title: "Error", description: "Invalid GitHub repository URL format. Please use 'https://github.com/owner/repo'.", variant: "destructive" });
        setIsLoading(false);
        setActiveAction(null);
        return;
      }

      let [, owner, repo] = match;
      if (repo.endsWith('.git')) {
        repo = repo.slice(0, -4);
      }
      setRepoInfo({ owner, repo });

      const headers: HeadersInit = {};
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }

      toast({ title: "Fetching Files...", description: "Getting repository file list." });
      
      const repoInfoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
       if (!repoInfoResponse.ok) {
        if (repoInfoResponse.status === 404) {
           if (githubToken) {
            throw new Error("Repository not found. Check the URL. For private repos, ensure your token has 'repo' scope and access.");
          } else {
            throw new Error("Repository not found. Check the URL. Private repos require a Personal Access Token.");
          }
        }
        if (repoInfoResponse.status === 401) {
          throw new Error("Authentication failed. Make sure your GitHub Personal Access Token is correct and has 'repo' scope.");
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

      const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
       if (!treeResponse.ok) {
        if (treeResponse.status === 404) {
          throw new Error("Could not find the repository's file tree. The default branch may not exist or is empty.");
        }
        if (treeResponse.status === 401) {
          throw new Error("Authentication failed. Make sure your GitHub Personal Access Token is correct and has 'repo' scope.");
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
      
      setRepoFiles(filesToScan);

      if (filesToScan.length > 0) {
        toast({ title: "Files Loaded", description: `Found ${filesToScan.length} scannable files. Ready to scan.` });
      } else {
        toast({ title: "No Files Found", description: "No scannable files were found in this repository." });
      }

    } catch (error) {
      console.error("Fetch failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      setRepoFiles(null);
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleStartScan = async () => {
    if (!repoFiles || repoFiles.length === 0) {
      toast({ title: "Error", description: "No files to scan.", variant: "destructive" });
      return;
    }
    if (!repoInfo) {
      toast({ title: "Error", description: "Repository information is missing. Please fetch files first.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setActiveAction('scan');
    setIsScanning(true);
    setResults(null); // Clear previous results and don't show anything until scan is complete
    
    try {
      const { owner, repo } = repoInfo;

      const headers: HeadersInit = {};
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }

      let vulnerabilityIdCounter = 1;
      let allVulnerabilities: Vulnerability[] = [];

      for (const [index, file] of repoFiles.entries()) {
        toast({ title: "Scanning", description: `Analyzing ${file.path} (${index + 1}/${repoFiles.length})` });
        
        await sleep(200); // Add delay to mitigate hitting rate limits

        const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`;
        const githubFileResponse = await fetch(fileUrl, { headers });

        if (!githubFileResponse.ok) {
          if (githubFileResponse.status === 401) {
            throw new Error("Authentication failed while fetching a file. Make sure your GitHub token is correct and has 'repo' scope. Scan aborted.");
          }
          console.warn(`Could not fetch file: ${file.path}. Status: ${githubFileResponse.statusText}`);
          continue; // Skip this file and proceed to the next one
        }

        try {
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

            // Call the edge function to scan the file
            const { data, error } = await supabase.functions.invoke('scan-vulnerability', {
              body: {
                fileContent: fileContent,
                filePath: file.path
              }
            });

            if (error) {
              console.error(`Error scanning file ${file.path}:`, error);
              toast({ title: "Scan Error", description: `Could not scan ${file.path}: ${error.message}`, variant: "destructive" });
              continue;
            }

            const vulnerabilitiesInFile = data.vulnerabilities || [];

            if (vulnerabilitiesInFile.length > 0) {
                const newVulnerabilities = vulnerabilitiesInFile.map((v: any) => ({
                    ...v,
                    id: vulnerabilityIdCounter++,
                    file: file.path
                }));
                allVulnerabilities = [...allVulnerabilities, ...newVulnerabilities];
            }
        } catch (fileError) {
            console.error(`Error processing file ${file.path}:`, fileError);
            toast({ title: "File Processing Error", description: `An error occurred while scanning ${file.path}.`, variant: "destructive" });
        }
      }

      // Set results after scan is complete
      setResults(allVulnerabilities);

      if (allVulnerabilities.length > 0) {
        toast({ title: "Scan Complete", description: `Found ${allVulnerabilities.length} potential vulnerabilities across ${repoFiles.length} files.` });
      } else {
        toast({ title: "Scan Complete", description: `Scanned ${repoFiles.length} files. No vulnerabilities found.` });
      }
    } catch (error) {
       console.error("Scan failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
      setIsScanning(false);
    }
  };

  const handleViewCode = async (vulnerability: Vulnerability) => {
    if (fileContents[vulnerability.file] || loadingFileContentForVulnId === vulnerability.id) {
      return; // Already fetched or is fetching
    }
    if (!repoInfo) {
      toast({ title: "Error", description: "Repository information is missing.", variant: "destructive" });
      return;
    }

    setLoadingFileContentForVulnId(vulnerability.id);
    try {
      const { owner, repo } = repoInfo;
      const headers: HeadersInit = {};
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }
      
      const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${vulnerability.file}`;
      const response = await fetch(fileUrl, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch file content for ${vulnerability.file}. Status: ${response.status}`);
      }

      const fileData = await response.json();
      if (!fileData.content) {
        setFileContents(prev => ({ ...prev, [vulnerability.file]: "// File content is not available or file is empty." }));
      } else {
        const content = atob(fileData.content);
        setFileContents(prev => ({ ...prev, [vulnerability.file]: content }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      setFileContents(prev => ({ ...prev, [vulnerability.file]: `// Error: ${errorMessage}` }));
    } finally {
      setLoadingFileContentForVulnId(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <div className="absolute top-0 left-0 w-72 h-72 bg-accent/20 rounded-full filter blur-3xl animate-blob" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full filter blur-3xl animate-blob" />
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
          <form onSubmit={handleFetchFiles} className="space-y-4">
            <div className="relative">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="text"
                placeholder="https://github.com/owner/repo"
                className="pl-10 h-12 bg-card border-border/50 focus:ring-accent focus:ring-offset-background"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter your GitHub Personal Access Token"
                className="pl-10 h-12 bg-card border-border/50 focus:ring-accent focus:ring-offset-background"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold bg-accent text-primary-foreground border-2 border-transparent transition-all duration-300 hover:bg-transparent hover:text-accent hover:border-accent"
              disabled={isLoading}
            >
              {isLoading && activeAction === 'fetch' ? (
                <LoaderCircle className="animate-spin h-6 w-6" />
              ) : (
                "Analyze Repository"
              )}
            </Button>
             <p className="text-xs text-center text-muted-foreground pt-2">
                To scan private repos, {' '}
                <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
                    create a GitHub token
                </a>
                {' '} with <code className="bg-muted px-1 py-0.5 rounded">repo</code> scope.
             </p>
          </form>

          {repoFiles && !isLoading && (
            <div className="mt-8 w-full">
              <Card className="bg-card/80 backdrop-blur-sm border-border/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Files className="h-6 w-6 text-accent" />
                    <span>Scannable Files</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {repoFiles.length > 0 ? (
                    <>
                      <p className="text-muted-foreground mb-4">
                        Found {repoFiles.length} files to scan. Click the button below to start the vulnerability check.
                      </p>
                      <div className="max-h-60 overflow-y-auto rounded-md border bg-background/50">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-white">File Path</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {repoFiles.map((file) => (
                              <TableRow key={file.path}>
                                <TableCell className="font-mono text-sm">{file.path}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <Button 
                        onClick={handleStartScan}
                        className="w-full mt-6 h-12 text-lg font-bold"
                        disabled={isLoading}
                      >
                        {isLoading && activeAction === 'scan' ? (
                          <LoaderCircle className="animate-spin h-6 w-6" />
                        ) : (
                          "Start Vulnerability Scan"
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No scannable files found in this repository.</p>
                      <p className="text-xs text-muted-foreground mt-1">Check the list of supported file types or try another repository.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {isScanning && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-center mb-6">Scanning</h2>
              <Card className="bg-card/80 backdrop-blur-sm border-border/30">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <LoaderCircle className="h-12 w-12 text-accent animate-spin mb-4" />
                    <p className="text-lg font-semibold">Scanning in Progress</p>
                    <p className="text-muted-foreground mt-1">Analyzing repository files for vulnerabilities...</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {results && !isScanning && (
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
                        <Accordion type="single" collapsible className="w-full mt-4">
                          {vuln.remediation && (
                            <AccordionItem value={`remediation-${vuln.id}`}>
                              <AccordionTrigger className="text-sm hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4 text-muted-foreground" />
                                  <span>How to Patch</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <p className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                                  {vuln.remediation}
                                </p>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                          <AccordionItem value={`code-${vuln.id}`}>
                            <AccordionTrigger className="text-sm hover:no-underline" onClick={() => handleViewCode(vuln)}>
                                <div className="flex items-center gap-2">
                                    <FileCode className="h-4 w-4 text-muted-foreground" />
                                    <span>View Code</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                {loadingFileContentForVulnId === vuln.id && (
                                    <div className="flex items-center justify-center p-4">
                                        <LoaderCircle className="h-6 w-6 animate-spin" />
                                    </div>
                                )}
                                {fileContents[vuln.file] && (
                                    <div className="bg-background/50 rounded-md overflow-hidden border">
                                        <pre className="max-h-96 overflow-y-auto p-2 font-mono text-xs">
                                            <code>
                                                {fileContents[vuln.file].split('\n').map((line, index) => (
                                                    <div 
                                                        key={index}
                                                        className={`flex items-start -mx-2 px-2 ${index + 1 === vuln.line ? 'bg-red-500/20' : 'hover:bg-white/5'}`}
                                                    >
                                                        <span className="text-right pr-4 text-muted-foreground select-none w-12">{index + 1}</span>
                                                        <span className="flex-1 whitespace-pre-wrap">{line || ' '}</span>
                                                    </div>
                                                ))}
                                            </code>
                                        </pre>
                                    </div>
                                )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
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
                        <p className="text-muted-foreground mt-1">The scan completed successfully and no vulnerabilities were found.</p>
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
