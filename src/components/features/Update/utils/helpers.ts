/**
 * Compare two semantic version strings
 * @returns -1 if versionA < versionB, 0 if equal, 1 if versionA > versionB
 */
export function compareVersions(versionA: string, versionB: string): number {
  // Remove 'v' prefix if exists
  const cleanA = versionA.startsWith('v') ? versionA.substring(1) : versionA;
  const cleanB = versionB.startsWith('v') ? versionB.substring(1) : versionB;
  
  const partsA = cleanA.split('.').map(part => parseInt(part, 10));
  const partsB = cleanB.split('.').map(part => parseInt(part, 10));
  
  // Compare each part of the version
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const a = partsA[i] || 0;
    const b = partsB[i] || 0;
    
    if (a > b) return 1;
    if (a < b) return -1;
  }
  
  return 0;
}

/**
 * Format version string with v prefix
 */
export function formatVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
}

/**
 * Extract platform-specific download URL from GitHub release
 */
export function getDownloadUrl(assets: any[], currentPlatform: string): string | null {
  if (!assets?.length) return null;
  
  let extension: string;
  let platformKeyword: string;
  
  // Determine platform-specific file extension and keywords
  if (currentPlatform === 'win32') {
    extension = '.exe';
    platformKeyword = 'windows';
  } else if (currentPlatform === 'darwin') {
    extension = '.dmg';
    platformKeyword = 'mac';
  } else if (currentPlatform === 'linux') {
    extension = '.AppImage';
    platformKeyword = 'linux';
  } else {
    return null;
  }
  
  // Find a matching asset
  const asset = assets.find(a => {
    const name = a.name.toLowerCase();
    return name.includes(platformKeyword) || name.endsWith(extension);
  });
  
  return asset?.browser_download_url || null;
}

/**
 * Extract markdown formatted release notes from GitHub release body
 */
export function formatReleaseNotes(body: string): string {
  // Remove any GitHub username mentions
  const cleaned = body.replace(/@[\w-]+/g, '');
  
  // Limit to a reasonable length if needed
  if (cleaned.length > 500) {
    return cleaned.substring(0, 500) + '...';
  }
  
  return cleaned;
}
