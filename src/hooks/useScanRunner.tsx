
import { supabase } from "@/integrations/supabase/client";
import { Vulnerability, RepoInfo } from "@/types/vulnerability";
import { createGitHubHeaders, fetchFileContent } from "@/utils/githubApi";
import { sleep } from "@/utils/fileProcessing";

export const useScanRunner = () => {
  const runScan = async (
    repoUrl: string,
    repoInfo: RepoInfo,
    repoFiles: any[],
    githubToken: string,
    user: any,
    setState: (updater: (prev: any) => any) => void,
    toast: any
  ) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      activeAction: 'scan',
      isScanning: true,
      results: null,
    }));
    
    try {
      const { owner, repo } = repoInfo;

      // Record the scan in the database
      const { data: scanData, error: scanError } = await supabase
        .from('scans')
        .insert({
          user_id: user.id,
          repository_url: repoUrl,
          status: 'running',
          credits_used: 1
        })
        .select()
        .single();

      if (scanError) {
        console.error("Error recording scan:", scanError);
      }

      const headers = createGitHubHeaders(githubToken);
      let vulnerabilityIdCounter = 1;
      let allVulnerabilities: Vulnerability[] = [];

      for (const [index, file] of repoFiles.entries()) {
        toast({ title: "Scanning", description: `Analyzing ${file.path} (${index + 1}/${repoFiles.length})` });
        
        await sleep(200);

        try {
          const fileData = await fetchFileContent(owner, repo, file.path, headers);
          
          if (fileData.size > 100000) { 
            console.warn(`Skipping large file: ${file.path}`);
            continue;
          }

          if (!fileData.content) {
            console.warn(`Skipping empty file: ${file.path}`);
            continue;
          }

          const fileContent = atob(fileData.content);

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

      // Update scan status in the database
      if (scanData) {
        await supabase
          .from('scans')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', scanData.id);
      }

      setState(prev => ({ ...prev, results: allVulnerabilities }));

      if (allVulnerabilities.length > 0) {
        toast({ title: "Scan Complete", description: `Found ${allVulnerabilities.length} potential vulnerabilities across ${repoFiles.length} files. 1 credit used.` });
      } else {
        toast({ title: "Scan Complete", description: `Scanned ${repoFiles.length} files. No vulnerabilities found. 1 credit used.` });
      }
    } catch (error) {
      console.error("Scan failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      
      // Update scan status to failed if we have a scan record
      try {
        await supabase
          .from('scans')
          .update({ status: 'failed' })
          .eq('user_id', user.id)
          .eq('repository_url', repoUrl)
          .eq('status', 'running');
      } catch (updateError) {
        console.error("Error updating scan status:", updateError);
      }
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        activeAction: null,
        isScanning: false,
      }));
    }
  };

  return { runScan };
};
