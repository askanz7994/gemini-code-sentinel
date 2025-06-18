
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Files, LoaderCircle, HardDrive } from "lucide-react";

type FilesListProps = {
  repoFiles: any[];
  onStartScan: (files: string[]) => void;
  isLoading: boolean;
  activeAction: 'fetch' | 'scan' | 'scanning' | null;
};

const FilesList = ({ repoFiles, onStartScan, isLoading, activeAction }: FilesListProps) => {
  if (!repoFiles) return null;

  const totalSize = repoFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleStartScan = () => {
    const filePaths = repoFiles.map(file => file.path);
    onStartScan(filePaths);
  };

  return (
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
              <div className="flex items-center justify-between mb-4">
                <p className="text-muted-foreground">
                  Found {repoFiles.length} files to scan. Click the button below to start the vulnerability check.
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">
                  <HardDrive className="h-4 w-4" />
                  <span className="font-medium">Total: {formatFileSize(totalSize)}</span>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-md border bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">File Path</TableHead>
                      <TableHead className="text-white text-right w-24">Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repoFiles.map((file) => (
                      <TableRow key={file.path}>
                        <TableCell className="font-mono text-sm">{file.path}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {file.formattedSize || formatFileSize(file.size || 0)}
                        </TableCell>
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
                {isLoading && (activeAction === 'scan' || activeAction === 'scanning') ? (
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
  );
};

export default FilesList;
