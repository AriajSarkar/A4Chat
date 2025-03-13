import React from 'react';
import { UpdateChecker } from '../../Update/UpdateChecker';

const UpdatesTab: React.FC = () => {
  // Use type assertion to fix the TypeScript error
  const appVersion = (window as any).appInfo?.version || '1.0.0';

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-brand-900 dark:text-brand-100">
        Software Updates
      </h3>
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <p className="mb-4">Current version: <span className="font-semibold">{appVersion}</span></p>
        <UpdateChecker />
      </div>
    </div>
  );
};

export default UpdatesTab;
