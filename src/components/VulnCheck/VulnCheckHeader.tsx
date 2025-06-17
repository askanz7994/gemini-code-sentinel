
import React from "react";

const VulnCheckHeader = () => {
  return (
    <header className="w-full max-w-5xl mx-auto mb-12 text-center">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
        VulnCheck AI
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Scan Your GitHub Repositories for Vulnerabilities with AI
      </p>
    </header>
  );
};

export default VulnCheckHeader;
