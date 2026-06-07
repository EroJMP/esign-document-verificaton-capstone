'use client';

import React, { useState, useEffect, use, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Check, Download, X, FileText, Eye } from 'lucide-react';
import PDFViewer from '@/components/pdf/PDFViewer';
import SignatureCapture from '@/components/form/SignatureCapture';

type FormField = {
  id: string;
  form_id: string;
  field_type: string;
  label: string;
  required: boolean;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  page: number;
  options?: any;
};

type Form = {
  id: string;
  title: string;
  description: string;
  status: string;
  template_url: string;
  template_filename: string;
  available_from: string;
  available_until: string;
  form_fields: FormField[];
};

type Submission = {
  id: string;
  form_id: string;
  student_id: string;
  status: string;
  submitted_at: string | null;
};

type FieldValue = {
  id: string;
  submission_id: string;
  field_id: string;
  value: any;
};

function StudentFormViewContent({ params }: { params: Promise<{ id: string }> }) {
  const [form, setForm] = useState<Form | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams?.get('submission');
  const token = searchParams?.get('accessToken');
  const resubmit = searchParams?.get('resubmit');
  
  // Unwrap params properly
  const unwrappedParams = use(params);
  const formId = unwrappedParams.id;
  
  useEffect(() => {
    fetchFormDetails();
  }, [formId, submissionId, token]);
  
  // Helper function to log audit trail
  const logAuditAction = async (
    action: 'form_opened' | 'field_filled' | 'form_submitted',
    fieldId?: string,
    fieldLabel?: string,
    fieldValue?: any
  ) => {
    if (!submission || !form) return;
    
    try {
      await fetch('/api/student/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission_id: submission.id,
          form_id: form.id,
          action: action,
          field_id: fieldId,
          field_label: fieldLabel,
          field_value: fieldValue,
          details: {
            form_title: form.title,
            page: currentPage
          }
        })
      });
    } catch (error) {
      // Log errors silently, don't interrupt user flow
      console.error('Failed to log audit action:', error);
    }
  };
  
  // Auto-save functionality
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [formOpenLogged, setFormOpenLogged] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Log when form is opened (only once)
  useEffect(() => {
    if (form && submission && !formOpenLogged) {
      logAuditAction('form_opened');
      setFormOpenLogged(true);
    }
  }, [form, submission, formOpenLogged]);
  
  useEffect(() => {
    // Don't auto-save if there's no submission or if auto-save is disabled
    if (!submission || !autoSaveEnabled) return;
    
    // Don't auto-save if there are no field values
    if (Object.keys(fieldValues).length === 0) return;
    
    // Set up auto-save timer (every 30 seconds)
    const autoSaveTimer = setTimeout(async () => {
      try {
        // Use direct Supabase upsert for auto-save
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        // First, get existing field values to check which ones need to be updated vs inserted
        const { data: existingValues, error: existingError } = await supabase
          .from('field_values')
          .select('id, field_id')
          .eq('submission_id', submission.id);
        
        if (existingError) {
          return;
        }
        
        // Create a map of field_id to existing value ID
        const existingValueMap = new Map();
        existingValues?.forEach(value => {
          existingValueMap.set(value.field_id, value.id);
        });
        
        // Process field values one by one to handle insert/update properly
        const fieldValueEntries = Object.entries(fieldValues);
        for (const [fieldId, value] of fieldValueEntries) {
          if (existingValueMap.has(fieldId)) {
            // Update existing field value
            const { error: updateError } = await supabase
              .from('field_values')
              .update({
                value: value,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingValueMap.get(fieldId));
            
            if (updateError) {
              return; // Auto-save failed silently
            }
          } else {
            // Insert new field value
            const { error: insertError } = await supabase
              .from('field_values')
              .insert({
                submission_id: submission.id,
                field_id: fieldId,
                value: value,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (insertError) {
              return; // Auto-save failed silently
            }
          }
        }
        
        // If we get here, auto-save was successful
        setLastSaved(new Date());
      } catch (error) {
        // Auto-save failed silently
      }
    }, 30000); // 30 seconds
    
    // Clean up timer
    return () => clearTimeout(autoSaveTimer);
  }, [submission, fieldValues, autoSaveEnabled]);
  
  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch form details
      const url = new URL(`/api/student/forms/${formId}`, window.location.origin);
      if (token) {
        url.searchParams.set('accessToken', token);
      }
      if (submissionId) {
        url.searchParams.set('submission', submissionId);
      }
      if (resubmit) {
        url.searchParams.set('resubmit', resubmit);
      }
      const formResponse = await fetch(url.toString());
      
      // Get the response text first to see what's being returned
      const responseText = await formResponse.text();
      
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch (e: any) {
        throw new Error('Failed to parse server response');
      }
      
      if (!formResponse.ok) {
        // Use the specific error message from the API if available
        if (responseData.error === 'Form is not yet available') {
          throw new Error('This form is not yet available. Please check back on the scheduled start date.');
        } else if (responseData.error === 'Form is no longer available') {
          throw new Error('This form is no longer available as the submission period has ended.');
        } else if (responseData.error === 'Form is not published') {
          throw new Error('This form is not yet published and cannot be accessed.');
        } else {
          throw new Error(responseData.error || 'Failed to fetch form details');
        }
      }
      
      // Check if form is in draft status
      if (responseData.form?.status === 'draft') {
        throw new Error('Form is not available');
      }
      
      setForm(responseData.form);
      
      // If form_fields is missing or empty, try to fetch them directly
      if (!responseData.form?.form_fields || responseData.form.form_fields.length === 0) {
        try {
          const fieldsResponse = await fetch(`/api/student/forms/${formId}/fields`);
          
          if (fieldsResponse.ok) {
            const fieldsData = await fieldsResponse.json();
            
            if (fieldsData.fields && fieldsData.fields.length > 0) {
              // Update the form with the fetched fields
              setForm(prevForm => prevForm ? {
                ...prevForm,
                form_fields: fieldsData.fields
              } : null);
            }
          }
        } catch (e) {
          // Error fetching fields silently
        }
      }
      
      // Check if there's a submission ID in the URL or fetch/create one
      let currentSubmissionId = submissionId;
      
      // If there's already a submission from the API response, use it
      if (responseData.submission) {
        setSubmission(responseData.submission);
        currentSubmissionId = responseData.submission.id;
      } else if (!currentSubmissionId) {
        // Check if there's an existing submission or create a new one
        try {
          const submissionResponse = await fetch(`/api/student/forms/${formId}/submissions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            // If we have a token, include it in the request
            body: token ? JSON.stringify({ token }) : JSON.stringify({}),
          });
          
          if (!submissionResponse.ok) {
            const errorData = await submissionResponse.json();
            console.warn('Failed to create submission:', errorData.error);
            // Don't throw error here - just continue without submission
            setSubmission(null);
          } else {
            const submissionData = await submissionResponse.json();
            setSubmission(submissionData.submission);
            currentSubmissionId = submissionData.submission.id;
          }
        } catch (submissionError) {
          console.warn('Error creating submission:', submissionError);
          // Don't throw error here - just continue without submission
          setSubmission(null);
        }
      } else {
        // Fetch the existing submission
        try {
          const submissionResponse = await fetch(`/api/student/submissions/${currentSubmissionId}`);
          
          if (!submissionResponse.ok) {
            const errorData = await submissionResponse.json();
            console.warn('Failed to fetch submission:', errorData.error);
            setSubmission(null);
          } else {
            const submissionData = await submissionResponse.json();
            setSubmission(submissionData.submission);
          }
        } catch (submissionError) {
          console.warn('Error fetching submission:', submissionError);
          setSubmission(null);
        }
      }
      
      // Fetch field values for the submission
      if (currentSubmissionId) {
        try {
          const valuesResponse = await fetch(`/api/student/submissions/${currentSubmissionId}/values`);
          
          if (!valuesResponse.ok) {
            console.warn('Failed to fetch field values');
            setFieldValues({});
          } else {
            const valuesData = await valuesResponse.json();
            
            // Convert array of field values to a record keyed by field_id
            const valueRecord: Record<string, any> = {};
            if (valuesData.fieldValues && Array.isArray(valuesData.fieldValues)) {
              valuesData.fieldValues.forEach((fieldValue: FieldValue) => {
                valueRecord[fieldValue.field_id] = fieldValue.value;
              });
            }
            
            setFieldValues(valueRecord);
          }
        } catch (valuesError) {
          console.warn('Error fetching field values:', valuesError);
          setFieldValues({});
        }
      }
    } catch (error: any) {
      console.error('❌ Error in fetchFormDetails:', error);
      setError(error.message || 'An error occurred while fetching form details');
    } finally {
      setLoading(false);
    }
  };

  // Track which fields have been logged to avoid duplicate entries
  const [loggedFields, setLoggedFields] = useState<Set<string>>(new Set());

  const handleInputChange = (fieldId: string, value: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    
    // Only log field fill action once per field when it has a meaningful value
    const field = form?.form_fields?.find(f => f.id === fieldId);
    if (field && value && !loggedFields.has(fieldId)) {
      // Only log if the field has a meaningful value and hasn't been logged yet
      logAuditAction('field_filled', fieldId, field.label, value);
      setLoggedFields(prev => new Set(prev).add(fieldId));
    }
  };

  const handleSaveProgress = async () => {
    if (!submission) {
      setError('No submission found');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Check if we have any values to save
      const fieldValueEntries = Object.entries(fieldValues);
      if (fieldValueEntries.length === 0) {
        setError('No field values to save. Please fill in some fields first.');
        return;
      }
      
      // Use the same approach as fix-form page - direct Supabase upsert
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // First, get existing field values to check which ones need to be updated vs inserted
      const { data: existingValues, error: existingError } = await supabase
        .from('field_values')
        .select('id, field_id')
        .eq('submission_id', submission.id);
      
      if (existingError) {
        throw new Error(`Failed to fetch existing field values: ${existingError.message}`);
      }
      
      // Create a map of field_id to existing value ID
      const existingValueMap = new Map();
      existingValues?.forEach(value => {
        existingValueMap.set(value.field_id, value.id);
      });
      
      // Process field values one by one to handle insert/update properly
      const results = [];
      for (const [fieldId, value] of fieldValueEntries) {
        if (existingValueMap.has(fieldId)) {
          // Update existing field value
          const { data: updatedValue, error: updateError } = await supabase
            .from('field_values')
            .update({
              value: value,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingValueMap.get(fieldId))
            .select()
            .single();
          
          if (updateError) {
            throw new Error(`Failed to update field value: ${updateError.message}`);
          }
          results.push(updatedValue);
        } else {
          // Insert new field value
          const { data: insertedValue, error: insertError } = await supabase
            .from('field_values')
            .insert({
              submission_id: submission.id,
              field_id: fieldId,
              value: value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (insertError) {
            throw new Error(`Failed to insert field value: ${insertError.message}`);
          }
          results.push(insertedValue);
        }
      }
      
      const insertedValues = results;
      
      setSuccess(`Progress saved successfully! ${insertedValues?.length || 0} field(s) updated.`);
      
      // Redirect to dashboard after successful save
      setTimeout(() => {
        router.push('/student');
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'An error occurred while saving progress');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitClick = () => {
    // Clear any existing errors
    setError(null);
    
    // Validate required fields before showing confirmation
    if (form?.form_fields) {
      // Exclude checkbox fields from required validation since they can be legitimately unchecked
      const requiredFields = form.form_fields.filter(field => field.required && field.field_type !== 'checkbox');
      const missingFields = requiredFields.filter(field => {
        const value = fieldValues[field.id];
        // Check for null, undefined, empty string, or whitespace-only string
        return !value || (typeof value === 'string' && value.trim() === '');
      });
      
      if (missingFields.length > 0) {
        const missingFieldNames = missingFields.map(field => field.label || 'Unnamed field').join(', ');
        setError(`Please fill in all required fields: ${missingFieldNames}`);
        return;
      }
    }
    
    // Validate that at least some fields are filled (not just required ones)
    const filledFields = Object.entries(fieldValues).filter(([_, value]) => {
      // For boolean values (checkboxes), consider them filled if they're true
      // For string values, check if they're not empty or whitespace-only
      return value && (typeof value === 'boolean' || (typeof value === 'string' && value.trim() !== ''));
    });
    
    if (filledFields.length === 0) {
      setError('Please fill in at least one field before submitting the form.');
      return;
    }
    
    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleSubmitForm = async () => {
    if (!submission) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Check if form is already submitted (prevent duplicate submissions)
      if (submission.status === 'completed') {
        setError('This form has already been submitted and cannot be submitted again.');
        setSubmitting(false);
        return;
      }
      
      // Field validation is already done in handleSubmitClick
      
      
      // First, save all field values using the same approach as fix-form page
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // Get existing field values to check which ones need to be updated vs inserted
      const { data: existingValues, error: existingError } = await supabase
        .from('field_values')
        .select('id, field_id')
        .eq('submission_id', submission.id);
      
      if (existingError) {
        console.error('Error fetching existing field values:', existingError);
        throw new Error(`Failed to fetch existing field values: ${existingError.message}`);
      }
      
      // Create a map of field_id to existing value ID
      const existingValueMap = new Map();
      existingValues?.forEach(value => {
        existingValueMap.set(value.field_id, value.id);
      });
      
      // Process field values one by one to handle insert/update properly
      const fieldValueEntries = Object.entries(fieldValues);
      for (const [fieldId, value] of fieldValueEntries) {
        if (existingValueMap.has(fieldId)) {
          // Update existing field value
          const { error: updateError } = await supabase
            .from('field_values')
            .update({
              value: typeof value === 'boolean' ? String(value) : value,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingValueMap.get(fieldId));
          
          if (updateError) {
            throw new Error(`Failed to update field value: ${updateError.message}`);
          }
        } else {
          // Insert new field value
          const { error: insertError } = await supabase
            .from('field_values')
            .insert({
              submission_id: submission.id,
              field_id: fieldId,
              value: typeof value === 'boolean' ? String(value) : value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            throw new Error(`Failed to insert field value: ${insertError.message}`);
          }
        }
      }
      
      // Prepare field values for submission
      const fieldValuesForSubmission = fieldValueEntries.map(([fieldId, value]) => ({
        field_id: fieldId,
        value: value
      }));
      
      // Then, submit the form
      const submitResponse = await fetch(`/api/student/submissions/${submission.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldValues: fieldValuesForSubmission,
          qrCode: null // You can add QR code generation here if needed
        })
      });
      
      if (!submitResponse.ok) {
        let errorMessage = 'Failed to submit form';
        try {
          const errorData = await submitResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use the status text
          errorMessage = `HTTP ${submitResponse.status}: ${submitResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      let submitData;
      try {
        submitData = await submitResponse.json();
      } catch (jsonError) {
        console.error('Failed to parse submit response JSON:', jsonError);
        throw new Error('Invalid response from server');
      }
      
      // Redirect to the submission confirmation page
      router.push(`/student/submissions/${submission.id}/confirmation`);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.message || 'An error occurred while submitting the form');
      setSubmitting(false);
    }
  };

  // Get proxied PDF URL for the form - memoized to prevent unnecessary re-renders
  const pdfUrl = useMemo(() => {
    if (!formId) return '';
    const baseUrl = `/api/student/forms/${formId}/pdf-proxy`;
    const params = new URLSearchParams();
    if (token) {
      params.set('token', token);
    }
    if (submissionId) {
      params.set('submission', submissionId);
    }
    if (resubmit) {
      params.set('resubmit', resubmit);
    }
    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }, [formId, token, submissionId, resubmit]);

  // Render the current page when it changes
  useEffect(() => {
    if (form?.template_url) {
      // Use the proxy URL instead of the direct Supabase URL
      setPdfLoaded(false);
    }
  }, [form?.template_url]);

  // Memoize callbacks to prevent PDF reloading on every render
  const handlePdfLoad = useCallback(() => {
    setPdfLoaded(true);
  }, []);

  const handlePageChange = useCallback((pageNumber: number, total: number) => {
    setCurrentPage(pageNumber);
    setTotalPages(total);
  }, []);

  const handlePdfError = useCallback((error: Error) => {
    setError(error.message);
  }, []);

  // Get fields for the current page
  const getCurrentPageFields = () => {
    if (!form || !form.form_fields) return [];
    
    // First try to find fields with the exact page number
    const exactPageFields = form.form_fields.filter(field => field.page === currentPage);
    
    if (exactPageFields.length > 0) {
      return exactPageFields;
    }
    
    // If no fields with exact page number, try with page as string (in case of data type mismatch)
    const stringPageFields = form.form_fields.filter(field => 
      field.page?.toString() === currentPage.toString()
    );
    
    if (stringPageFields.length > 0) {
      return stringPageFields;
    }
    
    // If still no fields, return fields with page=1 or undefined page as fallback
    const fallbackFields = form.form_fields.filter(field => 
      !field.page || field.page === 1
    );
    
    return fallbackFields;
  };

  const renderFieldInput = (field: FormField) => {
    const value = fieldValues[field.id] !== undefined ? fieldValues[field.id] : '';
    const isSubmitted = submission?.status === 'submitted';
    
    if (isSubmitted) {
      return (
        <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 p-3">
          {value !== undefined ? (
            field.field_type === 'checkbox' ? (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                value === true || value === 'true' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {value === true || value === 'true' ? '✓ Checked' : '✗ Not Checked'}
              </span>
            ) : (
              Array.isArray(value) ? value.join(', ') : value.toString()
            )
          ) : (
            <span className="text-gray-400">No response</span>
          )}
        </div>
      );
    }
    
    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            id={field.id}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder={field.label}
            required={field.required}
          />
        );
      case 'name':
        return (
          <input
            type="text"
            id={field.id}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder={`Enter ${field.label || 'name'}`}
            required={field.required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            required={field.required}
          />
        );
      case 'signature':
        return (
          <SignatureCapture
            id={field.id}
            value={value || ''}
            onChange={handleInputChange}
            required={field.required}
            label="" // Remove duplicate label since parent already renders it
          />
        );
      case 'checkbox':
        return (
          <div className="mt-1">
            <label className="flex items-center">
              <input
                type="checkbox"
                id={field.id}
                checked={value === true || value === 'true'}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {field.label || 'Check this box'}
              </span>
            </label>
          </div>
        );
      default:
        return (
          <input
            type="text"
            id={field.id}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder={field.label}
            required={field.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-500"></div>
        <p className="text-sm text-gray-500">Loading your form...</p>
      </div>
    );
  }

  // Don't return early for errors - show them as modals instead

  if (!form) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-600">Form Not Found</h2>
          <p className="mb-4 text-gray-600">The form you are looking for does not exist or has been deleted.</p>
          <Link href="/student" className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isFormSubmitted = submission?.status === 'completed';

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left side - Back button and Title */}
          <div className="flex items-center min-w-0 flex-1">
            <Link
              href="/student"
              className="mr-2 sm:mr-4 inline-flex items-center text-gray-600 hover:text-gray-900 text-xs sm:text-sm"
            >
              <ArrowLeft className="mr-1 w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <h1 className="text-sm sm:text-lg md:text-xl font-bold truncate">
              {form.title}
            </h1>
          </div>
          
          {/* Right side - Buttons (icon only on mobile, text on desktop) */}
          {!isFormSubmitted && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={handleSaveProgress}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-md bg-gray-600 p-2 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-gray-700"
                title={saving ? 'Saving...' : 'Save Progress'}
              >
                <Save className="w-4 h-4 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline sm:ml-2">{saving ? 'Saving...' : 'Save Progress'}</span>
              </button>
              <button
                onClick={handleSubmitClick}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-green-600 p-2 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-green-700"
                title={submitting ? 'Submitting...' : 'Submit Form'}
              >
                <Check className="w-4 h-4 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline sm:ml-2">{submitting ? 'Submitting...' : 'Submit Form'}</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Auto-save info (only shown on desktop) */}
        {!isFormSubmitted && (
          <div className="hidden sm:flex items-center justify-end mt-2 space-x-2 text-xs">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={() => setAutoSaveEnabled(!autoSaveEnabled)}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-xs text-gray-500">Auto-save</span>
            </label>
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Success Messages */}
      
      {success && (
        <div className="mx-4 mt-4 rounded-md bg-green-50 p-4 text-green-800">
          <p>{success}</p>
        </div>
      )}
      
      {isFormSubmitted && (
        <div className="mx-4 mt-4 rounded-md bg-green-50 p-4 text-green-800">
          <p>This form has been submitted. You can view your responses but cannot make changes.</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div className={`flex-1 overflow-auto min-h-0 md:min-h-full max-h-[60vh] md:max-h-none ${sidebarOpen ? 'hidden md:flex' : 'flex'}`}>
          {form.template_url ? (
            <div className="h-full min-h-[400px] md:min-h-full w-full">
              <PDFViewer 
                url={pdfUrl} 
                className="h-full w-full"
                onLoad={handlePdfLoad}
                onError={handlePdfError}
                onPageChange={handlePageChange}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">No document attached to this form.</p>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className={`border-t md:border-l md:border-t-0 border-gray-200 bg-white flex flex-col ${sidebarOpen ? 'w-full md:w-96' : 'w-full md:w-12'} ${sidebarOpen ? 'max-h-[100vh] md:max-h-none ' : ''} min-h-0 ${!sidebarOpen ? 'md:mt-0 mt-4' : ''}`}>
          {/* Toggle Button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-12 w-full items-center justify-center border-b border-gray-200 text-gray-500 hover:bg-gray-100 flex-shrink-0"
          >
            <span className="md:hidden flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
              {sidebarOpen ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>View Form</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>View Form Items</span>
                </>
              )}
            </span>
            <span className="hidden md:inline">
              {sidebarOpen ? <X /> : <Check />}
            </span>
          </button>
          
          {/* Form Fields */}
          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <h2 className="mb-2 text-lg font-medium">Answer Form Items</h2>
              <p className="mb-4 text-sm text-gray-600">Kindly review the form before filling out the items.</p>
              
              {form.form_fields && form.form_fields.length > 0 ? (
                <div className="space-y-6">
                  {getCurrentPageFields().length > 0 ? (
                    getCurrentPageFields().map((field) => (
                      <div key={field.id} className="rounded-md border border-gray-200 p-4 shadow-sm">
                        <div className="mb-1 flex items-center justify-between">
                          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                            {field.label || 'Unnamed Field'}
                            {field.required && field.field_type !== 'checkbox' && <span className="ml-1 text-red-500">*</span>}
                          </label>
                        </div>
                        {renderFieldInput(field)}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
                      <p className="text-sm text-yellow-700">
                        No fields found on page {currentPage}. 
                        {totalPages > 1 && ' Try navigating to a different page.'}
                      </p>
                    </div>
                  )}
                  
                </div>
              ) : (
                <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">No fields found</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          This form doesn&apos;t have any fields yet. Please contact the administrator.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={() => setShowConfirmDialog(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Confirm Form Submission
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to submit this form? Once submitted, you cannot make any changes to your responses.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    handleSubmitForm();
                  }}
                  disabled={submitting}
                  className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit Form'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={submitting}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal Dialog */}
      {error && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={() => setError(null)}></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      {error.includes('do not have access') || error.includes('Access denied') ? 'Access Denied' : 'Validation Error'}
                    </h3>
                    <div className="mt-2">
                      {error.includes('Please fill in all required fields:') ? (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">
                            Please fill in all required fields before submitting:
                          </p>
                          <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
                            {error.split('Please fill in all required fields: ')[1]?.split(', ').map((field, index) => (
                              <div key={index} className="text-xs text-gray-700 py-1">
                                • {field}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentFormView({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentFormViewContent params={params} />
    </Suspense>
  );
}