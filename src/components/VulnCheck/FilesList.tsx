
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Files, LoaderCircle } from "lucide-react";

type FilesListProps = {
  repoFiles: any[];
  onStartScan: () => void;
  isLoading: boolean;
  activeAction: 'fetch' | 'scan' | null;
};

const FilesList = ({ repoFiles, onStartScan, isLoading, activeAction }: FilesListProps) => {
  if (!repoFiles) return null;

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
              <p className="text-muted-foreground mb-4">
                Found {repoFiles.length} files to scan. Click the button below to start the vulnerability check.
              </p>
              <div className="max-h-60 overflow-y-auto rounded-md border bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">File Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repoFiles.map((file) => (
                      <TableRow key={file.path}>
                        <TableCell className="font-mono text-sm">{file.path}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button 
                onClick={onStartScan}
                className="w-full mt-6 h-12 text-lg font-bold"
                disabled={isLoading}
              >
                {isLoading && activeAction === 'scan' ? (
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
