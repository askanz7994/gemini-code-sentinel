
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import VulnCheckHeader from "@/components/VulnCheck/VulnCheckHeader";
import RepositoryForm from "@/components/VulnCheck/RepositoryForm";
import FilesList from "@/components/VulnCheck/FilesList";
import ScanProgress from "@/components/VulnCheck/ScanProgress";
import VulnerabilityResults from "@/components/VulnCheck/VulnerabilityResults";
import UserProfile from "@/components/Auth/UserProfile";
import { useVulnerabilityScanner } from "@/hooks/useVulnerabilityScanner";
import { useUserScans } from "@/hooks/useUserScans";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

const IndexContent = () => {
  const { user } = useAuth();
  const { remainingScans } = useUserScans();
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
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8">
        {/* Header with user profile */}
        <div className="w-full max-w-4xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <VulnCheckHeader />
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Remaining Scans</p>
                <p className="text-2xl font-bold text-primary">{remainingScans}</p>
              </div>
              <UserProfile />
            </div>
          </div>
        </div>

        {/* Scan credits warning */}
        {remainingScans === 0 && (
          <div className="w-full max-w-2xl mx-auto mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800 font-medium mb-2">
                You don't have any remaining scans
              </p>
              <p className="text-yellow-600 text-sm mb-3">
                Purchase scan credits to continue using VulnCheck
              </p>
              <Button className="bg-yellow-600 hover:bg-yellow-700">
                <CreditCard className="mr-2 h-4 w-4" />
                Buy 25 Scans for $20
              </Button>
            </div>
          </div>
        )}

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

const Index = () => {
  return (
    <ProtectedRoute>
      <IndexContent />
    </ProtectedRoute>
  );
};

export default Index;
