import React from 'react';
import { TranslationStatus, ProjectRole } from '../../types';

interface StatusBadgeProps {
  status: TranslationStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'Approved':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 ${className}`}
        >
          Approved
        </span>
      );
    case 'NeedsReview':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
        >
          Needs Review
        </span>
      );
    case 'Draft':
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 ${className}`}
        >
          Draft
        </span>
      );
  }
};

interface RoleBadgeProps {
  role: ProjectRole | string;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '' }) => {
  switch (role) {
    case 'Admin':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 ${className}`}
        >
          Admin
        </span>
      );
    case 'Translator':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
        >
          Translator
        </span>
      );
    case 'Viewer':
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 ${className}`}
        >
          Viewer
        </span>
      );
  }
};
