'use client';

import { useState, useEffect } from 'react';
import { FileCheck, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';

export interface RecentSubmission {
  id: string;
  submission_id: string;
  form_id: string;
  form_title: string;
  student_name: string;
  student_email: string;
  submitted_at: string;
  timestamp: string;
}

export default function RecentSubmissionsSection() {
  const [submissions, setSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentSubmissions();
  }, []);

  const fetchRecentSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard/recent-submissions?limit=10');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent submissions');
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error('Error fetching recent submissions:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileCheck className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-medium text-gray-900">Recent Submissions</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileCheck className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-medium text-gray-900">Recent Submissions</h2>
        </div>
        <div className="text-sm text-red-600">
          Error loading recent submissions: {error}
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileCheck className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-medium text-gray-900">Recent Submissions</h2>
        </div>
        <div className="text-center py-8">
          <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No recent submissions</h3>
          <p className="mt-1 text-sm text-gray-500">
            No form submissions have been made recently.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-2 mb-4">
        <FileCheck className="h-5 w-5 text-green-500" />
        <h2 className="text-lg font-medium text-gray-900">Recent Submissions</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="group flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                <User className="h-4 w-4 text-green-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {submission.form_title}
                  </p>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-gray-500 truncate">
                    by {submission.student_name}
                  </p>
                  <span className="text-xs text-gray-400">•</span>
                  <p className="text-xs text-gray-500">
                    {formatDate(submission.timestamp)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <Link
                href={`/admin/forms/${submission.form_id}/submissions`}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-gray-400 hover:text-green-600 focus:outline-none"
                title="View Submissions"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
