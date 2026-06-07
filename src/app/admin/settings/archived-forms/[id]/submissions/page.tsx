'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Download, FileText, Users, Calendar, CheckCircle, Shield } from 'lucide-react';

type Submission = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  users: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

export default function ArchivedFormSubmissionsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { id } = await params;
      await Promise.all([
        fetchForm(id),
        fetchSubmissions(id)
      ]);
    };
    fetchData();
  }, [params]);

  const fetchForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/admin/forms/${formId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch form details');
      }
      const data = await response.json();
      setForm(data.form);
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while fetching form details');
    }
  };

  const fetchSubmissions = async (formId: string) => {
    try {
      const response = await fetch(`/api/admin/forms/${formId}/submissions`);
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error: unknown) {
      setError((error instanceof Error ? error.message : 'An error occurred while fetching submissions'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submissionId: string) => {
    router.push(`/admin/settings/archived-forms/${form?.id}/submissions/${submissionId}`);
  };

  const handleDownloadSubmission = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/admin/forms/${form?.id}/submissions/${submissionId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download submission');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission-${submissionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: unknown) {
      setError((error instanceof Error ? error.message : 'Failed to download submission'));
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Submitted';
      case 'in_progress':
        return 'In Progress';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Loading submissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const verifiedSubmissions = submissions.filter(s => s.status === 'verified').length;
  const submittedSubmissions = submissions.filter(s => s.status === 'completed' || s.status === 'submitted').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => router.push('/admin/settings')}
            className="flex items-center text-gray-600 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Settings
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {form?.title}
                </h1>
                <span className={`inline-flex items-center mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(form?.status || '')}`}>
                  {form?.status?.charAt(0).toUpperCase()}{form?.status?.slice(1)}
                </span>
              </div>
            </div>
            {form?.description && (
              <p className="mt-3 text-sm text-gray-600 max-w-2xl">{form.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{submissions.length}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <Users className="h-6 w-6 text-gray-900" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{verifiedSubmissions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Submitted</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{submittedSubmissions}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              This archived form has no submissions yet. Submissions will appear here once students submit their forms.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {submissions.map((submission) => (
              <div key={submission.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {submission.users.first_name.charAt(0)}{submission.users.last_name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <p className="text-base font-semibold text-gray-900">
                            {submission.users.first_name} {submission.users.last_name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(submission.status)}`}>
                            {getStatusLabel(submission.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{submission.users.email}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Submitted {new Date(submission.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Updated {new Date(submission.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewSubmission(submission.id)}
                      className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors"
                      title="View Submission"
                    >
                      <Eye className="h-5 w-5 mr-1.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadSubmission(submission.id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="h-5 w-5 mr-1.5" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
