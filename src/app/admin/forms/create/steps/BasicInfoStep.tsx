import { FormEvent } from 'react';
import { Info } from 'lucide-react';
import FormAssignmentSelector from '@/components/FormAssignmentSelector';

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

type BasicInfoStepProps = {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
};

export default function BasicInfoStep({ formData, updateFormData }: BasicInfoStepProps) {
  const handleChange = (e: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.currentTarget;
    updateFormData({ [name]: value });
  };

  // Format datetime for datetime-local inputs
  const formatDateTimeLocal = (dateString: string) => {
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
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Basic Information</h2>
        <p className="text-gray-600">Enter the basic details for your form.</p>
      </div>
      
      <div className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Form Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="Enter form title"
          />
        </div>
        
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="Enter form description"
          />
        </div>
        
        {/* Availability Period */}
        <div>
          <div className="mb-2 flex items-center">
            <h3 className="text-sm font-medium text-gray-700">Availability Period</h3>
            <div className="ml-2 rounded-full bg-green-100 p-1 text-green-500">
              <Info size={14} />
            </div>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Set when this form will be available for students to access. Leave blank for no restrictions.
          </p>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Available From */}
            <div>
              <label htmlFor="availableFrom" className="block text-sm font-medium text-gray-700">
                Available From <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="availableFrom"
                name="availableFrom"
                value={formatDateTimeLocal(formData.availableFrom)}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
            </div>
            
            {/* Available Until */}
            <div>
              <label htmlFor="availableUntil" className="block text-sm font-medium text-gray-700">
                Available Until <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="availableUntil"
                name="availableUntil"
                value={formatDateTimeLocal(formData.availableUntil)}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
            </div>
          </div>
        </div>
        
        {/* Form Assignment */}
        <div>
          <div className="mb-2 flex items-center">
            <h3 className="text-sm font-medium text-gray-700">Form Assignment</h3>
            <div className="ml-2 rounded-full bg-green-100 p-1 text-green-500">
              <Info size={14} />
            </div>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Specify which college departments and courses can access this form. Leave unassigned to make it available to all students.
          </p>
          
          <FormAssignmentSelector
            assignedCollegeDepartment={formData.assignedCollegeDepartment}
            assignedCourses={formData.assignedCourses}
            assignedStudents={formData.assignedStudents}
            onDepartmentChange={(department) => updateFormData({ assignedCollegeDepartment: department })}
            onCoursesChange={(courses) => updateFormData({ assignedCourses: courses })}
            onStudentsChange={(students) => updateFormData({ assignedStudents: students })}
          />
        </div>
        
        {/* Form Validation Tips */}
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Tips</h3>
              <div className="mt-2 text-sm text-green-700">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Give your form a clear, descriptive title</li>
                  <li>Include relevant details in the description</li>
                  <li>Set availability dates if the form should only be accessible for a specific period</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 