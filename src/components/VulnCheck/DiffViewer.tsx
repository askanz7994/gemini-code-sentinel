import React from 'react';

type DiffViewerProps = {
  originalContent: string;
  patchedContent: string;
  fileName: string;
};

const DiffViewer = ({ originalContent, patchedContent, fileName }: DiffViewerProps) => {
  const originalLines = originalContent.split('\n');
  const patchedLines = patchedContent.split('\n');
  
  // Simple diff algorithm - this creates a basic line-by-line comparison
  const createDiff = () => {
    const maxLines = Math.max(originalLines.length, patchedLines.length);
    const diffLines = [];
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const patchedLine = patchedLines[i] || '';
      
      if (originalLine === patchedLine) {
        // Unchanged line
        diffLines.push({
          type: 'unchanged',
          originalLineNum: i + 1,
          patchedLineNum: i + 1,
          content: originalLine
        });
      } else if (!originalLine) {
        // Added line
        diffLines.push({
          type: 'added',
          originalLineNum: null,
          patchedLineNum: i + 1,
          content: patchedLine
        });
      } else if (!patchedLine) {
        // Removed line
        diffLines.push({
          type: 'removed',
          originalLineNum: i + 1,
          patchedLineNum: null,
          content: originalLine
        });
      } else {
        // Modified line - show both
        diffLines.push({
          type: 'removed',
          originalLineNum: i + 1,
          patchedLineNum: null,
          content: originalLine
        });
        diffLines.push({
          type: 'added',
          originalLineNum: null,
          patchedLineNum: i + 1,
          content: patchedLine
        });
      }
    }
    
    return diffLines;
  };

  const diffLines = createDiff();

  return (
    <div className="bg-background/50 rounded-md overflow-hidden border">
      <div className="bg-muted/50 px-3 py-2 border-b">
        <span className="font-mono text-sm font-medium">{fileName}</span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <pre className="font-mono text-xs">
          <code>
            {diffLines.map((line, index) => (
              <div
                key={index}
                className={`flex items-start -mx-2 px-2 ${
                  line.type === 'added' 
                    ? 'bg-green-500/20 text-green-200' 
                    : line.type === 'removed' 
                    ? 'bg-red-500/20 text-red-200' 
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-right pr-2 text-muted-foreground select-none w-8">
                  {line.originalLineNum || ''}
                </span>
                <span className="text-right pr-4 text-muted-foreground select-none w-8">
                  {line.patchedLineNum || ''}
                </span>
                <span className={`pr-2 select-none w-4 ${
                  line.type === 'added' ? 'text-green-400' : 
                  line.type === 'removed' ? 'text-red-400' : 
                  'text-muted-foreground'
                }`}>
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span className="flex-1 whitespace-pre-wrap">{line.content || ' '}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default DiffViewer;
