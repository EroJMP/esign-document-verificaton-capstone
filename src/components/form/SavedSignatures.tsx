'use client';

import { useState, useEffect } from 'react';
import { Check, User, Users } from 'lucide-react';

interface SavedSignaturesProps {
  onSelect: (signature: string) => void;
  onClose: () => void;
}

interface UserSignatures {
  student_signatures: string[];
  parent_signatures: string[];
}

const SavedSignatures: React.FC<SavedSignaturesProps> = ({ onSelect, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'student' | 'parent'>('student');
  const [signatures, setSignatures] = useState<UserSignatures>({
    student_signatures: [],
    parent_signatures: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedSignatures();
  }, []);

  const fetchSavedSignatures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch signatures via API route
      const response = await fetch('/api/student/signatures');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load saved signatures');
      }
      
      const data = await response.json();
      
      setSignatures({
        student_signatures: data.student_signatures || [],
        parent_signatures: data.parent_signatures || []
      });
    } catch (err: any) {
      console.error('Error fetching signatures:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureSelect = (signature: string) => {
    setSelectedSignature(signature);
  };

  const handleUseSignature = () => {
    if (selectedSignature) {
      onSelect(selectedSignature);
      onClose();
    }
  };

  const currentSignatures = activeSubTab === 'student' 
    ? signatures.student_signatures 
    : signatures.parent_signatures;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-3 text-gray-600">Loading saved signatures...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">⚠️ {error}</div>
        <button
          onClick={fetchSavedSignatures}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tabs for Student/Parent */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex" aria-label="Signature Types">
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
              activeSubTab === 'student'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveSubTab('student')}
          >
            <User className="mr-2" />
            Student Signatures
          </button>
          <button
            className={`ml-6 py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
              activeSubTab === 'parent'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveSubTab('parent')}
          >
            <Users className="mr-2" />
            Parent Signatures
          </button>
        </nav>
      </div>

      {/* Signature Grid */}
      <div className="max-h-64 overflow-y-auto">
        {currentSignatures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">📝</div>
            <p className="text-sm">No {activeSubTab} signatures saved yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Go to Settings → Signature Management to add verified signatures
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {currentSignatures.map((signature, index) => (
              <div
                key={index}
                className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all ${
                  selectedSignature === signature
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSignatureSelect(signature)}
              >
                <div className="aspect-w-3 aspect-h-2 mb-2">
                  <img
                    src={signature}
                    alt={`${activeSubTab} signature ${index + 1}`}
                    className="w-full h-16 object-contain bg-white rounded border"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Signature {index + 1}
                </p>
                
                {/* Selection indicator */}
                {selectedSignature === signature && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                    <Check size={12} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {currentSignatures.length > 0 && (
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleUseSignature}
            disabled={!selectedSignature}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              selectedSignature 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <Check className="mr-2" />
            Use Selected Signature
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedSignatures;
