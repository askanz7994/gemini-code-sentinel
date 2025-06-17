
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LoaderCircle } from "lucide-react";

type ScanProgressProps = {
  isScanning: boolean;
};

const ScanProgress = ({ isScanning }: ScanProgressProps) => {
  if (!isScanning) return null;

  return (
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
  );
};

export default ScanProgress;
