
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, LoaderCircle, Lock } from "lucide-react";

type RepositoryFormProps = {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  activeAction: 'fetch' | 'scan' | null;
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
    <form onSubmit={onSubmit} className="space-y-4">
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
          placeholder="Enter your GitHub Personal Access Token (Required)"
          className="pl-10 h-12 bg-card border-border/50 focus:ring-accent focus:ring-offset-background"
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          disabled={isLoading}
          required
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
        <strong>GitHub Personal Access Token is required.</strong> {' '}
        <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
          Create a GitHub token
        </a>
        {' '} with <code className="bg-muted px-1 py-0.5 rounded">repo</code> scope.
      </p>
    </form>
  );
};

export default RepositoryForm;
