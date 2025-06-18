
import { Vulnerability, RepoInfo } from "@/types/vulnerability";
import { createGitHubHeaders, fetchFileContent } from "@/utils/githubApi";

export const useFileContentLoader = () => {
  const loadFileContent = async (
    vulnerability: Vulnerability,
    repoInfo: RepoInfo,
    githubToken: string,
    setState: (updater: (prev: any) => any) => void,
    toast: any
  ) => {
    setState(prev => ({ ...prev, loadingFileContentForVulnId: vulnerability.id }));
    
    try {
      const { owner, repo } = repoInfo;
      const headers = createGitHubHeaders(githubToken);
      
      const fileData = await fetchFileContent(owner, repo, vulnerability.file, headers);
      
      if (!fileData.content) {
        setState(prev => ({ 
          ...prev, 
          fileContents: { ...prev.fileContents, [vulnerability.file]: "// File content is not available or file is empty." }
        }));
      } else {
        const content = atob(fileData.content);
        setState(prev => ({ 
          ...prev, 
          fileContents: { ...prev.fileContents, [vulnerability.file]: content }
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      setState(prev => ({ 
        ...prev, 
        fileContents: { ...prev.fileContents, [vulnerability.file]: `// Error: ${errorMessage}` }
      }));
    } finally {
      setState(prev => ({ ...prev, loadingFileContentForVulnId: null }));
    }
  };

  return { loadFileContent };
};
