import { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import { Upload, File, AlertCircle, CheckCircle } from 'lucide-react';

type FormData = {
  title: string;
  description: string;
  availableFrom: string;
  availableUntil: string;
  pdfTemplate: File | null;
  templateUrl: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
  }>;
};

type PDFUploadStepProps = {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  formId: string;
};

export default function PDFUploadStep({ formData, updateFormData, formId }: PDFUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add these state variables to the component
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<{
    fileSize: number;
    fileName: string;
    uploadTime: number;
    error?: string;
  } | null>(null);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);

  // Check if PDF is already uploaded when component mounts or formData changes
  useEffect(() => {
    console.log('PDFUploadStep: Checking template URL:', formData.templateUrl);
    console.log('PDFUploadStep: Current upload success state:', uploadSuccess);
    
    if (formData.templateUrl && formData.templateUrl.trim() !== '') {
      console.log('PDFUploadStep: Setting upload success to true');
      setUploadSuccess(true);
      setError(null); // Clear any previous errors
    } else {
      console.log('PDFUploadStep: No template URL found, setting upload success to false');
      setUploadSuccess(false);
    }
  }, [formData.templateUrl]); // Remove uploadSuccess from dependencies to avoid infinite loop

  // Add this function to run the diagnostic
  const runPermissionDiagnostic = async () => {
    try {
      setRunningDiagnostic(true);
      setDiagnosticData(null);
      
      const response = await fetch('/api/admin/check-permissions');
      const data = await response.json();
      
      setDiagnosticData(data);
    } catch (error) {
      console.error('Error running diagnostic:', error);
    } finally {
      setRunningDiagnostic(false);
    }
  };
  
  // Handle file selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };
  
  // Handle drag and drop events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };
  
  // Handle file upload
  const uploadFile = async (file: File) => {
    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Store the file in the form data
      updateFormData({ pdfTemplate: file });
      
      // Upload the file to the server
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch(`/api/admin/forms/${formId}/upload-template`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Upload error response:', data);
        
        // Check for specific error types
        if (data.error && data.error.includes('row-level security policy')) {
          throw new Error('Permission denied: You do not have the required permissions to upload files. Please contact your administrator.');
        } else if (data.details && data.details.statusCode === '403') {
          throw new Error('Access forbidden: Your account does not have permission to upload to this storage bucket.');
        } else {
          throw new Error(data.error || 'Failed to upload template');
        }
      }
      
      // Store the template URL in the form data
      const templateUrl = data.form.template_url || data.form.pdf_template || '';
      console.log('PDFUploadStep: Upload successful, updating form data with template URL:', templateUrl);
      
      updateFormData({ 
        templateUrl: templateUrl,
        pdfTemplate: file
      });
      
      setUploadSuccess(true);
      
    } catch (error: unknown) {
      console.error('Error uploading PDF:', error);
      setError((error as Error).message || 'An error occurred while uploading the PDF');
      
      // Reset the form data if upload failed
      updateFormData({ pdfTemplate: null, templateUrl: '' });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Upload PDF Template</h2>
        <p className="text-gray-600">
          Upload the PDF document that will be used as the template for your form.
        </p>
      </div>
      
      {/* Upload area */}
      <div 
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
          isDragging 
            ? 'border-green-500 bg-green-50' 
            : uploadSuccess 
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
            <p className="text-lg font-medium text-gray-700">Uploading PDF...</p>
            <p className="mt-2 text-sm text-gray-500">Please wait while we upload your file.</p>
          </div>
        ) : uploadSuccess || (formData.templateUrl && formData.templateUrl.trim() !== '') ? (
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
            <p className="text-lg font-medium text-gray-700">PDF Uploaded Successfully!</p>
            <p className="mt-2 text-sm text-gray-500">
              {formData.pdfTemplate?.name || 'PDF template is ready for field placement'}
            </p>
            <div className="mt-2 text-xs text-gray-400">
              Template URL: {formData.templateUrl ? 'Available' : 'Not set'}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              className="mt-4 rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
            >
              Replace PDF
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            {formData.pdfTemplate ? (
              <File className="mb-4 h-16 w-16 text-green-500" />
            ) : (
              <Upload className="mb-4 h-16 w-16 text-gray-400" />
            )}
            <p className="text-lg font-medium text-gray-700">
              {formData.pdfTemplate ? 'Replace PDF Template' : 'Drag & Drop your PDF here'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              or <span className="text-green-600">click to browse</span> (PDF files only)
            </p>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-4 flex items-start rounded-md bg-red-50 p-4 text-red-800">
          <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium">Error uploading PDF</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => setShowDiagnostic(!showDiagnostic)}
              className="mt-2 text-sm font-medium text-red-700 underline"
            >
              {showDiagnostic ? 'Hide Diagnostics' : 'Run Permission Diagnostics'}
            </button>
          </div>
        </div>
      )}
      
      {/* Diagnostic Tool */}
      {showDiagnostic && (
        <div className="mt-4 rounded-md border border-gray-300 bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Permission Diagnostics</h3>
          
          <button
            onClick={runPermissionDiagnostic}
            disabled={runningDiagnostic}
            className="mb-4 rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {runningDiagnostic ? 'Running...' : 'Run Diagnostic Check'}
          </button>
          
          {diagnosticData && (
            <div className="mt-2 space-y-2 text-sm">
              <div className="rounded-md bg-white p-2">
                <p><strong>Authentication:</strong> {diagnosticData.authenticated ? '✅ Authenticated' : '❌ Not authenticated'}</p>
                <p><strong>Admin Status:</strong> {diagnosticData.isAdmin ? '✅ Admin' : '❌ Not admin'}</p>
              </div>
              
              <div className="rounded-md bg-white p-2">
                <p className="font-medium">User Roles:</p>
                <p>Public Table: {diagnosticData.publicUserCheck.role || 'Not set'} {diagnosticData.publicUserCheck.error && `(Error: ${diagnosticData.publicUserCheck.error})`}</p>
                <p>Auth Table: {diagnosticData.authUserCheck.isAdmin ? 'admin' : 'not admin'} {diagnosticData.authUserCheck.error && `(Error: ${diagnosticData.authUserCheck.error})`}</p>
              </div>
              
              <div className="rounded-md bg-white p-2">
                <p className="font-medium">Storage Permissions:</p>
                <p>{diagnosticData.storagePermission.canUpload ? '✅ Can upload files' : '❌ Cannot upload files'}</p>
                {diagnosticData.storagePermission.error && (
                  <p className="mt-1 text-red-600">Error: {diagnosticData.storagePermission.error}</p>
                )}
              </div>
              
              <div className="mt-4">
                <p className="font-medium">Troubleshooting Steps:</p>
                <ol className="list-decimal pl-5">
                  <li>Run the <code>fix_storage_permissions.sql</code> script in Supabase SQL editor</li>
                  <li>Make sure your user has admin role in both tables</li>
                  <li>Check if the storage bucket exists and has proper policies</li>
                  <li>Try refreshing your authentication session</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* PDF Requirements */}
      <div className="mt-6 rounded-md bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">PDF Requirements:</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>File must be in PDF format</li>
          <li>Maximum file size: 10MB</li>
          <li>The PDF should be the actual form that needs to be filled out</li>
          <li>Make sure the PDF has enough space for placing input fields</li>
        </ul>
      </div>
    </div>
  );
} 