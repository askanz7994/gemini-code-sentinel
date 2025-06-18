
export const parseGitHubUrl = (url: string) => {
  const githubRepoUrlPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-._]+)\/([a-zA-Z0-9-._]+)(?:\.git)?\/?$/;
  const match = url.match(githubRepoUrlPattern);

  if (!match) {
    throw new Error("Invalid GitHub repository URL format. Please use 'https://github.com/owner/repo'.");
  }

  let [, owner, repo] = match;
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }
  
  return { owner, repo };
};

export const createGitHubHeaders = (token: string): HeadersInit => ({
  'Authorization': `Bearer ${token}`
});

export const fetchRepositoryInfo = async (owner: string, repo: string, headers: HeadersInit) => {
  const repoInfoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  
  if (!repoInfoResponse.ok) {
    if (repoInfoResponse.status === 404) {
      throw new Error("Repository not found. Check the URL and ensure your token has access to this repository.");
    }
    if (repoInfoResponse.status === 401) {
      throw new Error("Authentication failed. Make sure your GitHub Personal Access Token is correct and has 'repo' scope.");
    }
    if (repoInfoResponse.status === 403) {
      const errorData = await repoInfoResponse.json().catch(() => ({ message: "Rate limit likely exceeded or insufficient permissions."}));
      console.error("GitHub API Error:", errorData);
      throw new Error(`GitHub API access forbidden. ${errorData.message}`);
    }
    throw new Error(`Failed to fetch repository info: ${repoInfoResponse.statusText} (Status: ${repoInfoResponse.status})`);
  }
  
  return await repoInfoResponse.json();
};

export const fetchRepositoryTree = async (owner: string, repo: string, defaultBranch: string, headers: HeadersInit) => {
  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
  
  if (!treeResponse.ok) {
    if (treeResponse.status === 404) {
      throw new Error("Could not find the repository's file tree. The default branch may not exist or is empty.");
    }
    if (treeResponse.status === 401) {
      throw new Error("Authentication failed. Make sure your GitHub Personal Access Token is correct and has 'repo' scope.");
    }
    if (treeResponse.status === 403) {
      const errorData = await treeResponse.json().catch(() => ({ message: "Rate limit likely exceeded or insufficient permissions."}));
      console.error("GitHub API Error:", errorData);
      throw new Error(`GitHub API access forbidden while fetching file tree. ${errorData.message}`);
    }
    throw new Error(`Failed to fetch repository file tree: ${treeResponse.statusText} (Status: ${treeResponse.status})`);
  }
  
  return await treeResponse.json();
};

export const fetchFileContent = async (owner: string, repo: string, filePath: string, headers: HeadersInit) => {
  const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const response = await fetch(fileUrl, { headers });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication failed while fetching a file. Make sure your GitHub token is correct and has 'repo' scope. Scan aborted.");
    }
    throw new Error(`Failed to fetch file content for ${filePath}. Status: ${response.status}`);
  }

  return await response.json();
};
