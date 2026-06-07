'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Upload, Edit, Trash2, Check, AlertTriangle, Loader } from 'lucide-react';
import CustomModal from '../ui/CustomModal';

interface SignatureUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatures: string[]) => void;
  type: 'student' | 'parent';
  existingSignatures: string[];
  userId: string;
}

interface VerificationResult {
  filename: string;
  is_authentic: boolean;
  confidence: number;
}

interface VerificationResponse {
  verification_id: string;
  results: VerificationResult[];
  all_authentic: boolean;
  flagged_indices: number[];
  temp_urls?: string[];
  permanent_urls?: string[];
  message: string;
}

export default function SignatureUploadModal({ 
  isOpen, 
  onClose, 
  onSave, 
  type, 
  existingSignatures,
  userId 
}: SignatureUploadModalProps) {
  const [signatures, setSignatures] = useState<string[]>(Array(7).fill(''));
  const [activeSignatureModal, setActiveSignatureModal] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  
  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [flaggedIndices, setFlaggedIndices] = useState<number[]>([]);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationError, setVerificationError] = useState<string>('');
  
  // Custom modal states
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModal, setResultModal] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize with existing signatures or empty array
      const initialSignatures = Array(7).fill('');
      existingSignatures.forEach((sig, index) => {
        if (index < 7) {
          initialSignatures[index] = sig;
        }
      });
      setSignatures(initialSignatures);
    }
  }, [isOpen, existingSignatures]);

  // Initialize canvas when signature modal opens
  useEffect(() => {
    if (activeSignatureModal !== null && activeTab === 'draw') {
      const timer = setTimeout(() => {
        initializeCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSignatureModal, activeTab]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5; // Increased from 3 to match other components
    ctx.strokeStyle = '#000';
    
    // Initialize with white background (ML model training data format)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load existing signature if available
    const existingSignature = signatures[activeSignatureModal!];
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = existingSignature;
    } else {
      setHasSignature(false);
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate the scaling factor between canvas logical size and display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    setLastX(x);
    setLastY(y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate the scaling factor between canvas logical size and display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastX(x);
    setLastY(y);
    setHasSignature(true);
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveCurrentSignature = () => {
    if (activeSignatureModal === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create TRANSPARENT background for saving to database (not white - for PDF compatibility)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Create a new canvas with transparent background
    const transparentCanvas = document.createElement('canvas');
    transparentCanvas.width = canvas.width;
    transparentCanvas.height = canvas.height;
    const transparentCtx = transparentCanvas.getContext('2d');
    
    if (!transparentCtx) return;
    
    const transparentImageData = transparentCtx.createImageData(canvas.width, canvas.height);
    const transparentData = transparentImageData.data;
    
    // Copy only non-white pixels (the signature) and make white pixels transparent
    for (let i = 0; i < data.length; i += 4) {
      // If pixel is not white (signature content)
      if (!(data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) && data[i + 3] > 0) {
        // Copy the pixel color
        transparentData[i] = data[i];
        transparentData[i + 1] = data[i + 1];
        transparentData[i + 2] = data[i + 2];
        transparentData[i + 3] = data[i + 3];
      } else {
        // Make white pixels transparent (for PDF use)
        transparentData[i + 3] = 0;
      }
    }
    
    transparentCtx.putImageData(transparentImageData, 0, 0);
    const dataUrl = transparentCanvas.toDataURL('image/png');
    
    setSignatures(prev => {
      const newSignatures = [...prev];
      newSignatures[activeSignatureModal] = dataUrl;
      return newSignatures;
    });
    setActiveSignatureModal(null);
    setHasSignature(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 400;
        canvas.height = 200;

        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;

        // Do NOT add white background - preserve original transparency
        // The white background will be added ONLY during verification
        ctx.drawImage(
          img,
          0, 0, img.width, img.height,
          x, y, img.width * scale, img.height * scale
        );

        const dataUrl = canvas.toDataURL('image/png');
        if (activeSignatureModal !== null) {
          setSignatures(prev => {
            const newSignatures = [...prev];
            newSignatures[activeSignatureModal] = dataUrl;
            return newSignatures;
          });
          setActiveSignatureModal(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // Filter out empty signatures
    const validSignatures = signatures.filter(sig => sig && sig.trim() !== '');
    
    if (validSignatures.length === 0) {
      setResultModal({
        type: 'warning',
        title: 'No Signatures',
        message: 'Please add at least one signature before saving.'
      });
      setShowResultModal(true);
      return;
    }
    
    if (validSignatures.length < 7) {
      setResultModal({
        type: 'warning',
        title: 'Incomplete Signatures',
        message: `You have only uploaded ${validSignatures.length} out of 7 signatures. It's recommended to upload all 7 signatures for better verification accuracy.`
      });
      setShowResultModal(true);
      // Continue with saving anyway
    }
    
    onSave(validSignatures);
  };

  const handleDone = async () => {
    // Save the verified signatures before closing
    const validSignatures = signatures.filter(sig => sig && sig.trim() !== '');
    
    setIsSaving(true);
    try {
      await onSave(validSignatures);
      // Only close the modal if save was successful
      handleCleanupAndClose();
    } catch (error) {
      // If save fails, show error and keep modal open
      console.error('Error saving signatures:', error);
      setResultModal({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save signatures. Please try again.'
      });
      setShowResultModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResultModalDone = () => {
    // Only close the result modal, not the upload modal
    setShowResultModal(false);
  };

  const handleVerifySignatures = async () => {
    // Filter out empty signatures
    const validSignatures = signatures.filter(sig => sig && sig.trim() !== '');
    
    if (validSignatures.length === 0) {
      setResultModal({
        type: 'warning',
        title: 'No Signatures',
        message: 'Please add at least one signature before verifying.'
      });
      setShowResultModal(true);
      return;
    }

    if (validSignatures.length !== 7) {
      setResultModal({
        type: 'warning',
        title: 'Incomplete Signatures',
        message: 'Please upload all 7 signatures before verifying.'
      });
      setShowResultModal(true);
      return;
    }
    
    setIsVerifying(true);
    setVerificationError('');
    
    try {
      // Verify each signature directly with ML service (no database save during verification)
      const verificationResults: VerificationResult[] = [];
      
      for (let i = 0; i < validSignatures.length; i++) {
        const signature = validSignatures[i];
        
        // Create white background version for ML service verification
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = signature;
        });
        
        // Create canvas with white background for ML model
        const verificationCanvas = document.createElement('canvas');
        verificationCanvas.width = img.width;
        verificationCanvas.height = img.height;
        const verificationCtx = verificationCanvas.getContext('2d');
        
        let file: File;
        
        if (verificationCtx) {
          // Fill with white background for ML model
          verificationCtx.fillStyle = 'white';
          verificationCtx.fillRect(0, 0, verificationCanvas.width, verificationCanvas.height);
          
          // Draw the signature on white background
          verificationCtx.drawImage(img, 0, 0);
          
          // Convert to blob and create file with white background
          const blob = await new Promise<Blob>((resolve) => {
            verificationCanvas.toBlob((blob) => {
              if (blob) resolve(blob);
            }, 'image/png');
          });
          
          file = new File([blob], `signature_${i+1}.png`, { type: 'image/png' });
        } else {
          // Fallback if canvas creation fails
          const response = await fetch(signature);
          const blob = await response.blob();
          file = new File([blob], `signature_${i+1}.png`, { type: 'image/png' });
        }
        
        // Use FormData approach - send directly to ML service
        const formData = new FormData();
        formData.append('file', file);
        
        const mlResponse = await fetch('/api/verify-signature-direct', {
          method: 'POST',
          body: formData,
        });
        
        if (!mlResponse.ok) {
          const errorData = await mlResponse.json();
          throw new Error(errorData.error || 'Verification failed');
        }
        
        const mlResult = await mlResponse.json();

        // Apply a random penalty (7–15%) to the raw confidence before verification.
        // The ML service returns confidence in the 0–1 range, so we temporarily
        // convert to percent, subtract a random 7–15, then convert back.
        const rawConfidencePercent = mlResult.confidence * 100;
        const randomPenalty = Math.floor(Math.random() * 9) + 6; // 7–15
        const adjustedConfidencePercent = Math.max(0, rawConfidencePercent - randomPenalty);
        const adjustedConfidence = adjustedConfidencePercent / 100;
        
        // Apply custom threshold for settings: 85% confidence required, using the adjusted value
        const SETTINGS_THRESHOLD = 0.85;
        const isAuthenticCustom = adjustedConfidence >= SETTINGS_THRESHOLD;
        
        verificationResults.push({
          filename: `signature_${i+1}`,
          is_authentic: isAuthenticCustom,
          confidence: adjustedConfidence
        });
      }
      
      // Calculate verification stats
      const allAuthentic = verificationResults.every(r => r.is_authentic);
      const flaggedIndices = verificationResults
        .map((r, i) => r.is_authentic ? -1 : i)
        .filter(i => i !== -1);
      
      setVerificationResults(verificationResults);
      setFlaggedIndices(flaggedIndices);
      setVerificationComplete(true);
      
      if (allAuthentic) {
        // All signatures verified - show success message but don't auto-save
        setResultModal({
          type: 'success',
          title: 'Verification Complete',
          message: 'All signatures verified successfully! Click "Done" to save and close.'
        });
        setShowResultModal(true);
      } else {
        // Some signatures flagged
        setResultModal({
          type: 'warning',
          title: 'Signatures Flagged',
          message: `${flaggedIndices.length} signature(s) flagged as potentially forged. Please replace the highlighted signatures and verify again.`
        });
        setShowResultModal(true);
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCleanupAndClose = async () => {
    // Reset verification state
    setVerificationResults([]);
    setFlaggedIndices([]);
    setVerificationComplete(false);
    setVerificationError('');
    setIsSaving(false);
    
    onClose();
  };

  const isAllSignaturesFilled = signatures.every(sig => sig && sig.trim() !== '');

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Background overlay */}
      <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={handleCleanupAndClose}></div>
      
      <div className="flex items-center justify-center min-h-full p-4 text-center sm:p-0">
        {/* Modal panel */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-3xl sm:w-full">
          {/* Close button */}
          <div className="absolute top-0 right-0 pt-4 pr-4 z-10">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              onClick={handleCleanupAndClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Modal content */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2" id="modal-title">
                  Upload Signatures for Verification
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Please upload or draw 7 signature samples. Each will be verified by our AI model.
                </p>
                
                {/* Verification Error */}
                {verificationError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                      <span className="text-sm text-red-700">{verificationError}</span>
                    </div>
                  </div>
                )}

                {/* Signature Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {signatures.map((signature, index) => {
                    const isFlagged = flaggedIndices.includes(index);
                    const verificationResult = verificationResults[index];
                    
                    return (
                      <div key={index} className="space-y-2">
                        <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                          <span>Signature {index + 1}</span>
                          {verificationComplete && signature && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              isFlagged 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {isFlagged ? 'Flagged' : 'Verified'}
                            </span>
                          )}
                        </label>
                        <div 
                          className={`relative border-2 border-dashed rounded-lg h-32 flex items-center justify-center cursor-pointer transition-colors ${
                            signature 
                              ? isFlagged
                                ? 'border-red-300 bg-red-50' 
                                : verificationComplete
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-green-300 bg-green-50'
                              : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
                          }`}
                          onClick={() => setActiveSignatureModal(index)}
                        >
                          {signature ? (
                            <>
                              <img
                                src={signature}
                                alt={`Signature ${index + 1}`}
                                className="max-w-full max-h-full object-contain"
                              />
                              {/* Verification indicator overlay */}
                              {verificationComplete && (
                                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                                  isFlagged ? 'bg-red-500' : 'bg-green-500'
                                }`}>
                                  {isFlagged ? (
                                    <AlertTriangle className="w-4 h-4 text-white" />
                                  ) : (
                                    <Check className="w-4 h-4 text-white" />
                                  )}
                                </div>
                              )}
                              {/* Confidence score */}
                              {verificationResult && (
                                <div className="absolute bottom-2 left-2 text-xs bg-black bg-opacity-75 text-white px-2 py-1 rounded">
                                  {(verificationResult.confidence * 100).toFixed(1)}%
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center">
                              <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <span className="text-sm text-gray-500">Add signature</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Progress indicator */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{signatures.filter(sig => sig).length} / 7 signatures</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(signatures.filter(sig => sig).length / 7) * 100}%` }}
                    ></div>
                  </div>
                  {signatures.filter(sig => sig).length < 7 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Upload all 7 signatures to enable verification
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Modal footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {verificationComplete && flaggedIndices.length === 0 ? (
              // Show Done button when verification is complete and all signatures are verified
              <button
                type="button"
                onClick={handleDone}
                disabled={isSaving}
                className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm ${
                  isSaving
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader className="animate-spin mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Done
                  </>
                )}
              </button>
            ) : !verificationComplete ? (
              // Show Verify button when verification hasn't been completed
              <button
                type="button"
                onClick={handleVerifySignatures}
                disabled={signatures.filter(sig => sig).length !== 7 || isVerifying}
                className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm ${
                  signatures.filter(sig => sig).length !== 7 || isVerifying
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isVerifying ? (
                  <>
                    <Loader className="animate-spin mr-2 h-4 w-4" />
                    Verifying...
                  </>
                ) : (
                  'Verify Signatures'
                )}
              </button>
            ) : (
              // Show Re-verify button when some signatures are flagged
              <button
                type="button"
                onClick={handleVerifySignatures}
                disabled={isVerifying}
                className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm ${
                  isVerifying
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isVerifying ? (
                  <>
                    <Loader className="animate-spin mr-2 h-4 w-4" />
                    Re-verifying...
                  </>
                ) : (
                  'Re-verify Signatures'
                )}
              </button>
            )}
            
            <button
              type="button"
              onClick={handleCleanupAndClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Individual Signature Modal */}
      {activeSignatureModal !== null && (
        <div className="fixed inset-0 z-[1100] overflow-y-auto">
          <div className="fixed inset-0 modal-backdrop" onClick={() => setActiveSignatureModal(null)}></div>
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="relative bg-white rounded-lg max-w-lg w-full">
              {/* Close button */}
              <div className="absolute top-0 right-0 pt-4 pr-4 z-10">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  onClick={() => setActiveSignatureModal(null)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Add Signature {activeSignatureModal + 1}
                </h4>
                
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex" aria-label="Tabs">
                    <button
                      className={`py-2 px-4 border-b-2 font-medium text-sm ${
                        activeTab === 'draw'
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('draw')}
                    >
                      Draw Signature
                    </button>
                    <button
                      className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                        activeTab === 'upload'
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('upload')}
                    >
                      Upload Signature
                    </button>
                  </nav>
                </div>
                
                {/* Tab Content */}
                <div className="mb-4">
                  {activeTab === 'draw' ? (
                    <div>
                      <div className="border border-gray-300 rounded-md bg-white p-2">
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={200}
                          className="w-full border border-gray-200 touch-none bg-white"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={endDrawing}
                          onMouseLeave={endDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={endDrawing}
                        />
                      </div>
                      <div className="flex justify-between mt-3">
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Trash2 className="mr-2" /> Clear
                        </button>
                        <button
                          type="button"
                          onClick={saveCurrentSignature}
                          disabled={!hasSignature}
                          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
                            hasSignature ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <Check className="mr-2" /> Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 mb-4">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Upload className="mr-2" /> Upload Image
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        Accepted formats: JPG, PNG, GIF
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {resultModal && (
        <CustomModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          title={resultModal.title}
          message={resultModal.message}
          type={resultModal.type}
          confirmText={resultModal.type === 'success' ? "Done" : "OK"}
          onConfirm={resultModal.type === 'success' ? handleResultModalDone : undefined}
        />
      )}
    </div>,
    document.body
  );
}
