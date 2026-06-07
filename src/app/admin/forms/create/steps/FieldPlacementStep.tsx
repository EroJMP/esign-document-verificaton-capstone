'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Edit2, AlertCircle, X, Check, Type, PenTool, User, Calendar, XSquare } from 'lucide-react';

// Import our custom components
import PDFViewer from '@/components/pdf/PDFViewer';
import { actualToDisplayCoordinates, displayToActualCoordinates } from '@/lib/pdf-constants';

export type FormField = {
  id: string;
  label: string;
  type: 'name' | 'text' | 'date' | 'signature' | 'checkbox';
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
};

type FormData = {
  title: string;
  description: string;
  availableFrom: string;
  availableUntil: string;
  pdfTemplate: File | null;
  templateUrl: string;
  fields: FormField[];
};

type FieldPlacementStepProps = {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  formId: string;
  goToNextStep?: () => void;
};

// Field types with icons - defined outside component to prevent re-creation
const fieldTypes = [
  { type: 'text', icon: Type, label: 'Text Field', color: 'bg-green-100 border-green-300 text-green-800' },
  { type: 'signature', icon: PenTool, label: 'Signature Field', color: 'bg-green-100 border-green-300 text-green-800' },
  { type: 'name', icon: User, label: 'Name Field', color: 'bg-green-100 border-green-300 text-green-800' },
  { type: 'date', icon: Calendar, label: 'Date Field', color: 'bg-green-100 border-green-300 text-green-800' },
  { type: 'checkbox', icon: XSquare, label: 'Cross-box Field', color: 'bg-green-100 border-green-300 text-green-800' },
];

