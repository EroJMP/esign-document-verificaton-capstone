'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Type, PenTool, User, Calendar } from 'lucide-react';
import { use } from 'react';

// Import our custom components
import PDFViewer from '@/components/pdf/PDFViewer';
import { actualToDisplayCoordinates } from '@/lib/pdf-constants';

type FormField = {
  id: string;
  form_id: string;
  label: string;
  field_type: string;
  required: boolean;
  position: number;
  x_position: number | null;
  y_position: number | null;
  width: number | null;
  height: number | null;
  options: string[] | null;
  created_at: string;
  updated_at: string;
};

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  template_url: string | null;
  template_filename: string | null;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  form_fields: FormField[];
};

// Field types with icons
const fieldTypes = [
  { type: 'text', icon: Type, label: 'Text Field', color: 'bg-green-100 border-green-300 text-green-800' },
  { type: 'signature', icon: PenTool, label: 'Signature Field', color: 'bg-green-100 border-green-300 text-green-800' },
  { type: 'name', icon: User, label: 'Name Field', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { type: 'date', icon: Calendar, label: 'Date Field', color: 'bg-orange-100 border-orange-300 text-orange-800' },
];

export default function FormPreview({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params object using React.use()
  const unwrappedParams = use(params);
  const formId = unwrappedParams.id;
  
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Refs
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pdfDimensionsRef = useRef({ width: 0, height: 0 });
  
  
  // Update overlay position to match PDF canvas exactly
  const updateOverlayPosition = useCallback(() => {
    if (pdfContainerRef.current && overlayRef.current) {
      const canvasElement = pdfContainerRef.current.querySelector('canvas');
      if (canvasElement) {
        // Get the PDF dimensions from the canvas
        const pdfWidth = canvasElement.width;
        const pdfHeight = canvasElement.height;
        
        pdfDimensionsRef.current = {
          width: pdfWidth,
          height: pdfHeight
        };
        
        // Get the canvas position within its container
        const canvasRect = canvasElement.getBoundingClientRect();
        const containerRect = pdfContainerRef.current.getBoundingClientRect();
        
        // Calculate offsets to position overlay exactly over the canvas
        const offsetLeft = canvasRect.left - containerRect.left;
        const offsetTop = canvasRect.top - containerRect.top;
        
        // Apply dimensions and position
        overlayRef.current.style.width = `${pdfWidth}px`;
        overlayRef.current.style.height = `${pdfHeight}px`;
        overlayRef.current.style.left = `${offsetLeft}px`;
        overlayRef.current.style.top = `${offsetTop}px`;
        
        // Add proper styling to ensure overlay matches exactly
        overlayRef.current.style.clipPath = 'inset(0 0 0 0)';
        overlayRef.current.style.overflow = 'hidden';
        overlayRef.current.style.position = 'absolute';
        overlayRef.current.style.pointerEvents = 'none'; // Make it non-interactive in preview
        
        console.log('Preview - PDF Dimensions:', pdfWidth, pdfHeight);
        console.log('Preview - Canvas Rect:', canvasRect.width, canvasRect.height);
        console.log('Preview - Offsets:', offsetLeft, offsetTop);
      }
    }
  }, []);
  
  useEffect(() => {
    fetchFormDetails();
  }, [formId]);

  // Add window resize listener to update overlay position
  useEffect(() => {
    const handleResize = () => {
      if (pdfLoaded) {
        setTimeout(() => {
          updateOverlayPosition();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfLoaded, updateOverlayPosition]);
  
  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/forms/${formId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch form details');
      }
      
      const data = await response.json();
      setForm(data.form);
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while fetching form details');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle PDF load
  const handlePdfLoad = useCallback(() => {
    setPdfLoaded(true);
    setError(null);
    
    // Update overlay position after PDF loads
    setTimeout(() => {
      updateOverlayPosition();
    }, 100);
  }, [updateOverlayPosition]);

  // Handle PDF error
  const handlePdfError = useCallback((error: Error) => {
    setError(error.message);
    setPdfLoaded(false);
  }, []);

  // Handle page change
  const handlePageChange = useCallback((pageNumber: number, totalPages: number) => {
    setCurrentPage(pageNumber);
    setTotalPages(totalPages);
    
    // Update PDF dimensions when page changes
    setTimeout(() => {
      updateOverlayPosition();
    }, 500);
  }, [updateOverlayPosition]);

  // Convert database fields to display fields
  const getDisplayFields = () => {
    if (!form?.form_fields) return [];
    
    return form.form_fields
      .filter(field => field.x_position !== null && field.y_position !== null)
      .map(field => {
        const { x, y, width, height } = actualToDisplayCoordinates(
          field.x_position || 0,
          field.y_position || 0,
          field.width || 150,
          field.height || 30
        );
        
        return {
          id: field.id,
          label: field.label,
          type: field.field_type as 'name' | 'text' | 'date' | 'signature' | 'checkbox',
          required: field.required,
          x,
          y,
          width,
          height,
          page: 1 // Assuming single page for now
        };
      });
  };

  const displayFields = getDisplayFields();
  const currentPageFields = displayFields.filter(field => (field.page || 1) === currentPage);

  // Get field type info
  const getFieldTypeInfo = (type: string) => {
    return fieldTypes.find(ft => ft.type === type) || fieldTypes[0];
  };
  
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-gray-500">Loading form preview...</p>
      </div>
    );
  }
  
  if (!form) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-600">Form Not Found</h2>
          <p className="mb-4 text-gray-600">The form you are looking for does not exist or has been deleted.</p>
          <Link href="/admin/forms" className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700">
            Back to Forms
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center">
          <Link
            href={`/admin/forms/${formId}`}
            className="mr-4 inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-1" />
            Back to Form
          </Link>
          <h1 className="text-xl font-semibold">Form Preview: {form.title}</h1>
        </div>
      </div>
      
      {error && (
        <div className="mx-6 mt-4 rounded-md bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Fields List */}
        <div className="w-80 border-r border-gray-200 bg-white">
          <div className="flex h-full flex-col">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold">Form Fields</h2>
              <p className="mt-1 text-sm text-gray-600">
                Fields placed on the PDF template
              </p>
        </div>
        
            <div className="flex-1 overflow-y-auto p-4">
              {displayFields.length > 0 ? (
                <div className="space-y-3">
                  {displayFields.map((field) => {
                    const fieldTypeInfo = getFieldTypeInfo(field.type);
                    const IconComponent = fieldTypeInfo.icon;
                    
                    return (
                       <div
                         key={field.id}
                         className="rounded-lg border-2 border-gray-300 bg-gray-50 p-3"
                       >
              <div className="flex items-center">
                          <IconComponent className="mr-2 h-4 w-4" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{field.label}</p>
                            <p className="text-xs opacity-75">
                              {fieldTypeInfo.label}
                              {field.required && ' • Required'}
                            </p>
                          </div>
                </div>
              </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="rounded-full bg-gray-100 p-3 mx-auto w-12 h-12 flex items-center justify-center mb-3">
                    <Type className="h-6 w-6 text-gray-400" />
              </div>
                  <p className="text-gray-500 text-sm">No fields placed yet</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Fields will appear here when placed on the PDF
                  </p>
              </div>
              )}
              </div>
            </div>
          </div>

        {/* Main Content - PDF Viewer */}
        <div className="flex-1">
          <div className="p-6">
            <div 
              ref={pdfContainerRef}
              className="relative overflow-auto rounded-lg border border-gray-300 bg-gray-100"
              style={{ height: '600px' }}
            >
              {form.template_url ? (
                <div className="relative">
                  <PDFViewer
                    url={`/api/admin/forms/${formId}/pdf-proxy`}
                    className="w-full"
                    onLoad={handlePdfLoad}
                    onError={handlePdfError}
                    onPageChange={handlePageChange}
                  />
                  
                  {/* Field Overlay */}
                  {pdfLoaded && (
                    <div 
                      ref={overlayRef}
                      className="absolute pointer-events-none"
                      style={{ 
                        width: pdfDimensionsRef.current.width, 
                        height: pdfDimensionsRef.current.height,
                        overflow: 'hidden',
                        position: 'absolute',
                        clipPath: 'inset(0 0 0 0)'
                      }}
                    >
                      {currentPageFields.map((field) => {
                        const fieldTypeInfo = getFieldTypeInfo(field.type);
                        const IconComponent = fieldTypeInfo.icon;
                        
                        return (
                          <div
                            key={field.id}
                            className="absolute border-2 border-green-500 bg-green-100 bg-opacity-50 rounded flex items-center justify-center text-xs font-medium text-green-800"
                            style={{
                              left: `${field.x}px`,
                              top: `${field.y}px`,
                              width: `${field.width}px`,
                              height: `${field.height}px`,
                            }}
                          >
                            <IconComponent className="mr-1 h-3 w-3" />
                            <span className="truncate">{field.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
            </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="rounded-full bg-gray-100 p-4 mx-auto w-16 h-16 flex items-center justify-center mb-4">
                      <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF Template</h3>
                    <p className="text-gray-500">
                      Upload a PDF template to see the field preview
                  </p>
                </div>
              </div>
              )}
            </div>
            
            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center space-x-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
} 