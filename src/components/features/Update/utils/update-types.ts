export interface GitHubRelease {
  url: string;
  html_url: string;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: {
    name: string;
    browser_download_url: string;
    content_type: string;
    size: number;
  }[];
}

export interface UpdateStatus {
  loading: boolean;
  available: boolean;
  error: string | null;
  latestVersion: string | null;
  currentVersion: string;
  releaseUrl: string | null;
  releaseNotes: string | null;
  downloadUrl: string | null;
}
