'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, ArrowLeft } from 'lucide-react';

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

export default function EditField({ params }: { params: { id: string; fieldId: string } }) {
  const [, setField] = useState<FormField | null>(null);
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [required, setRequired] = useState(false);
  const [xPosition, setXPosition] = useState<number | null>(null);
  const [yPosition, setYPosition] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [options, setOptions] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isNewField, setIsNewField] = useState(false);
  
  const router = useRouter();
  
  useEffect(() => {
    // Check if this is a new field (special fieldId 'new')
    if (params.fieldId === 'new') {
      setIsNewField(true);
      setLoading(false);
      return;
    }
    
    fetchFieldDetails();
  }, [params.id, params.fieldId]);
  
  const fetchFieldDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/forms/${params.id}/fields/${params.fieldId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch field details');
      }
      
      const data = await response.json();
      setField(data.field);
      setLabel(data.field.label || '');
      setFieldType(data.field.field_type || 'text');
      setRequired(data.field.required || false);
      setXPosition(data.field.x_position);
      setYPosition(data.field.y_position);
      setWidth(data.field.width);
      setHeight(data.field.height);
      setOptions(data.field.options ? JSON.stringify(data.field.options) : '');
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while fetching field details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Parse options if provided
      let parsedOptions = null;
      if (options && (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox')) {
        try {
          parsedOptions = JSON.parse(options);
        } catch {
          setError('Invalid options format. Please use valid JSON.');
          setSaving(false);
          return;
        }
      }
      
      const fieldData = {
        label,
        field_type: fieldType,
        required,
        x_position: xPosition,
        y_position: yPosition,
        width,
        height,
        options: parsedOptions,
      };
      
      let response;
      
      if (isNewField) {
        // Create new field
        response = await fetch(`/api/admin/forms/${params.id}/fields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fieldData),
        });
      } else {
        // Update existing field
        response = await fetch(`/api/admin/forms/${params.id}/fields/${params.fieldId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fieldData),
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to ${isNewField ? 'create' : 'update'} field`);
      }
      
      await response.json();
      setSuccess(`Field ${isNewField ? 'created' : 'updated'} successfully`);
      
      // Redirect back to form editor after a short delay
      setTimeout(() => {
        router.push(`/admin/forms/${params.id}`);
      }, 1500);
    } catch (error: unknown) {
      setError((error as Error).message || `An error occurred while ${isNewField ? 'creating' : 'updating'} the field`);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading && !isNewField) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-gray-500">Loading field details...</p>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link
            href={`/admin/forms/${params.id}`}
            className="mr-4 inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-1" />
            Back to Form
          </Link>
          <h1 className="text-2xl font-bold">{isNewField ? 'Add Field' : 'Edit Field'}</h1>
        </div>
        <button
          type="submit"
          form="field-form"
          disabled={saving}
          className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Save className="mr-2" />
          {saving ? 'Saving...' : 'Save Field'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800">
          <p>{success}</p>
        </div>
      )}
      
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <form id="field-form" onSubmit={handleSaveField} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                Label *
              </label>
              <input
                type="text"
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder="Field Label"
              />
            </div>
            
            <div>
              <label htmlFor="fieldType" className="block text-sm font-medium text-gray-700">
                Field Type *
              </label>
              <select
                id="fieldType"
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              >
                <option value="text">Text</option>
                <option value="textarea">Text Area</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="date">Date</option>
                <option value="select">Select</option>
                <option value="radio">Radio Buttons</option>
                <option value="checkbox">Checkboxes</option>
                <option value="signature">Signature</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="required" className="ml-2 block text-sm text-gray-700">
              Required Field
            </label>
          </div>
          
          {(fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') && (
            <div>
              <label htmlFor="options" className="block text-sm font-medium text-gray-700">
                Options (JSON Array)
              </label>
              <textarea
                id="options"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder='["Option 1", "Option 2", "Option 3"]'
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter options as a JSON array of strings. Example: [&quot;Option 1&quot;, &quot;Option 2&quot;, &quot;Option 3&quot;]
              </p>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-medium">Field Positioning</h3>
            <p className="mb-4 text-sm text-gray-600">
              These settings control the position and size of the field on the PDF template.
              Leave blank to use automatic positioning.
            </p>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label htmlFor="xPosition" className="block text-sm font-medium text-gray-700">
                  X Position
                </label>
                <input
                  type="number"
                  id="xPosition"
                  value={xPosition === null ? '' : xPosition}
                  onChange={(e) => setXPosition(e.target.value ? parseFloat(e.target.value) : null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  placeholder="X Position"
                />
              </div>
              
              <div>
                <label htmlFor="yPosition" className="block text-sm font-medium text-gray-700">
                  Y Position
                </label>
                <input
                  type="number"
                  id="yPosition"
                  value={yPosition === null ? '' : yPosition}
                  onChange={(e) => setYPosition(e.target.value ? parseFloat(e.target.value) : null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  placeholder="Y Position"
                />
              </div>
              
              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-700">
                  Width
                </label>
                <input
                  type="number"
                  id="width"
                  value={width === null ? '' : width}
                  onChange={(e) => setWidth(e.target.value ? parseFloat(e.target.value) : null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  placeholder="Width"
                />
              </div>
              
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700">
                  Height
                </label>
                <input
                  type="number"
                  id="height"
                  value={height === null ? '' : height}
                  onChange={(e) => setHeight(e.target.value ? parseFloat(e.target.value) : null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  placeholder="Height"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 