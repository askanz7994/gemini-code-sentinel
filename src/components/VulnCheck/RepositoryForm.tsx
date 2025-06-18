
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, LoaderCircle, Key } from "lucide-react";

type RepositoryFormProps = {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  activeAction: 'fetch' | 'scan' | 'scanning' | null;
};

const RepositoryForm = ({
  repoUrl,
  setRepoUrl,
  githubToken,
  setGithubToken,
  onSubmit,
  isLoading,
  activeAction
}: RepositoryFormProps) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Github className="h-6 w-6 text-accent" />
          <span>Repository Scanner</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="repo-url" className="text-foreground font-medium">
              GitHub Repository URL
            </Label>
            <Input
              id="repo-url"
              type="url"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="bg-background/50 border-border/50 focus:border-accent"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="github-token" className="text-foreground font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              GitHub Personal Access Token
            </Label>
            <Input
              id="github-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="bg-background/50 border-border/50 focus:border-accent"
              required
            />
            <p className="text-xs text-muted-foreground">
              Required to access repository files. Create one at GitHub Settings → Developer settings → Personal access tokens.
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 text-lg font-bold"
            disabled={isLoading}
          >
            {isLoading && activeAction === 'fetch' ? (
              <LoaderCircle className="animate-spin h-6 w-6" />
            ) : (
              "Fetch Repository Files"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RepositoryForm;
