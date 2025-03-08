import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { compareVersions, formatReleaseNotes, getDownloadUrl } from './utils/helpers';
import { GitHubRelease, UpdateStatus } from './utils/update-types';
import { UpdateNotification } from './UpdateNotification';

// GitHub repository info
const GITHUB_REPO = "AriajSarkar/A4Chat";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 5,
  TIME_WINDOW: 60 * 60 * 1000, // 1 hour in milliseconds
  COOLDOWN: 10 * 1000 // 10 seconds cooldown between requests
};

export const UpdateChecker: React.FC = () => {
  // Use type assertion to fix the TypeScript error
  const currentVersion = (window as any).appInfo?.version;
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    loading: true,
    available: false,
    error: null,
    latestVersion: null,
    currentVersion,
    releaseUrl: null,
    releaseNotes: null,
    downloadUrl: null
  });
  
  const [checkingManually, setCheckingManually] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
  // Check and update rate limit state
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const rateData = JSON.parse(localStorage.getItem('updateCheckerRateLimit') || '{"requests":[], "lastCheck": 0}');
    
    // Filter out requests older than the time window
    const recentRequests = rateData.requests.filter((time: number) => now - time < RATE_LIMIT.TIME_WINDOW);
    
    // Check if cooldown period has passed since last request
    const isInCooldown = now - rateData.lastCheck < RATE_LIMIT.COOLDOWN;
    if (isInCooldown) {
      const remaining = Math.ceil((RATE_LIMIT.COOLDOWN - (now - rateData.lastCheck)) / 1000);
      setCooldownRemaining(remaining);
      return true;
    }
    
    // Check if maximum requests reached
    if (recentRequests.length >= RATE_LIMIT.MAX_REQUESTS) {
      const oldestRequest = Math.min(...recentRequests);
      const resetTime = oldestRequest + RATE_LIMIT.TIME_WINDOW;
      const minutesUntilReset = Math.ceil((resetTime - now) / (60 * 1000));
      
      setUpdateStatus(prev => ({
        ...prev,
        error: `Rate limit reached. Try again in ${minutesUntilReset} minute${minutesUntilReset === 1 ? '' : 's'}.`
      }));
      
      return true;
    }
    
    return false;
  };
  
  // Update the rate limit data
  const updateRateLimit = () => {
    const now = Date.now();
    const rateData = JSON.parse(localStorage.getItem('updateCheckerRateLimit') || '{"requests":[], "lastCheck": 0}');
    
    // Filter out requests older than the time window
    const recentRequests = rateData.requests.filter((time: number) => now - time < RATE_LIMIT.TIME_WINDOW);
    
    // Add current request time
    recentRequests.push(now);
    
    // Update local storage
    localStorage.setItem('updateCheckerRateLimit', JSON.stringify({
      requests: recentRequests,
      lastCheck: now
    }));
  };
  
  const checkForUpdates = async (manual = false) => {
    if (manual) {
      setCheckingManually(true);
      
      // Check rate limiting for manual requests
      const isLimited = checkRateLimit();
      if (isLimited) {
        setRateLimited(true);
        setCheckingManually(false);
        return;
      }
      
      // Update rate limit data
      updateRateLimit();
    }
    
    setUpdateStatus(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(GITHUB_API, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        cache: manual ? 'no-cache' : 'default'
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}: ${response.statusText}`);
      }
      
      const release = await response.json() as GitHubRelease;
      const latestVersion = release.tag_name.replace(/^v/, '');
      const isNewer = compareVersions(latestVersion, currentVersion) > 0;
      
      // Get platform-specific download if available
      const platform = window.navigator.platform.toLowerCase();
      let downloadUrl = null;
      
      // Determine platform
      let currentPlatform = '';
      if (platform.includes('win')) {
        currentPlatform = 'win32';
      } else if (platform.includes('mac')) {
        currentPlatform = 'darwin';
      } else if (platform.includes('linux')) {
        currentPlatform = 'linux';
      }
      
      if (release.assets && release.assets.length > 0) {
        downloadUrl = getDownloadUrl(release.assets, currentPlatform);
      }
      
      setUpdateStatus({
        loading: false,
        available: isNewer,
        error: null,
        latestVersion,
        currentVersion,
        releaseUrl: release.html_url,
        releaseNotes: formatReleaseNotes(release.body),
        downloadUrl
      });
    } catch (error) {
      console.error("Error checking for updates:", error);
      setUpdateStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
    
    if (manual) {
      setCheckingManually(false);
      setRateLimited(false);
    }
  };
  
  // Cooldown timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (rateLimited && cooldownRemaining > 0) {
      timer = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            setRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [rateLimited, cooldownRemaining]);
  
  // Check for updates on component mount
  useEffect(() => {
    checkForUpdates();
    // Schedule periodic checks (every 6 hours)
    const interval = setInterval(() => checkForUpdates(), 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="space-y-4">
      <UpdateNotification status={updateStatus} />
      
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {updateStatus.loading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader size={16} className="animate-spin" />
              <span>Checking for updates...</span>
            </div>
          ) : updateStatus.error ? (
            <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
              <AlertCircle size={16} />
              <span>Error checking for updates</span>
            </div>
          ) : updateStatus.available ? (
            <div className="text-brand-500 dark:text-brand-400">
              Update available: {updateStatus.latestVersion}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-500 dark:text-green-400">
              <CheckCircle2 size={16} />
              <span>A4Chat is up to date</span>
            </div>
          )}
        </div>
        
        <button
          onClick={() => checkForUpdates(true)}
          disabled={updateStatus.loading || checkingManually || rateLimited}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 
                   dark:bg-gray-800 dark:hover:bg-gray-700 
                   text-gray-700 dark:text-gray-200 rounded-md text-sm
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 ease-in-out"
        >
          {rateLimited ? (
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-gray-500 dark:text-gray-400" />
              <span>{cooldownRemaining}s</span>
            </div>
          ) : (
            'Check for Updates'
          )}
        </button>
      </div>
      
      {updateStatus.error && (
        <div className="text-xs text-red-500 dark:text-red-400">
          {updateStatus.error}
        </div>
      )}
    </div>
  );
};
