
import { useToast } from "@/hooks/use-toast";
import { parseGitHubUrl, createGitHubHeaders, fetchRepositoryInfo, fetchRepositoryTree } from "@/utils/githubApi";
import { filterScannableFiles, calculateTotalSize, formatFileSize } from "@/utils/fileProcessing";
import { RepoInfo } from "@/types/vulnerability";

export const useFileFetcher = () => {
  const { toast } = useToast();

  const fetchFiles = async (
    repoUrl: string,
    githubToken: string,
    setState: (updater: (prev: any) => any) => void
  ) => {
    if (!repoUrl) {
      toast({ title: "Error", description: "Please enter a GitHub repository URL.", variant: "destructive" });
      return;
    }
    
    if (!githubToken) {
      toast({ title: "Error", description: "GitHub Personal Access Token is required.", variant: "destructive" });
      return;
    }
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      activeAction: 'fetch',
      results: null,
      repoFiles: null,
      repoInfo: null,
    }));
    
    try {
      const repoInfo = parseGitHubUrl(repoUrl);
      const headers = createGitHubHeaders(githubToken);

      toast({ title: "Fetching Files...", description: "Getting repository file list." });
      
      const repoData = await fetchRepositoryInfo(repoInfo.owner, repoInfo.repo, headers);
      const defaultBranch = repoData.default_branch;

      const treeData = await fetchRepositoryTree(repoInfo.owner, repoInfo.repo, defaultBranch, headers);
      
      if(treeData.truncated) {
        toast({ title: "Warning", description: "Repository is too large, some files may not be scanned.", variant: "default" });
      }

      const filesToScan = filterScannableFiles(treeData);
      const totalSize = calculateTotalSize(filesToScan);
      const totalFormattedSize = formatFileSize(totalSize);
      
      setState(prev => ({ ...prev, repoFiles: filesToScan, repoInfo }));

      if (filesToScan.length > 0) {
        toast({ title: "Files Loaded", description: `Found ${filesToScan.length} scannable files (${totalFormattedSize} total). Ready to scan.` });
      } else {
        toast({ title: "No Files Found", description: "No scannable files were found in this repository." });
      }

    } catch (error) {
      console.error("Fetch failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      setState(prev => ({ ...prev, repoFiles: null }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false, activeAction: null }));
    }
  };

  return { fetchFiles };
};
