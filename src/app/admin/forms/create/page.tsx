'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Database } from '@/lib/supabase';

// Step components
import BasicInfoStep from './steps/BasicInfoStep';
import PDFUploadStep from './steps/PDFUploadStep';
import FieldPlacementStep from './steps/FieldPlacementStep';
import GenerateLinkStep from './steps/GenerateLinkStep';

// Form data type
type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  collegeDepartment: string;
  course: string;
  yearSection: string;
  displayText: string;
};

type FormData = {
  title: string;
  description: string;
  availableFrom: string;
  availableUntil: string;
  pdfTemplate: File | null;
  templateUrl: string;
  assignedCollegeDepartment: string;
  assignedCourses: string[];
  assignedStudents: Student[];
  fields: FormField[];
};

type FormField = {
  id: string;
  label: string;
  type: 'name' | 'text' | 'date' | 'signature' | 'checkbox';
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

function FormCreationWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const continueFormId = searchParams.get('continue');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(continueFormId);
  const [isLoadingExistingForm, setIsLoadingExistingForm] = useState(!!continueFormId);
  
  // Form data state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    availableFrom: '',
    availableUntil: '',
    pdfTemplate: null,
    templateUrl: '',
    assignedCollegeDepartment: '',
    assignedCourses: [],
    assignedStudents: [],
    fields: []
  });
  
  // Load existing form data if continuing
  useEffect(() => {
    if (continueFormId) {
      loadExistingForm(continueFormId);
    }
  }, [continueFormId]);

  const loadExistingForm = async (id: string) => {
    try {
      setIsLoadingExistingForm(true);
      setError(null);
      
      const response = await fetch(`/api/admin/forms/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load form data');
      }
      
      const data = await response.json();
      const form = data.form;
      
      console.log('Loading existing form:', form);
      console.log('Form fields from API:', form.form_fields);
      console.log('PDF template fields:', {
        pdf_template: form.pdf_template,
        template_url: form.template_url,
        template_filename: form.template_filename
      });
      
      // Update form data with existing values
      const templateUrl = form.template_url || form.pdf_template || '';
      console.log('Using template URL:', templateUrl);
      
      setFormData({
        title: form.title || '',
        description: form.description || '',
        availableFrom: form.available_from || '',
        availableUntil: form.available_until || '',
        pdfTemplate: null, // File objects can't be restored
        templateUrl: templateUrl,
        fields: (form.form_fields || []).map((field: Database['public']['tables']['form_fields']['Row']) => {
          console.log('Form loading - Processing field from database:', field);
          const mappedField = {
            id: field.id,
            label: field.label || '',
            type: field.type || field.field_type,
            required: field.required !== false, // Default to true unless explicitly false
            x: field.x || field.x_position || field.position_x || 0,
            y: field.y || field.y_position || field.position_y || 0,
            width: field.width || 100,
            height: field.height || 30,
            page: field.page || 1
          };
          console.log('Form loading - Mapped field (actual coordinates):', mappedField);
          return mappedField;
        })
      });
      
      // Determine which step to start from based on what's completed
      if (form.form_fields && form.form_fields.length > 0) {
        setCurrentStep(4); // Go to final step if fields are placed
      } else if (templateUrl) {
        setCurrentStep(3); // Go to field placement if PDF is uploaded
      } else {
        setCurrentStep(2); // Go to PDF upload step
      }
      
      console.log('Starting at step:', templateUrl ? (form.form_fields && form.form_fields.length > 0 ? 4 : 3) : 2);
      
    } catch (error: unknown) {
      console.error('Error loading existing form:', error);
      setError((error as Error).message || 'Failed to load form data');
    } finally {
      setIsLoadingExistingForm(false);
    }
  };

  // Handle form data changes
  const updateFormData = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };
  
  // Handle step navigation
  const goToNextStep = async () => {
    if (currentStep === 1) {
      // Create the form in the database before proceeding (only if not continuing)
      if (!formId) {
        await createForm();
      } else {
        // If continuing, just update the existing form
        await updateExistingForm();
      }
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Update existing form with new data
  const updateExistingForm = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          available_from: formData.availableFrom ? new Date(formData.availableFrom).toISOString() : null,
          available_until: formData.availableUntil ? new Date(formData.availableUntil).toISOString() : null,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update form');
      }
      
      setCurrentStep(2);
      
    } catch (error: unknown) {
      console.error('Form update error:', error);
      setError((error as Error).message || 'An error occurred while updating the form');
    } finally {
      setLoading(false);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Create the initial form
  const createForm = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          available_from: formData.availableFrom || null,
          available_until: formData.availableUntil || null,
          assigned_college_department: formData.assignedCollegeDepartment || null,
          assigned_courses: formData.assignedCourses.length > 0 ? formData.assignedCourses : null,
          assigned_students: formData.assignedStudents.length > 0 ? formData.assignedStudents.map(s => s.id) : null,
          pdf_template: ''
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error creating form:', data);
        
        // Check for authentication issues
        if (response.status === 401) {
          // Redirect to login page if unauthorized
          router.push('/auth/login?redirect=/admin/forms/create');
          throw new Error('Your session has expired. Please log in again.');
        }
        
        throw new Error(data.error || 'Failed to create form');
      }
      
      // Store the form ID and move to the next step
      setFormId(data.form.id);
      setCurrentStep(2);
      
    } catch (error: unknown) {
      console.error('Form creation error:', error);
      setError((error as Error).message || 'An error occurred while creating the form');
    } finally {
      setLoading(false);
    }
  };
  
  // Finish the form creation process
  const finishFormCreation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Publish the form
      const response = await fetch(`/api/admin/forms/${formId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish form');
      }
      
      // Navigate to forms list
      router.push('/admin/forms');
    } catch (error: unknown) {
      console.error('Error publishing form:', error);
      setError((error as Error).message || 'An error occurred while publishing the form');
    } finally {
      setLoading(false);
    }
  };
  
  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep 
            formData={formData} 
            updateFormData={updateFormData} 
          />
        );
      case 2:
        return (
          <PDFUploadStep 
            formData={formData} 
            updateFormData={updateFormData}
            formId={formId || ''}
          />
        );
      case 3:
        return (
          <FieldPlacementStep 
            formData={formData} 
            updateFormData={updateFormData}
            formId={formId || ''}
            goToNextStep={() => setCurrentStep(4)}
          />
        );
      case 4:
        return (
          <GenerateLinkStep 
            formData={formData}
            formId={formId || ''}
          />
        );
      default:
        return null;
    }
  };
  
  // Show loading state while loading existing form
  if (isLoadingExistingForm) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Loading Form...</h1>
          <Link 
            href="/admin/forms"
            className="text-green-600 hover:underline"
          >
            Back to Forms
          </Link>
        </div>
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">Loading existing form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {continueFormId ? 'Continue Form Creation' : 'Create Form'}
        </h1>
        <Link 
          href="/admin/forms"
          className="text-green-600 hover:underline"
        >
          Back to Forms
        </Link>
      </div>
      
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div 
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step === currentStep
                    ? 'border-green-600 bg-green-600 text-white'
                    : step < currentStep
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 bg-white text-gray-500'
                }`}
              >
                {step < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step}</span>
                )}
              </div>
              <span 
                className={`mt-2 text-sm ${
                  step === currentStep
                    ? 'font-medium text-green-600'
                    : step < currentStep
                    ? 'font-medium text-green-500'
                    : 'text-gray-500'
                }`}
              >
                {step === 1 && 'Basic Info'}
                {step === 2 && 'Upload PDF'}
                {step === 3 && 'Place Fields'}
                {step === 4 && 'Generate Link'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 h-1 w-full bg-gray-200">
          <div 
            className="h-1 bg-green-600 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}
      
      {/* Step content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        {renderStep()}
      </div>
      
      {/* Navigation buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={goToPreviousStep}
          disabled={currentStep === 1 || loading}
          className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
            currentStep === 1
              ? 'cursor-not-allowed bg-gray-300 text-gray-500'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="mr-2" />
          Previous
        </button>
        
        {currentStep < 4 ? (
          <button
            onClick={goToNextStep}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {loading ? 'Processing...' : 'Next'}
            <ArrowRight className="ml-2" />
          </button>
        ) : (
          <button
            onClick={finishFormCreation}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {loading ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing...
              </>
            ) : (
              <>
                <Check className="mr-2" />
                Finish & Publish
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function FormCreationWizard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormCreationWizardContent />
    </Suspense>
  );
} 