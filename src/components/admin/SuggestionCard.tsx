'use client';

import { useState } from 'react';
import { X, AlertTriangle, Info, Clock, FileText, Archive } from 'lucide-react';
import Link from 'next/link';

export interface Suggestion {
  id: string;
  type: 'form_expiring' | 'completed_forms_review' | 'archive_old_forms' | 'draft_forms' | 'inactive_forms' | 'no_submission_forms' | 'inactive_status_forms';
  title: string;
  description: string;
  action_text: string;
  action_url?: string;
  entity_id?: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onIgnore: (suggestionId: string) => void;
}

const getIcon = (type: Suggestion['type']) => {
  switch (type) {
    case 'form_expiring':
      return Clock;
    case 'completed_forms_review':
      return Info;
    case 'archive_old_forms':
      return Archive;
    case 'draft_forms':
      return FileText;
    case 'inactive_forms':
    case 'no_submission_forms':
    case 'inactive_status_forms':
      return AlertTriangle;
    default:
      return Info;
  }
};

const getPriorityStyles = (priority: Suggestion['priority']) => {
  // All suggestion cards use yellow styling
  return {
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
    iconBg: 'bg-yellow-500',
    textColor: 'text-yellow-700'
  };
};

export default function SuggestionCard({ suggestion, onIgnore }: SuggestionCardProps) {
  const [isIgnoring, setIsIgnoring] = useState(false);
  const Icon = getIcon(suggestion.type);
  const styles = getPriorityStyles(suggestion.priority);

  const handleIgnore = async () => {
    setIsIgnoring(true);
    try {
      await onIgnore(suggestion.id);
    } finally {
      setIsIgnoring(false);
    }
  };

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 relative`}>
      {/* Ignore button */}
      <button
        onClick={handleIgnore}
        disabled={isIgnoring}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Ignore this suggestion"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`${styles.iconBg} rounded-md p-2 flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${styles.textColor}`}>
            {suggestion.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {suggestion.description}
          </p>

          {/* Action button */}
          {suggestion.action_url && (
            <div className="mt-3">
              <Link
                href={suggestion.action_url}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              >
                {suggestion.action_text}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
