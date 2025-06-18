
import React from "react";
import VulnCheckHeader from "@/components/VulnCheck/VulnCheckHeader";
import RepositoryForm from "@/components/VulnCheck/RepositoryForm";
import FilesList from "@/components/VulnCheck/FilesList";
import ScanProgress from "@/components/VulnCheck/ScanProgress";
import VulnerabilityResults from "@/components/VulnCheck/VulnerabilityResults";
import AuthButton from "@/components/AuthButton";
import { useVulnerabilityScanner } from "@/hooks/useVulnerabilityScanner";

const Index = () => {
  const {
    state,
    handleFetchFiles,
    handleStartScan,
    handleViewCode,
    setRepoUrl,
    setGithubToken,
  } = useVulnerabilityScanner();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <div className="absolute top-0 left-0 w-72 h-72 bg-accent/20 rounded-full filter blur-3xl animate-blob" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full filter blur-3xl animate-blob" />
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-blue-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000" />
      
      {/* Auth Button in top right */}
      <div className="absolute top-4 right-4 z-20">
        <AuthButton />
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8">
        <VulnCheckHeader />

        <main className="w-full max-w-2xl mx-auto">
          <RepositoryForm
            repoUrl={state.repoUrl}
            setRepoUrl={setRepoUrl}
            githubToken={state.githubToken}
            setGithubToken={setGithubToken}
            onSubmit={handleFetchFiles}
            isLoading={state.isLoading}
            activeAction={state.activeAction}
          />

          {state.repoFiles && !state.isLoading && (
            <FilesList
              repoFiles={state.repoFiles}
              onStartScan={handleStartScan}
              isLoading={state.isLoading}
              activeAction={state.activeAction}
            />
          )}

          <ScanProgress isScanning={state.isScanning} />

          {state.results && (
            <VulnerabilityResults
              results={state.results}
              isScanning={state.isScanning}
              fileContents={state.fileContents}
              loadingFileContentForVulnId={state.loadingFileContentForVulnId}
              onViewCode={handleViewCode}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
