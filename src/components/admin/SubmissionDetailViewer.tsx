'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, User, Calendar, FileText, Shield, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import PDFViewer from '@/components/pdf/PDFViewer';
import { supabase } from '@/lib/supabase';

type Submission = {
  id: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  generated_pdf_url: string | null;
  field_values: Array<{
    id: string;
    field_id: string;
    value: string | null;
    signature_url: string | null;
    verified: boolean | null;
  }>;
  users: {
    first_name: string;
    last_name: string;
    email: string;
    student_id: string;
    college_department: string | null;
    course: string | null;
    year_section: string | null;
    parent_id_picture_url: string | null;
  };
};

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

interface SubmissionDetailViewerProps {
  formId: string;
  submissionId: string;
  backLink: string;
  backLabel: string;
}

export default function SubmissionDetailViewer({ 
  formId, 
  submissionId,
  backLink,
  backLabel
}: SubmissionDetailViewerProps) {
  const [form, setForm] = useState<Form | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showReverifyDialog, setShowReverifyDialog] = useState(false);
  const [showVerifiedRejectDialog, setShowVerifiedRejectDialog] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRejectFlow, setIsRejectFlow] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [verifiedRejectReason, setVerifiedRejectReason] = useState('');
  const [verifiedRejectError, setVerifiedRejectError] = useState<string | null>(null);
  const router = useRouter();

  // Construct parent ID picture URL
  const parentIdPictureUrl = useMemo(() => {
    if (!submission?.users?.parent_id_picture_url) return null;
    
    const picturePath = submission.users.parent_id_picture_url;
    
    // If it's already a full URL, return it
    if (picturePath.startsWith('http')) {
      return picturePath;
    }
    
    // Get public URL using Supabase client
    const { data } = supabase.storage
      .from('parent-id-pictures')
      .getPublicUrl(picturePath);
    
    return data.publicUrl;
  }, [submission?.users?.parent_id_picture_url]);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchForm(formId),
        fetchSubmission(formId, submissionId)
      ]);
    };
    fetchData();
  }, [formId, submissionId]);

  const fetchForm = async (formIdToFetch: string) => {
    try {
      const response = await fetch(`/api/admin/forms/${formIdToFetch}`);
      if (!response.ok) {
        throw new Error('Failed to fetch form details');
      }
      const data = await response.json();
      setForm(data.form);
    } catch (error: unknown) {
      setError((error instanceof Error ? error.message : 'An error occurred while fetching form details'));
    }
  };

  const fetchSubmission = async (formIdToFetch: string, submissionIdToFetch: string) => {
    try {
      const response = await fetch(`/api/admin/forms/${formIdToFetch}/submissions/${submissionIdToFetch}`);
      if (!response.ok) {
        throw new Error('Failed to fetch submission details');
      }
      const data = await response.json();
      setSubmission(data.submission);
      
      // Set PDF URL for viewing
      if (data.submission?.generated_pdf_url) {
        // Use the proxy endpoint to avoid CORS issues
        setPdfUrl(`/api/admin/forms/${formIdToFetch}/submissions/${submissionIdToFetch}/pdf-proxy`);
      }
    } catch (error: unknown) {
      setError((error instanceof Error ? error.message : 'An error occurred while fetching submission details'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSubmission = async () => {
    if (!form || !submission) return;
    
    try {
      const response = await fetch(`/api/admin/forms/${form.id}/submissions/${submission.id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download submission');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission-${submission.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: unknown) {
      setError((error instanceof Error ? error.message : 'Failed to download submission'));
    }
  };

  const closeVerifyDialog = () => {
    setShowVerifyDialog(false);
    setIsRejectFlow(false);
    setRejectionReason('');
    setRejectError(null);
  };

  const handleSubmissionDecision = async (
    decision: 'verify' | 'reject',
    options?: { 
      onSuccess?: () => void;
      overrideReason?: string;
      skipValidation?: boolean;
      suppressDialogClose?: boolean;
    }
  ) => {
    if (!form || !submission) return;
    
    if (decision === 'reject') {
      const reason = (options?.overrideReason ?? rejectionReason).trim();
      if (!options?.skipValidation && reason.length < 5) {
        setRejectError('Please provide at least 5 characters explaining the rejection.');
        return;
      }
      if (!options?.skipValidation) {
        setRejectError(null);
      }
      setIsRejecting(true);
    } else {
    setIsVerifying(true);
    }
    
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/forms/${form.id}/submissions/${submission.id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          decision === 'reject'
            ? { action: 'reject', reason: (options?.overrideReason ?? rejectionReason).trim() }
            : { action: 'verify' }
        ),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${decision === 'reject' ? 'reject' : 'verify'} submission`);
      }
      
      await response.json();
      
      setSubmission((prev) => {
        if (!prev) return prev;
        if (decision === 'reject') {
          return { ...prev, status: 'rejected', rejection_reason: (options?.overrideReason ?? rejectionReason).trim() };
        }
        return { ...prev, status: 'verified', rejection_reason: null };
      });
      if (options?.onSuccess) {
        options.onSuccess();
      }
      if (!options?.suppressDialogClose) {
        closeVerifyDialog();
      }
      
      await fetchSubmission(formId, submissionId);
      
    } catch (error: unknown) {
      setError((error instanceof Error ? error.message : `Failed to ${decision === 'reject' ? 'reject' : 'verify'} submission`));
    } finally {
      setIsVerifying(false);
      setIsRejecting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'verified') {
      return <Shield className="h-4 w-4 mr-1" />;
    }
    if (status === 'rejected') {
      return <XCircle className="h-4 w-4 mr-1" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Loading submission...</span>
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

  if (!form || !submission) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-medium text-gray-900">Submission not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The requested submission could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.push(backLink)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {backLabel}
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {form.title} - Submission Details
            </h1>
            {form.description && (
              <p className="mt-1 text-sm text-gray-600">{form.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {(submission.status === 'completed' || submission.status === 'submitted') && (
              <button
                onClick={() => {
                  setIsRejectFlow(false);
                  setRejectionReason('');
                  setRejectError(null);
                  setShowVerifyDialog(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </button>
            )}
            {submission.status === 'rejected' && (
              <button
                onClick={() => setShowReverifyDialog(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Reverify
              </button>
            )}
            {submission.status === 'verified' && (
              <button
                onClick={() => {
                  setVerifiedRejectReason('');
                  setVerifiedRejectError(null);
                  setShowVerifiedRejectDialog(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reverify (Reject)
              </button>
            )}
            <button
              onClick={handleDownloadSubmission}
              disabled={!submission.generated_pdf_url}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Submission Info */}
        <div className="lg:col-span-1 flex-shrink-0">
          <div className="bg-white shadow rounded-lg p-6 h-fit">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {submission.users.first_name} {submission.users.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{submission.users.email}</p>
                  <p className="text-xs text-gray-400 mt-1">ID: {submission.users.student_id}</p>
                </div>
              </div>
              
              {submission.users.college_department && (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">College/Department</p>
                  <p className="text-gray-600">{submission.users.college_department}</p>
                </div>
              )}
              
              {submission.users.course && (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Course</p>
                  <p className="text-gray-600">{submission.users.course}</p>
                </div>
              )}
              
              {submission.users.year_section && (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Section</p>
                  <p className="text-gray-600">{submission.users.year_section}</p>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Submitted</p>
                  <p className="text-sm text-gray-500">
                    {submission.submitted_at 
                      ? new Date(submission.submitted_at).toLocaleDateString() + ' at ' + new Date(submission.submitted_at).toLocaleTimeString()
                      : submission.created_at 
                      ? new Date(submission.created_at).toLocaleDateString() + ' at ' + new Date(submission.created_at).toLocaleTimeString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <span className={`inline-flex items-center rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(submission.status)}`}>
                    {getStatusIcon(submission.status)}
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              {submission.status === 'rejected' && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">Rejection Reason</p>
                  <p className="mt-1 text-sm text-red-700 whitespace-pre-line">
                    {submission.rejection_reason || 'No reason provided.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Parent ID Picture Section */}
          {submission.users.parent_id_picture_url && (
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ImageIcon className="h-5 w-5 mr-2 text-gray-400" />
                Parent ID Picture
              </h3>
              
              <div className="space-y-4">
                <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={parentIdPictureUrl || ''}
                    alt="Parent ID with Signature"
                    className="w-full h-auto object-contain max-h-96 mx-auto"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'p-4 text-center text-gray-500';
                        errorDiv.textContent = 'Failed to load parent ID picture';
                        target.parentElement.appendChild(errorDiv);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Parent ID picture with signature uploaded during registration
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PDF Viewer */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="bg-white shadow rounded-lg flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Submission Document</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfUrl ? (
                <PDFViewer 
                  url={pdfUrl} 
                  className="h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No PDF available for this submission.</p>
                    <p className="text-sm text-gray-400 mt-2">The PDF may still be generating or the submission is incomplete.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verify Confirmation Dialog */}
      {showVerifyDialog && (
        <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Background overlay */}
          <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={closeVerifyDialog}></div>
          
          <div className="flex items-center justify-center min-h-full p-4 text-center sm:p-0">
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {!isRejectFlow ? (
                <>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Verify or Reject Submission
                    </h3>
                        <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-500">
                            Choose whether to verify this submission or reject it with a reason. These actions notify students of the outcome.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                      onClick={() => handleSubmissionDecision('verify')}
                      disabled={isVerifying || isRejecting}
                      className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm ${
                        (isVerifying || isRejecting) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  )}
                </button>
                <button
                  type="button"
                      onClick={() => setIsRejectFlow(true)}
                      disabled={isVerifying || isRejecting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={closeVerifyDialog}
                      disabled={isVerifying || isRejecting}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Provide Rejection Reason
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 mb-3">
                            Explain why this submission is being rejected. The student will see this reason in their portal.
                          </p>
                          <textarea
                            rows={4}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full rounded-md border border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm p-3"
                            placeholder="e.g., Missing guardian signature on page 2..."
                            disabled={isRejecting}
                          />
                          {rejectError && (
                            <p className="mt-2 text-sm text-red-600">{rejectError}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                    <button
                      type="button"
                      onClick={() => handleSubmissionDecision('reject')}
                      disabled={isRejecting}
                      className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm ${
                        isRejecting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isRejecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Confirm Reject
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRejectFlow(false)}
                      disabled={isRejecting}
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={closeVerifyDialog}
                      disabled={isRejecting}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showReverifyDialog && (
        <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="reverify-modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={() => setShowReverifyDialog(false)}></div>
          <div className="flex items-center justify-center min-h-full p-4 text-center sm:p-0">
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="reverify-modal-title">
                      Reverify Submission
                    </h3>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-500">
                        Confirming will mark this submission as verified and remove the rejection reason. Continue?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleSubmissionDecision('verify', {
                      onSuccess: () => setShowReverifyDialog(false)
                    })
                  }
                  disabled={isVerifying || isRejecting}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm ${
                    isVerifying || isRejecting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReverifyDialog(false)}
                  disabled={isVerifying || isRejecting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVerifiedRejectDialog && (
        <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="verified-reject-modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={() => setShowVerifiedRejectDialog(false)}></div>
          <div className="flex items-center justify-center min-h-full p-4 text-center sm:p-0">
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="verified-reject-modal-title">
                      Reverify Submission (Reject)
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-3 p-3 bg-gray-50 rounded-md">
                        Provide a reason for rejecting this verified submission. The student will see this note.
                      </p>
                      <textarea
                        rows={4}
                        value={verifiedRejectReason}
                        onChange={(e) => setVerifiedRejectReason(e.target.value)}
                        className="w-full rounded-md border border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm p-3"
                        placeholder="Explain why the submission is being rejected..."
                        disabled={isRejecting}
                      />
                      {verifiedRejectError && (
                        <p className="mt-2 text-sm text-red-600">{verifiedRejectError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = verifiedRejectReason.trim();
                    if (trimmed.length < 5) {
                      setVerifiedRejectError('Please provide at least 5 characters explaining the rejection.');
                      return;
                    }
                    setVerifiedRejectError(null);
                    handleSubmissionDecision('reject', {
                      overrideReason: trimmed,
                      skipValidation: true,
                      onSuccess: () => {
                        setShowVerifiedRejectDialog(false);
                        setVerifiedRejectReason('');
                        setVerifiedRejectError(null);
                      }
                    });
                  }}
                  disabled={isRejecting}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm ${
                    isRejecting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isRejecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Confirm Reject
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVerifiedRejectDialog(false)}
                  disabled={isRejecting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

