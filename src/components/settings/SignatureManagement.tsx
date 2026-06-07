'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import SignatureUploadModal from './SignatureUploadModal';
import CustomModal from '../ui/CustomModal';

interface SignatureManagementProps {
  userId: string;
}

interface UserSignatures {
  student_signatures: string[];
  parent_signatures: string[];
}

export default function SignatureManagement({ userId }: SignatureManagementProps) {
  const [signatures, setSignatures] = useState<UserSignatures>({
    student_signatures: [],
    parent_signatures: []
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'student' | 'parent'>('student');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Custom modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<'student' | 'parent'>('student');
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModal, setResultModal] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (userId) {
      fetchSignatures();
    }
  }, [userId]); // Only re-run when userId changes

  const fetchSignatures = async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      // Fetch signatures via API route
      const response = await fetch('/api/student/signatures');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch signatures');
      }
      
      const data = await response.json();
      
      setSignatures({
        student_signatures: data.student_signatures || [],
        parent_signatures: data.parent_signatures || []
      });
    } catch (err: any) {
      console.error('Error fetching signatures:', err);
      setMessage({ type: 'error', text: `Failed to load signatures: ${err.message}` });
      // Initialize empty arrays as fallback
      setSignatures({
        student_signatures: [],
        parent_signatures: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type: 'student' | 'parent') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleSaveSignatures = async (newSignatures: string[]) => {
    try {
      // Save signatures via API route
      const response = await fetch('/api/student/signatures', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature_type: modalType,
          signatures: newSignatures
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save signatures');
      }

      // Update local state
      setSignatures(prev => ({
        ...prev,
        [modalType === 'student' ? 'student_signatures' : 'parent_signatures']: newSignatures
      }));

      setMessage({ 
        type: 'success', 
        text: `${modalType === 'student' ? 'Student' : 'Parent'} signatures saved successfully` 
      });
      
      setIsModalOpen(false);
      
      // Refresh signatures from database to get the latest data
      await fetchSignatures();
    } catch (error: any) {
      console.error('Error saving signatures:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save signatures' });
      // Re-throw the error so the modal can handle it
      throw error;
    }
  };

  const handleDeleteSignatures = (type: 'student' | 'parent') => {
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSignatures = async () => {
    try {
      setShowDeleteConfirm(false);
      
      // Use the dedicated delete API endpoint
      const response = await fetch('/api/signatures/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature_type: deleteType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete signatures');
      }

      const result = await response.json();
      console.log('Delete result:', result);

      // Update local state
      setSignatures(prev => ({
        ...prev,
        [deleteType === 'student' ? 'student_signatures' : 'parent_signatures']: []
      }));

      // Refresh signatures from database to ensure consistency
      fetchSignatures();

      setResultModal({
        type: 'success',
        title: 'Signatures Deleted',
        message: `${deleteType === 'student' ? 'Student' : 'Parent'} signatures have been deleted successfully. ${result.deleted_count} files removed.`
      });
      setShowResultModal(true);
      
    } catch (error: any) {
      console.error('Error deleting signatures:', error);
      setResultModal({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Failed to delete signatures. Please try again.'
      });
      setShowResultModal(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-500 mb-4"></div>
        <p className="text-xs sm:text-sm text-gray-500">Loading signatures...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {message && (
        <div className={`p-3 sm:p-4 rounded-md text-xs sm:text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Student Signatures */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Student Signatures</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Upload your personal signatures for form completion
            </p>
          </div>
        </div>

        <SignatureContainer
          signatures={signatures.student_signatures}
          onAddSignatures={() => handleOpenModal('student')}
          onDeleteSignatures={() => handleDeleteSignatures('student')}
          type="student"
        />
      </div>

      {/* Parent Signatures */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Parent Signatures</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Upload parent/guardian signatures for form completion
            </p>
          </div>
        </div>

        <SignatureContainer
          signatures={signatures.parent_signatures}
          onAddSignatures={() => handleOpenModal('parent')}
          onDeleteSignatures={() => handleDeleteSignatures('parent')}
          type="parent"
        />
      </div>

      {/* Signature Upload Modal */}
      {isModalOpen && (
        <SignatureUploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSignatures}
          type={modalType}
          existingSignatures={modalType === 'student' ? signatures.student_signatures : signatures.parent_signatures}
          userId={userId}
        />
      )}

      {/* Delete Confirmation Modal */}
      <CustomModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Signatures"
        message={`Are you sure you want to delete all ${deleteType} signatures? This action cannot be undone.`}
        type="warning"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteSignatures}
        showCancel={true}
      />

      {/* Result Modal */}
      {resultModal && (
        <CustomModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          title={resultModal.title}
          message={resultModal.message}
          type={resultModal.type}
          confirmText="OK"
        />
      )}
    </div>
  );
}

interface SignatureContainerProps {
  signatures: string[];
  onAddSignatures: () => void;
  onDeleteSignatures: () => void;
  type: 'student' | 'parent';
}

function SignatureContainer({ signatures, onAddSignatures, onDeleteSignatures, type }: SignatureContainerProps) {
  if (signatures.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors cursor-pointer"
        onClick={onAddSignatures}
      >
        <div className="p-3 sm:p-4 rounded-full bg-green-50 border border-green-100">
          <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
        </div>
        <p className="mt-4 text-base sm:text-lg font-medium text-gray-900">Add {type} signatures</p>
        <p className="mt-1 text-xs sm:text-sm text-gray-600">
          Click to upload 7 signature samples for verification
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-gray-600">
          {signatures.length} signature{signatures.length !== 1 ? 's' : ''} uploaded
        </p>
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={onAddSignatures}
            className="p-1.5 sm:p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
            title="Edit Signatures"
          >
            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={onDeleteSignatures}
            className="p-1.5 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            title="Delete All Signatures"
          >
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {signatures.map((signature, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-2 sm:p-3 bg-gray-50">
            <div className="aspect-w-3 aspect-h-2 mb-1.5 sm:mb-2">
              <img
                src={signature}
                alt={`${type} signature ${index + 1}`}
                className="w-full h-16 sm:h-20 object-contain bg-white rounded border"
              />
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 text-center">
              Signature {index + 1}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
