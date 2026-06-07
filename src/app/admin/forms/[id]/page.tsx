'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Link as LinkIcon, Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import FormAssignmentSelector from '@/components/FormAssignmentSelector';

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

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  template_url: string | null;
  template_filename: string | null;
  available_from: string | null;
  available_until: string | null;
  assigned_college_department: string | null;
  assigned_courses: string[] | null;
  assigned_students: string[] | null;
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

type AccessLink = {
  id: string;
  form_id: string;
  access_token: string;
  created_by: string;
  expires_at: string | null;
  created_at: string;
  description: string | null;
};

export default function FormEditor({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params object using React.use()
  const unwrappedParams = use(params);
  const formId = unwrappedParams.id;
  
  const [form, setForm] = useState<Form | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [assignedCollegeDepartment, setAssignedCollegeDepartment] = useState('');
  const [assignedCourses, setAssignedCourses] = useState<string[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accessLinks, setAccessLinks] = useState<AccessLink[]>([]);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [publishLoading, setPublishLoading] = useState(false);
  
  const router = useRouter();

  // Function to load assigned students details
  const loadAssignedStudents = async (studentIds: string[]) => {
    try {
      const response = await fetch(`/api/admin/students/search?ids=${studentIds.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        setAssignedStudents(data.students || []);
      } else {
        console.error('Failed to load assigned students');
        setAssignedStudents([]);
      }
    } catch (error) {
      console.error('Error loading assigned students:', error);
      setAssignedStudents([]);
    }
  };

  // Function to determine form status automatically
  const getFormStatus = () => {
    if (!form) return 'draft';
    
    // Return the actual database status directly
    // The status should be automatically updated to 'completed' when available_until passes
    if (form.status === 'completed') {
      return 'completed';
    }
    
    // Check if form is published and has required components
    if (form.status === 'published' || form.status === 'active') {
      return 'published';
    }
    
    // Check if form submissions are disabled
    if (form.status === 'inactive') {
      return 'inactive';
    }
    
    // Check if form was archived
    if (form.status === 'archived') {
      return 'unpublished';
    }
    
    // Default to draft (includes actual draft status)
    return 'draft';
  };

  // Function to get status color classes
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-orange-100 text-orange-800';
      case 'unpublished':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  useEffect(() => {
    fetchFormDetails();
  }, [formId]);
  
  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/forms/${formId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch form details');
      }
      
      const data = await response.json();
      
      // Check if form should be auto-completed based on available_until
      // Use current time for comparison
      const now = new Date();
      const availableUntilDate = data.form.available_until ? new Date(data.form.available_until) : null;
      
      if (availableUntilDate && 
          now > availableUntilDate && 
          data.form.status === 'published' &&
          !['completed', 'archived'].includes(data.form.status)) {
        // Automatically update form to completed status
        try {
          const updateResponse = await fetch(`/api/admin/forms/${formId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'completed'
            }),
          });
          
          if (updateResponse.ok) {
            const updatedData = await updateResponse.json();
            data.form = updatedData.form;
          }
        } catch (updateError) {
          console.error('Failed to auto-complete expired form:', updateError);
        }
      }
      
      setForm(data.form);
      setTitle(data.form.title || '');
      setDescription(data.form.description || '');
      setStatus(data.form.status || 'draft');
      // Format datetime for datetime-local inputs
      const formatDateTimeLocal = (dateString: string | null) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          
          // Format as YYYY-MM-DDTHH:MM for datetime-local input using local time
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
          return '';
        }
      };
      
      setAvailableFrom(formatDateTimeLocal(data.form.available_from));
      setAvailableUntil(formatDateTimeLocal(data.form.available_until));
      setAssignedCollegeDepartment(data.form.assigned_college_department || '');
      setAssignedCourses(data.form.assigned_courses || []);
      setAccessLinks(data.accessLinks || []);
      setSubmissionCount(data.submissionCount || 0);
      
      // Load assigned students if they exist
      if (data.form.assigned_students && data.form.assigned_students.length > 0) {
        await loadAssignedStudents(data.form.assigned_students);
      } else {
        setAssignedStudents([]);
      }
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while fetching form details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveForm = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          status,
          available_from: availableFrom || null,
          available_until: availableUntil || null,
          assigned_college_department: assignedCollegeDepartment || null,
          assigned_courses: assignedCourses.length > 0 ? assignedCourses : null,
          assigned_students: assignedStudents.length > 0 ? assignedStudents.map(s => s.id) : null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update form');
      }
      
      const data = await response.json();
      setForm(prevForm => prevForm ? { ...prevForm, ...data.form } : data.form);
      setSuccess('Form saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while saving the form');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishForm = async () => {
    try {
      setPublishLoading(true);
      setError(null);
      
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
      
      const data = await response.json();
      setForm(data.form);
      setSuccess('Form published successfully');
      
      // Refresh form details
      fetchFormDetails();
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while publishing the form');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDisableSubmissions = async () => {
    try {
      setPublishLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/forms/${formId}/unpublish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disable submissions');
      }
      
      const data = await response.json();
      setForm(data.form);
      setSuccess('Form submissions disabled successfully');
      
      // Refresh form details to get the latest status
      fetchFormDetails();
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while disabling submissions');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleEnableSubmissions = async () => {
    try {
      setPublishLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active'
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to enable submissions');
      }
      
      const data = await response.json();
      setForm(data.form);
      setSuccess('Form submissions enabled successfully');
      
      // Refresh form details to get the latest status
      fetchFormDetails();
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while enabling submissions');
    } finally {
      setPublishLoading(false);
    }
  };
  
  
  
  const copyLinkToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    setSuccess('Link copied to clipboard');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };
  
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-gray-500">Loading form details...</p>
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
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Form</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleSaveForm}
            disabled={saving}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Save className="mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          {form && (form.status === 'published' || form.status === 'active') && (
            <button
              onClick={handleDisableSubmissions}
              disabled={publishLoading}
              className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <LinkIcon className="mr-2" />
              {publishLoading ? 'Disabling...' : 'Disable Submissions'}
            </button>
          )}
          {form && form.status === 'inactive' && (
            <button
              onClick={handleEnableSubmissions}
              disabled={publishLoading}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <LinkIcon className="mr-2" />
              {publishLoading ? 'Enabling...' : 'Enable Submissions'}
            </button>
          )}
        </div>
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
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 space-y-6">
          {/* Form Details */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Form Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  placeholder="Form Title"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  placeholder="Form Description"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(getFormStatus())}`}>
                    {getFormStatus()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Status is automatically determined based on form completion and availability dates.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="availableFrom" className="block text-sm font-medium text-gray-700">
                    Available From
                  </label>
                  <input
                    type="datetime-local"
                    id="availableFrom"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="availableUntil" className="block text-sm font-medium text-gray-700">
                    Available Until
                  </label>
                  <input
                    type="datetime-local"
                    id="availableUntil"
                    value={availableUntil}
                    onChange={(e) => setAvailableUntil(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  />
                </div>
              </div>
              
              {/* Form Assignment Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="mb-4 text-md font-medium text-gray-700">Form Assignment</h3>
                <FormAssignmentSelector
                  assignedCollegeDepartment={assignedCollegeDepartment}
                  assignedCourses={assignedCourses}
                  assignedStudents={assignedStudents}
                  onDepartmentChange={setAssignedCollegeDepartment}
                  onCoursesChange={setAssignedCourses}
                  onStudentsChange={setAssignedStudents}
                />
              </div>
            </div>
          </div>
          
          {/* PDF Template & Form Fields */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">PDF Template & Form Fields</h2>
              {form.template_url && form.form_fields && form.form_fields.length > 0 && (
                <Link
                  href={`/admin/forms/${formId}/preview`}
                  className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Eye className="mr-2" />
                  View Fields on PDF
                </Link>
              )}
            </div>
            
            {/* PDF Template Section */}
            <div className="mb-6">
              <h3 className="mb-3 text-md font-medium text-gray-700">PDF Template</h3>
              {form.template_url ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 p-4">
                    <div className="flex items-center">
                      <svg className="mr-2 h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium">{form.template_filename || 'Template.pdf'}</p>
                        <p className="text-sm text-gray-500">Uploaded on {new Date(form.updated_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500">No template uploaded yet.</p>
                </div>
              )}
            </div>

            {/* Form Fields Section */}
            <div>
              <div className="mb-3">
                <h3 className="text-md font-medium text-gray-700">Form Fields</h3>
              </div>
              {form.form_fields && form.form_fields.length > 0 ? (
                <div className="space-y-2">
                  {form.form_fields.map((field) => (
                    <div
                      key={field.id}
                      className="rounded-md border border-gray-200 bg-gray-50 p-3"
                    >
                      <div>
                        <p className="font-medium">{field.label}</p>
                        <p className="text-sm text-gray-500">
                          Type: {field.field_type} | Required: {field.required ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No fields added yet.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Form Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Form Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Created By</p>
                <p>{form.users?.first_name && form.users?.last_name 
                  ? `${form.users.first_name} ${form.users.last_name}` 
                  : 'Unknown User'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created At</p>
                <p>{new Date(form.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p>{new Date(form.updated_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Submissions</p>
                <p>{submissionCount}</p>
              </div>
            </div>
          </div>
          
          {/* Access Links */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Access Links</h2>
              <Link
                href={`/admin/forms/${formId}/generate-link`}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
              >
                <Plus className="mr-1" />
                Generate Link
              </Link>
            </div>
            {accessLinks.length > 0 ? (
              <div className="space-y-3">
                {accessLinks.map((link) => {
                  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://plp-document-authentication-web.vercel.app';
                  const accessUrl = `${baseUrl}/forms/access/${link.access_token}`;
                  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                  
                  return (
                    <div
                      key={link.id}
                      className={`rounded-md border p-3 ${
                        isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-medium">
                          {link.description || 'Access Link'}
                          {isExpired && (
                            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                              Expired
                            </span>
                          )}
                        </p>
                        <button
                          onClick={() => copyLinkToClipboard(accessUrl)}
                          className="rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="mb-1 truncate text-sm text-gray-600">{accessUrl}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                        {link.expires_at && (
                          <span>Expires: {new Date(link.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No access links generated yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 