'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle, Users } from 'lucide-react';
import Link from 'next/link';

export interface RecentForm {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  created_by_name: string;
  total_verified: number;
  total_submitted: number;
  total_in_progress: number;
  total_no_submission: number;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'published':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Published
        </span>
      );
    case 'draft':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="w-3 h-3 mr-1" />
          Draft
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Archived
        </span>
      );
    case 'inactive':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      );
  }
};

export default function RecentFormsSection() {
  const [forms, setForms] = useState<RecentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentForms();
  }, []);

  const fetchRecentForms = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard/recent-forms?limit=10');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent forms');
      }

      const data = await response.json();
      setForms(data.forms || []);
    } catch (err) {
      console.error('Error fetching recent forms:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-medium text-gray-900">Recent Forms</h2>
        </div>
        <div className="animate-pulse">
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="h-8 bg-gray-200 rounded"></th>
                  <th className="h-8 bg-gray-200 rounded ml-2"></th>
                  <th className="h-8 bg-gray-200 rounded ml-2"></th>
                  <th className="h-8 bg-gray-200 rounded ml-2"></th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="h-6 bg-gray-200 rounded"></td>
                    <td className="h-6 bg-gray-200 rounded"></td>
                    <td className="h-6 bg-gray-200 rounded"></td>
                    <td className="h-6 bg-gray-200 rounded"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-medium text-gray-900">Recent Forms</h2>
        </div>
        <div className="text-sm text-red-600">
          Error loading recent forms: {error}
        </div>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-medium text-gray-900">Recent Forms</h2>
        </div>
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No forms created</h3>
          <p className="mt-1 text-sm text-gray-500">
            No forms have been created yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-medium text-gray-900">Recent Forms</h2>
        </div>
        <Link
          href="/admin/forms"
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          View All Forms
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Form
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verified
              </th>
              <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </th>
              <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                In Progress
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {forms.map((form) => (
              <tr key={form.id} className="hover:bg-gray-50">
                <td className="py-3 px-2">
                  <div className="flex flex-col">
                    <Link
                      href={`/admin/forms/${form.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate max-w-xs"
                      title={form.title}
                    >
                      {form.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1">
                      by {form.created_by_name}
                    </p>
                  </div>
                </td>
                <td className="py-3 px-2">
                  {getStatusBadge(form.status)}
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {form.total_verified}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {form.total_submitted}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {form.total_in_progress}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span className="text-sm text-gray-500">
                    {formatDate(form.created_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
