
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getIgnoredPaths = () => [
  'node_modules/', 'dist/', 'build/', '.git/', 'vendor/', '.cache/', 'tmp/', 'temp/', 
  '__pycache__/', '.pytest_cache/', '.vscode/', '.idea/', 'coverage/', 'test-results/', 
  '.next/', '.nuxt/', '.expo/', '.history/', '.venv/', '.env/', '.mypy_cache/', 
  '.terraform/', '.serverless/', '*.zip', '*.tar.gz', '*.rar', '*.7z', '*.png', 
  '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.ico', '*.pdf', '*.mp4'
];

export const filterScannableFiles = (treeData: any) => {
  const ignoredPaths = getIgnoredPaths();
  
  return treeData.tree.filter((file: any) => 
    file.type === 'blob' &&
    !ignoredPaths.some(ignoredPath => file.path.startsWith(ignoredPath))
  ).map((file: any) => ({
    ...file,
    formattedSize: formatFileSize(file.size || 0)
  }));
};

export const calculateTotalSize = (files: any[]) => {
  return files.reduce((sum: number, file: any) => sum + (file.size || 0), 0);
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
