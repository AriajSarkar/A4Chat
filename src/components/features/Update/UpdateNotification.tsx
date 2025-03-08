import React from 'react';
import { ArrowUpCircle, ExternalLink, Download } from 'lucide-react';
import { UpdateStatus } from './utils/update-types';
import { formatVersion } from './utils/helpers';

interface UpdateNotificationProps {
  status: UpdateStatus;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ status }) => {
  if (status.loading || !status.available) {
    return null;
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    if (status.downloadUrl) {
      window.open(status.downloadUrl, '_blank');
    }
  };

  const handleViewRelease = (e: React.MouseEvent) => {
    e.preventDefault();
    if (status.releaseUrl) {
      window.open(status.releaseUrl, '_blank');
    }
  };

  return (
    <div className="bg-brand-50/60 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700/50 rounded-lg p-4 mb-6 animate-once animate-fade-in animate-duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-brand-500 dark:text-brand-400 mt-0.5">
          <ArrowUpCircle size={20} className="animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-brand-800 dark:text-brand-200 mb-1.5">
            Update Available: {status.latestVersion && formatVersion(status.latestVersion)}
          </h4>
          
          {status.releaseNotes && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 max-h-32 overflow-y-auto">
              {status.releaseNotes}
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 mt-2">
            {status.downloadUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 
                         dark:bg-brand-600 dark:hover:bg-brand-500 text-white rounded-md text-sm font-medium"
              >
                <Download size={16} />
                Download Update
              </button>
            )}
            
            {status.releaseUrl && (
              <button
                onClick={handleViewRelease}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 
                         dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 
                         rounded-md text-sm font-medium"
              >
                <ExternalLink size={16} />
                View Release
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