export default function FieldPlacementStep({ formData, updateFormData, formId, goToNextStep }: FieldPlacementStepProps) {
  // Local state - separate from form data to prevent unnecessary updates
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedFieldType, setDraggedFieldType] = useState<string | null>(null);
  
  // Local copy of fields to prevent excessive parent component updates
  const [localFields, setLocalFields] = useState<FormField[]>(formData.fields);
  
  // Refs
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pdfDimensionsRef = useRef({ width: 0, height: 0 });
  const isDraggingRef = useRef(false);
  
  // Counter for field types
  const fieldCountersRef = useRef({
    text: 0,
    signature: 0,
    name: 0,
    date: 0,
    checkbox: 0
  });
  
  // Sync local fields with form data when it changes from parent
  useEffect(() => {
    console.log('FieldPlacementStep: Syncing fields from parent formData');
    console.log('FieldPlacementStep: Received fields (should be actual coordinates):', formData.fields.map(f => ({
      id: f.id,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height
    })));
    
    // Scale up coordinates when loading existing fields from database/parent
    const scaledFields = formData.fields.map(field => {
      const { x, y, width, height } = actualToDisplayCoordinates(field.x, field.y, field.width, field.height);
      return {
        ...field,
        x,
        y,
        width,
        height
      };
    });
    
    console.log('FieldPlacementStep: Scaled fields for display:', scaledFields.map(f => ({
      id: f.id,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height
    })));
    
    setLocalFields(scaledFields);
  }, [formData.fields]);
  
  // Calculate field counts dynamically from localFields - this will trigger re-renders
  const fieldCounts = useMemo(() => {
    const counts = { text: 0, signature: 0, name: 0, date: 0, checkbox: 0 };
    
    localFields.forEach(field => {
      if (field.type in counts) {
        counts[field.type as keyof typeof counts]++;
      }
    });
    
    return counts;
  }, [localFields]);
  
  // Update field counters ref based on existing fields (for naming new fields)
  useEffect(() => {
    const counters = { text: 0, signature: 0, name: 0, date: 0, checkbox: 0 };
    
    localFields.forEach(field => {
      if (field.type in counters) {
        counters[field.type as keyof typeof counters]++;
      }
    });
    
    fieldCountersRef.current = counters;
  }, [localFields]);
  
  // Function to get proxied PDF URL to avoid CORS issues
  const getProxiedPdfUrl = useCallback((formId: string) => {
    return `/api/admin/forms/${formId}/pdf-proxy`;
  }, []);
  
  // Handle PDF load
  const handlePdfLoad = useCallback(() => {
    setPdfLoaded(true);
    setError(null);
    
    // Get PDF dimensions from the canvas element
    setTimeout(() => {
      const canvasElement = pdfContainerRef.current?.querySelector('canvas');
      if (canvasElement) {
        // Get the PDF dimensions from the canvas
        const pdfWidth = canvasElement.width;
        const pdfHeight = canvasElement.height;
        
        pdfDimensionsRef.current = {
          width: pdfWidth,
          height: pdfHeight
        };
        
        // Set the overlay dimensions to match the PDF
        if (overlayRef.current) {
          // Get the canvas position within its container
          const canvasRect = canvasElement.getBoundingClientRect();
          const containerRect = pdfContainerRef.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
          
          // Calculate offsets to position overlay exactly over the canvas
          const offsetLeft = canvasRect.left - containerRect.left;
          
          // For vertical positioning, we need to account for any scrolling and centering
          // that might be happening in the PDF viewer container
          const offsetTop = canvasRect.top - containerRect.top;
          
          // Apply dimensions and position
          overlayRef.current.style.width = `${pdfWidth}px`;
          overlayRef.current.style.height = `${pdfHeight}px`;
          overlayRef.current.style.left = `${offsetLeft}px`;
          overlayRef.current.style.top = `${offsetTop}px`;
          
          // Add a clip path to ensure fields stay within the PDF
          overlayRef.current.style.clipPath = 'inset(0 0 0 0)';
          overlayRef.current.style.overflow = 'hidden';
          overlayRef.current.style.position = 'absolute';
          overlayRef.current.style.pointerEvents = 'auto';
          
          // Log dimensions for debugging
          console.log('PDF Dimensions:', pdfWidth, pdfHeight);
          console.log('Canvas Rect:', canvasRect.width, canvasRect.height);
          console.log('Container Rect:', containerRect.width, containerRect.height);
          console.log('Offsets:', offsetLeft, offsetTop);
        }
      }
    }, 500); // Increased delay to ensure canvas is fully rendered
  }, []);
  
  // Handle PDF error
  const handlePdfError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load the PDF file. Please try again or use a different PDF.');
    setPdfLoaded(false);
  }, []);
  
  // Handle PDF page change
  const handlePageChange = useCallback((pageNumber: number, totalPages: number) => {
    setCurrentPage(pageNumber);
    setTotalPages(totalPages);
    setSelectedFieldId(null);
    
    // Update overlay dimensions when page changes
    setTimeout(() => {
      const canvasElement = pdfContainerRef.current?.querySelector('canvas');
      if (canvasElement && overlayRef.current) {
        // Get the PDF dimensions from the canvas
        const pdfWidth = canvasElement.width;
        const pdfHeight = canvasElement.height;
        
        pdfDimensionsRef.current = {
          width: pdfWidth,
          height: pdfHeight
        };
        
        // Get the canvas position within its container
        const canvasRect = canvasElement.getBoundingClientRect();
        const containerRect = pdfContainerRef.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
        
        // Calculate offsets to position overlay exactly over the canvas
        const offsetLeft = canvasRect.left - containerRect.left;
        
        // For vertical positioning, we need to account for any scrolling and centering
        // that might be happening in the PDF viewer container
        const offsetTop = canvasRect.top - containerRect.top;
        
        // Apply dimensions and position
        overlayRef.current.style.width = `${pdfWidth}px`;
        overlayRef.current.style.height = `${pdfHeight}px`;
        overlayRef.current.style.left = `${offsetLeft}px`;
        overlayRef.current.style.top = `${offsetTop}px`;
        
        // Add a clip path to ensure fields stay within the PDF
        overlayRef.current.style.clipPath = 'inset(0 0 0 0)';
        overlayRef.current.style.overflow = 'hidden';
        overlayRef.current.style.position = 'absolute';
        overlayRef.current.style.pointerEvents = 'auto';
        
        // Log dimensions for debugging
        console.log('Page Change - PDF Dimensions:', pdfWidth, pdfHeight);
        console.log('Page Change - Canvas Rect:', canvasRect.width, canvasRect.height);
        console.log('Page Change - Container Rect:', containerRect.width, containerRect.height);
        console.log('Page Change - Offsets:', offsetLeft, offsetTop);
      }
    }, 500); // Increased delay to ensure canvas is fully rendered
  }, []);
  
  // Handle field drag start
  const handleDragStart = useCallback((fieldType: string) => {
    setDraggedFieldType(fieldType as 'name' | 'text' | 'date' | 'signature');
  }, []);
  
  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  
  // Handle drop to create new field
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedFieldType || !overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Default field dimensions
    const fieldType = draggedFieldType as 'name' | 'text' | 'date' | 'signature' | 'checkbox';
    const fieldWidth = fieldType === 'checkbox' ? 25 : 150;
    const fieldHeight = fieldType === 'signature' ? 60 : (fieldType === 'checkbox' ? 25 : 30);
    
    // Constrain the position to keep the field within the overlay
    const constrainedX = Math.max(0, Math.min(x, pdfDimensionsRef.current.width - fieldWidth));
    const constrainedY = Math.max(0, Math.min(y, pdfDimensionsRef.current.height - fieldHeight));
    
    const newCounter = fieldCountersRef.current[fieldType] + 1;
    fieldCountersRef.current[fieldType] = newCounter;
    
    // Map field type to display name for labels
    const getFieldTypeLabel = (type: string) => {
      if (type === 'checkbox') return 'Cross-box';
      return type.charAt(0).toUpperCase() + type.slice(1);
    };
    
    const newField: FormField = {
      id: uuidv4(),
      type: fieldType,
      label: `${getFieldTypeLabel(fieldType)} ${newCounter}`,
      required: true,
      x: constrainedX,
      y: constrainedY,
      width: fieldWidth,
      height: fieldHeight,
      page: currentPage
    };
    
    // Update local state first
    setLocalFields(prev => [...prev, newField]);
    setDraggedFieldType(null);
    setSelectedFieldId(newField.id);
  }, [draggedFieldType, currentPage]);
  
  // Handle field mouse down for dragging
  const handleFieldMouseDown = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    setSelectedFieldId(fieldId);
    
    const fieldIndex = localFields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1 || !overlayRef.current) return;
    
    const field = localFields[fieldIndex];
    
    const rect = overlayRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left - field.x;
    const startY = e.clientY - rect.top - field.y;
    
    isDraggingRef.current = true;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const newX = e.clientX - rect.left - startX;
      const newY = e.clientY - rect.top - startY;
      
      // Constrain the field to stay within the overlay boundaries
      const constrainedX = Math.max(0, Math.min(newX, pdfDimensionsRef.current.width - field.width));
      const constrainedY = Math.max(0, Math.min(newY, pdfDimensionsRef.current.height - field.height));
      
      // Update the field's position visually without updating state
      const fieldElement = document.getElementById(`field-${fieldId}`);
      if (fieldElement) {
        fieldElement.style.left = `${constrainedX}px`;
        fieldElement.style.top = `${constrainedY}px`;
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      
      // Get the final position from the DOM element
      const fieldElement = document.getElementById(`field-${fieldId}`);
      if (!fieldElement) return;
      
      const finalX = parseInt(fieldElement.style.left, 10) || field.x;
      const finalY = parseInt(fieldElement.style.top, 10) || field.y;
      
      // Update local state
      setLocalFields(prev => {
        const newFields = [...prev];
        newFields[fieldIndex] = {
          ...newFields[fieldIndex],
          x: finalX,
          y: finalY
        };
        return newFields;
      });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [localFields]);
  
  // Handle field resize
  const handleFieldResize = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    
    const fieldIndex = localFields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1 || !overlayRef.current) return;
    
    const field = localFields[fieldIndex];
    
    const startWidth = field.width;
    const startHeight = field.height;
    const startX = e.clientX;
    const startY = e.clientY;
    
    isDraggingRef.current = true;
    
    const handleResize = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      // Calculate new dimensions
      const newWidth = Math.max(50, startWidth + (e.clientX - startX));
      const newHeight = Math.max(20, startHeight + (e.clientY - startY));
      
      // Constrain the width and height to keep the field within the overlay
      const constrainedWidth = Math.min(newWidth, pdfDimensionsRef.current.width - field.x);
      const constrainedHeight = Math.min(newHeight, pdfDimensionsRef.current.height - field.y);
      
      // Update the field's dimensions visually without updating state
      const fieldElement = document.getElementById(`field-${fieldId}`);
      if (fieldElement) {
        fieldElement.style.width = `${constrainedWidth}px`;
        fieldElement.style.height = `${constrainedHeight}px`;
      }
    };
    
    const stopResize = () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
      
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      
      // Get the final dimensions from the DOM element
      const fieldElement = document.getElementById(`field-${fieldId}`);
      if (!fieldElement) return;
      
      const finalWidth = parseInt(fieldElement.style.width, 10) || field.width;
      const finalHeight = parseInt(fieldElement.style.height, 10) || field.height;
      
      // Update local state
      setLocalFields(prev => {
        const newFields = [...prev];
        newFields[fieldIndex] = {
          ...newFields[fieldIndex],
          width: finalWidth,
          height: finalHeight
        };
        return newFields;
      });
    };
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  }, [localFields]);
  
  // Delete a field
  const handleDeleteField = useCallback((fieldId: string) => {
    setLocalFields(prev => prev.filter(field => field.id !== fieldId));
    
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  }, [selectedFieldId]);
  
  // Start editing field name
  const handleStartEditingField = useCallback((field: FormField) => {
    setEditingFieldId(field.id);
    setEditingName(field.label);
  }, []);
  
  // Save field name
  const handleSaveFieldName = useCallback(() => {
    if (!editingFieldId) return;
    
    setLocalFields(prev => prev.map(f => 
      f.id === editingFieldId 
        ? { ...f, label: editingName.trim() || f.label }
        : f
    ));
    
    setEditingFieldId(null);
    setEditingName('');
  }, [editingFieldId, editingName]);
  
  // Get current page fields
  const getCurrentPageFields = useCallback(() => {
    return localFields.filter(f => f.page === currentPage);
  }, [localFields, currentPage]);
  
  // Save all fields
  const handleSaveAllFields = useCallback(async () => {
    if (localFields.length === 0) {
      // If no fields, just go to next step
      if (goToNextStep) goToNextStep();
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      console.log('Attempting to save fields. Form ID:', formId);
      console.log('Fields to save:', localFields);
      
      // First, try to fetch the form to make sure it exists
      const formCheckResponse = await fetch(`/api/admin/forms/${formId}`);
      const formCheckData = await formCheckResponse.json();
      
      if (!formCheckResponse.ok) {
        console.error('Form check failed:', formCheckData);
        throw new Error(`Form check failed: ${formCheckData.error || 'Unknown error'}`);
      }
      
      console.log('Form exists:', formCheckData);
      
      // Check database schema first
      try {
        const schemaCheckResponse = await fetch('/api/debug/schema');
        if (schemaCheckResponse.ok) {
          const schemaData = await schemaCheckResponse.json();
          console.log('Database schema check:', schemaData);
          
          // Check if we have the form_fields table with required columns
          if (schemaData.error) {
            console.warn('Schema check returned an error, but continuing anyway:', schemaData.error);
          }
        } else {
          console.warn('Schema check failed, but continuing anyway');
        }
      } catch (schemaError) {
        console.warn('Schema check error, but continuing anyway:', schemaError);
      }
      
      // Prepare the fields data - convert from scaled coordinates to actual PDF coordinates
      const fieldsData = localFields.map(field => {
        const { x, y, width, height } = displayToActualCoordinates(field.x, field.y, field.width, field.height);
        return {
          type: field.type,
          label: field.label,
          required: field.required,
          x: x,
          y: y,
          width,
          height,
          page: field.page || 1
        };
      });
      
      console.log('Original field data (scaled):', localFields.map(f => ({
        id: f.id,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height
      })));
      console.log('Converted field data (actual PDF coordinates):', fieldsData);
      
      // Track overall success
      let saveSuccess = false;
      const errorDetails = null;
      
      // Try the batch API first
      try {
        // Batch save all fields
        const response = await fetch(`/api/admin/forms/${formId}/fields/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields: fieldsData }),
        });
        
        // Log the raw response for debugging
        console.log('Batch API - Raw response status:', response.status);
        
        let data;
        try {
          const rawText = await response.text();
          
          // Try to parse as JSON if possible
          try {
            data = JSON.parse(rawText);
            console.log('Batch API - Parsed response data:', data);
          } catch {
            console.warn('Failed to parse response as JSON, but continuing with fallback method');
            data = { error: 'Invalid JSON response' };
          }
        } catch {
          console.warn('Failed to get response text, but continuing with fallback method');
          data = { error: 'Could not read response' };
        }
        
        if (response.ok) {
          console.log('Batch API - Fields saved successfully');
          saveSuccess = true;
        } else {
          // Only log as warning since we'll try the fallback
          console.warn('Batch API failed, will try individual saves');
        }
      } catch (batchError: unknown) {
        console.warn('Batch API error, will try individual saves:', batchError);
      }
      
      // If batch failed, try individual saves as fallback
      if (!saveSuccess) {
        console.log('Trying individual field saves as fallback');
        
        // First, try to delete existing fields
        try {
          const deleteResponse = await fetch(`/api/admin/forms/${formId}/fields/delete-all`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!deleteResponse.ok) {
            console.warn('Failed to delete existing fields, but continuing with save attempt');
          }
        } catch {
          console.warn('Error deleting fields, but continuing with save attempt');
        }
        
        // Then save each field individually
        let savedCount = 0;
        const individualErrors = [];
        
        for (const fieldData of fieldsData) {
          try {
            const fieldResponse = await fetch(`/api/admin/forms/${formId}/fields`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(fieldData),
            });
            
            if (fieldResponse.ok) {
              savedCount++;
            } else {
              try {
                const errorData = await fieldResponse.json();
                individualErrors.push(errorData.error || 'Unknown error');
              } catch {
                individualErrors.push('Failed to parse error response');
              }
            }
          } catch (fieldError: unknown) {
            individualErrors.push((fieldError as Error).message || 'Unknown error');
          }
        }
        
        if (savedCount === 0) {
          throw new Error('Failed to save any fields. Please try again.');
        } else if (savedCount < fieldsData.length) {
          console.warn(`Only saved ${savedCount} out of ${fieldsData.length} fields`);
          // Continue with partial success
          saveSuccess = true;
        } else {
          console.log(`Successfully saved all ${savedCount} fields individually`);
          saveSuccess = true;
        }
      }
      
      // Update form data with saved fields (convert to actual coordinates for storage)
      const actualCoordinateFields = localFields.map(field => {
        const { x, y, width, height } = displayToActualCoordinates(field.x, field.y, field.width, field.height);
        return {
          ...field,
          x,
          y,
          width,
          height
        };
      });
      
      console.log('Updating parent form data with actual coordinates:', actualCoordinateFields);
      updateFormData({ fields: actualCoordinateFields });
      
      // Go to next step if provided
      if (goToNextStep) goToNextStep();
      
    } catch (error: unknown) {
      console.error('Error saving fields:', error);
      setError((error as Error).message || 'An error occurred while saving the fields');
    } finally {
      setSaving(false);
    }
  }, [localFields, formId, goToNextStep, updateFormData]);
  

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Place Form Fields</h2>
        <p className="text-gray-600">
          Position input fields on your PDF template. These fields will be filled out by students.
        </p>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 flex items-start rounded-md bg-red-50 p-4 text-red-800">
          <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium">Error</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-1 gap-6">
        {/* Field Types Sidebar */}
        <div className="w-64 bg-white shadow rounded-lg border border-gray-200 p-4 h-fit">
          <h3 className="text-lg font-medium mb-4">Form Fields</h3>
          
          {/* Field Types */}
          <div className="space-y-2">
            {fieldTypes.map(({ type, icon: Icon, label, color }) => (
              <div
                key={type}
                draggable
                onDragStart={() => handleDragStart(type)}
                className={`${color} p-3 rounded-lg border-2 border-dashed cursor-grab active:cursor-grabbing hover:shadow-md transition-all`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto bg-white bg-opacity-50 px-2 py-1 rounded text-xs">
                    {fieldCounts[type as keyof typeof fieldCounts]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Field List */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-600 mb-3">
              Fields on Page {currentPage} ({getCurrentPageFields().length})
            </h3>
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {getCurrentPageFields().map((field) => {
                const fieldInfo = fieldTypes.find(ft => ft.type === field.type);
                const Icon = fieldInfo?.icon || Type;
                
                return (
                  <div
                    key={field.id}
                    className={`p-2 rounded-lg border transition-all ${
                      selectedFieldId === field.id 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      {editingFieldId === field.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={handleSaveFieldName}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveFieldName()}
                          className="flex-1 text-sm px-1 py-0.5 border border-gray-300 rounded"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="flex-1 text-sm cursor-pointer"
                          onClick={() => setSelectedFieldId(field.id)}
                        >
                          {field.label}
                        </span>
                      )}
                      <button
                        onClick={() => handleStartEditingField(field)}
                        className="p-2 text-gray-400 hover:text-green-500 transition-colors rounded"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className="flex-1">
          <div 
            ref={pdfContainerRef}
            className="relative overflow-auto rounded-lg border border-gray-300 bg-gray-100"
            style={{ height: '600px' }}
          >
            {formData.templateUrl ? (
              <div className="relative">
                {/* Use our custom PDF viewer with proxied URL */}
                <PDFViewer 
                  url={getProxiedPdfUrl(formId)}
                  className="w-full"
                  onLoad={handlePdfLoad}
                  onError={handlePdfError}
                  onPageChange={handlePageChange}
                />
                
                {/* Separate overlay for field placement */}
                {pdfLoaded && (
                  <>
                    {/* Invisible helper div for positioning - no visual impact */}
                    <div 
                      className="absolute pointer-events-none opacity-0"
                      style={{ 
                        width: pdfDimensionsRef.current.width, 
                        height: pdfDimensionsRef.current.height,
                        left: overlayRef.current?.style.left || '0px',
                        top: overlayRef.current?.style.top || '0px',
                        zIndex: 100
                      }}
                    />
                    
                    <div 
                      ref={overlayRef}
                      className="absolute pointer-events-auto"
                      style={{ 
                        width: pdfDimensionsRef.current.width, 
                        height: pdfDimensionsRef.current.height,
                        overflow: 'hidden',
                        position: 'absolute',
                        clipPath: 'inset(0 0 0 0)'
                      }}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => setSelectedFieldId(null)}
                    >
                    {/* Field overlays */}
                    {getCurrentPageFields().map((field) => {
                      const fieldInfo = fieldTypes.find(ft => ft.type === field.type);
                      const Icon = fieldInfo?.icon || Type;
                      
                      return (
                        <div
                          key={field.id}
                          id={`field-${field.id}`}
                          className={`absolute cursor-move flex items-center gap-1 text-xs group ${
                            field.type === 'checkbox' 
                              ? `justify-center ${
                                  selectedFieldId === field.id 
                                    ? 'ring-2 ring-green-400 ring-opacity-75 rounded' 
                                    : ''
                                }` 
                              : `border-2 px-2 ${
                                  selectedFieldId === field.id 
                                    ? 'border-green-400 bg-green-50 bg-opacity-75' 
                                    : 'border-gray-400 bg-white bg-opacity-75'
                                }`
                          }`}
                          style={{
                            left: field.x,
                            top: field.y,
                            width: field.width,
                            height: field.height,
                          }}
                          onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                        >
                          {field.type === 'checkbox' ? (
                            <X className="w-5 h-5 text-black" />
                          ) : (
                            <>
                              <Icon className="w-3 h-3 text-gray-500" />
                              <span className="truncate flex-1">{field.label}</span>
                            </>
                          )}
                          
                          {/* Resize Handle - only show for non-checkbox fields */}
                          {field.type !== 'checkbox' && (
                            <div
                              className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => handleFieldResize(e, field.id)}
                            />
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">No PDF template uploaded</p>
              </div>
            )}
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={handleSaveAllFields}
              disabled={saving}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {saving ? 'Saving...' : (
                <>
                  <Check className="mr-1" />
                  Save and Continue
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 