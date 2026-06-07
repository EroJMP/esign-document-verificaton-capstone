'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, ArrowLeft, CheckCircle, AlertCircle, Shield, XCircle, Clock } from 'lucide-react';
import PDFViewer from '@/components/pdf/PDFViewer';

export default function SubmissionConfirmation({ params }: { params: Promise<{ id: string }> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  
  const resolvedParams = use(params);
  const submissionId = resolvedParams.id;
  
  useEffect(() => {
    async function fetchSubmissionDetails() {
      if (!submissionId) return;
      
      try {
        setLoading(true);
        
        // Fetch submission details via API route
        const response = await fetch(`/api/student/submissions/${submissionId}/details`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch submission details');
        }
        
        const submissionData = await response.json();
        
        setSubmission(submissionData);
        setForm(submissionData.form);
        
        // Check if we need to generate PDF
        if (submissionData.status === 'completed' && !submissionData.generated_pdf_url) {
          await generatePdf(submissionData.id, submissionData.form.id);
        } else if (submissionData.generated_pdf_url) {
          // Use the proxy endpoint to avoid CORS issues
          const proxyUrl = `/api/student/submissions/${submissionData.id}/pdf-proxy`;
          setGeneratedPdfUrl(proxyUrl);
        }
      } catch (err: any) {
        console.error('Error fetching submission details:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSubmissionDetails();
  }, [submissionId]);
  
  const generatePdf = async (submissionId: string, formId: string, isRetry = false) => {
    try {
      setGenerating(true);
      if (!isRetry) {
        setError(null); // Clear any previous errors
        setRetryCount(0);
      }
      
      console.log('Starting PDF generation for submission:', submissionId, 'form:', formId, 'retry:', isRetry);
      
      // Call the API to generate the PDF
      const response = await fetch(`/api/student/submissions/${submissionId}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formId }),
      });
      
      console.log('PDF generation response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to generate PDF';
        let errorDetails = null;
        try {
          const errorData = await response.json();
          console.error('PDF generation error details:', errorData);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || null;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Create a more detailed error message
        let detailedError = errorMessage;
        if (errorDetails) {
          detailedError += `\n\nDetails: ${JSON.stringify(errorDetails, null, 2)}`;
        }
        
        throw new Error(detailedError);
      }
      
      const data = await response.json();
      console.log('PDF generation successful:', data);
      
      if (data.pdfUrl) {
        // Use the proxy endpoint to avoid CORS issues
        const proxyUrl = `/api/student/submissions/${submissionId}/pdf-proxy`;
        setGeneratedPdfUrl(proxyUrl);
        setRetryCount(0); // Reset retry count on success
        
        // Note: PDF URL is already stored by the API route
      } else {
        throw new Error('No PDF URL returned from server');
      }
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      const errorMessage = `Failed to generate PDF: ${err.message}`;
      setError(errorMessage);
      
      // Auto-retry once if it's not already a retry
      if (!isRetry && retryCount < 1) {
        console.log('Auto-retrying PDF generation...');
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          generatePdf(submissionId, formId, true);
        }, 2000);
      }
    } finally {
      setGenerating(false);
    }
  };
  
  const handleDownload = () => {
    if (!generatedPdfUrl) return;
    
    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = generatedPdfUrl;
    link.download = `${form?.title || 'form'}-submission.pdf`;
    link.target = '_blank'; // Open in new tab as fallback
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
        <p className="text-sm text-gray-500">Loading submission details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-2">{error}</p>
            <div className="mt-4">
              <Link 
                href="/student" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                <ArrowLeft className="mr-2" /> Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const status = submission?.status;
  const statusConfig = (() => {
    switch (status) {
      case 'verified':
        return {
          headline: 'Submission Verified',
          description: 'Your submission has been reviewed and verified by the administrator.',
          icon: Shield,
          panelClasses: 'bg-blue-50 border-blue-400',
          badgeClasses: 'bg-blue-100 text-blue-800',
          badgeLabel: 'Verified',
          iconClasses: 'text-blue-500'
        };
      case 'rejected':
        return {
          headline: 'Submission Rejected',
          description: 'Please review the reason below and update your form before resubmitting.',
          icon: XCircle,
          panelClasses: 'bg-red-50 border-red-400',
          badgeClasses: 'bg-red-100 text-red-800',
          badgeLabel: 'Rejected',
          iconClasses: 'text-red-500'
        };
      case 'completed':
        return {
          headline: 'Submission Complete',
          description: 'Your form has been successfully submitted. You can view and download it below.',
          icon: CheckCircle,
          panelClasses: 'bg-green-50 border-green-400',
          badgeClasses: 'bg-green-100 text-green-800',
          badgeLabel: 'Submitted',
          iconClasses: 'text-green-500'
        };
      case 'in_progress':
      default:
        return {
          headline: 'Submission In Progress',
          description: 'Your submission is still being prepared. Complete all required steps to submit.',
          icon: Clock,
          panelClasses: 'bg-yellow-50 border-yellow-400',
          badgeClasses: 'bg-yellow-100 text-yellow-800',
          badgeLabel: 'In Progress',
          iconClasses: 'text-yellow-500'
        };
    }
  })();

  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{form?.title}</h1>
          <Link
            href="/student"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-1" /> Back to Dashboard
          </Link>
        </div>
      </div>
      
      {/* Confirmation Message */}
      <div className={`${statusConfig.panelClasses} border-l-4 p-4 mb-6 rounded-r-md`}>
        <div className="flex">
          <StatusIcon className={`h-6 w-6 ${statusConfig.iconClasses}`} />
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{statusConfig.headline}</h3>
            <p className="text-sm text-gray-700 mt-2">
              {statusConfig.description}
            </p>
          </div>
        </div>
      </div>

      {submission?.status === 'rejected' && (
        <div className="bg-white border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-base font-semibold text-red-800">Rejection Reason</h3>
          <p className="mt-2 text-sm text-red-700 whitespace-pre-line">
            {submission?.rejection_reason || 'No details were provided.'}
          </p>
          <p className="mt-2 text-xs text-red-500">
            You can go back to your dashboard and use the Resubmit option for this form after making the necessary corrections.
          </p>
        </div>
      )}
      
      {/* PDF Viewer */}
      <div className="mb-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Completed Form</h2>
            <button
              onClick={handleDownload}
              disabled={!generatedPdfUrl || generating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
            >
              <Download className="mr-2" /> Download PDF
            </button>
          </div>
          
          <div className="p-0">
            {generating ? (
              <div className="flex flex-col justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
                <p className="text-sm text-gray-500">Generating your PDF...</p>
                {retryCount > 0 && (
                  <p className="text-xs text-amber-600 mt-2">Retrying... (Attempt {retryCount + 1})</p>
                )}
              </div>
             ) : generatedPdfUrl ? (
               <div className="h-[80vh] w-full">
                 <PDFViewer url={generatedPdfUrl} className="h-full w-full" />
               </div>
             ) : (
              <div className="flex flex-col justify-center items-center h-96">
                <AlertCircle className="h-12 w-12 text-amber-400 mb-4" />
                <p className="text-sm text-gray-500">PDF generation failed. Please try again.</p>
                {error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md max-w-md">
                    <p className="text-xs text-red-600 text-center">{error}</p>
                  </div>
                )}
                <button
                  onClick={() => generatePdf(submission.id, form.id, false)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  Retry PDF Generation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Submission Details */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Submission Details</h2>
        </div>
        
        <div className="p-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Form</dt>
              <dd className="mt-1 text-sm text-gray-900">{form?.title}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.badgeClasses}`}>
                  {statusConfig.badgeLabel}
                </span>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Submitted On</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Submission ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{submission?.id}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
} 