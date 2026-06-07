'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Edit, Upload, Trash2, Check } from 'lucide-react';

interface SignatureCaptureProps {
  id: string;
  value: string | null;
  onChange: (id: string, value: string) => void;
  required?: boolean;
  label?: string;
}

const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  id,
  value,
  onChange,
  required = false,
  label = 'Signature'
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    is_authentic: boolean;
    confidence: number;
    message: string;
  } | null>(null);
  const [currentSignatureData, setCurrentSignatureData] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  
  // Initialize canvas when modal opens
  useEffect(() => {
    if (isModalOpen && activeTab === 'draw') {
      // Add a small delay to ensure the canvas is fully rendered in the DOM
      const timer = setTimeout(() => {
        initializeCanvas();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, activeTab]);

  // Reset verification when modal opens or tab changes
  useEffect(() => {
    if (isModalOpen) {
      resetVerification();
    }
  }, [isModalOpen, activeTab]);


  // Load existing signature if available
  useEffect(() => {
    if (value) {
      setHasSignature(true);
    }
  }, [value]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas styling (matching page.tsx approach)
    ctx.lineWidth = 5; // Updated from 3 to 5 to match page.tsx
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 1;
    
    // Clear canvas with white background (will be made transparent when saving)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);

    // Get coordinates
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
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

    // Get coordinates
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent scrolling on touch devices
    } else {
      // Mouse event
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
  };

  const endDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setHasSignature(true);
      
      // Capture signature data for verification with a small delay
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          setCurrentSignatureData(dataUrl);
          resetVerificationOnly(); // Reset verification state only, keep signature data
        }
      }, 100);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setUploadedFileName(null);
    setUploadedFileType(null);
    resetVerification(); // Reset verification when signature is cleared
  };

  const saveSignature = () => {
    if (!isVerified) {
      alert('Please verify the signature before saving');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create transparent background for saving to database/PDF (no white background)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Create a new canvas with transparent background
    const transparentCanvas = document.createElement('canvas');
    transparentCanvas.width = canvas.width;
    transparentCanvas.height = canvas.height;
    const transparentCtx = transparentCanvas.getContext('2d');
    
    if (transparentCtx) {
      const transparentImageData = transparentCtx.createImageData(canvas.width, canvas.height);
      const transparentData = transparentImageData.data;
      
      // Copy only non-white pixels (the signature) and make white pixels transparent
      for (let i = 0; i < data.length; i += 4) {
        // If pixel is not white (signature content)
        if (!(data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) && data[i + 3] > 0) {
          // Copy the pixel color
          transparentData[i] = data[i];         // R
          transparentData[i + 1] = data[i + 1]; // G
          transparentData[i + 2] = data[i + 2]; // B
          transparentData[i + 3] = data[i + 3]; // A
        } else {
          // Make white pixels transparent (for PDF use)
          transparentData[i + 3] = 0;
        }
      }
      
      transparentCtx.putImageData(transparentImageData, 0, 0);
      const dataUrl = transparentCanvas.toDataURL('image/png');
      onChange(id, dataUrl);
      setIsModalOpen(false);
      resetVerification();
    }
  };

  const saveUploadedSignature = () => {
    if (!isVerified) {
      alert('Please verify the signature before saving');
      return;
    }

    if (!currentSignatureData) {
      alert('No signature data to save');
      return;
    }

    // Process uploaded signature to have transparent background for PDF compatibility
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Create transparent version
      const transparentCanvas = document.createElement('canvas');
      transparentCanvas.width = canvas.width;
      transparentCanvas.height = canvas.height;
      const transparentCtx = transparentCanvas.getContext('2d');

      if (transparentCtx) {
        const transparentImageData = transparentCtx.createImageData(canvas.width, canvas.height);
        const transparentData = transparentImageData.data;

        // Copy only non-white pixels (the signature) and make white pixels transparent
        for (let i = 0; i < data.length; i += 4) {
          if (!(data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) && data[i + 3] > 0) {
            transparentData[i] = data[i];
            transparentData[i + 1] = data[i + 1];
            transparentData[i + 2] = data[i + 2];
            transparentData[i + 3] = data[i + 3];
          } else {
            transparentData[i + 3] = 0; // Make white transparent
          }
        }

        transparentCtx.putImageData(transparentImageData, 0, 0);
        const dataUrl = transparentCanvas.toDataURL('image/png');
        
        onChange(id, dataUrl);
        setIsModalOpen(false);
        resetVerification();
      }
    };
    img.src = currentSignatureData;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Track original file details so we can adjust verification behavior
    setUploadedFileName(file.name);
    setUploadedFileType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas dimensions
        canvas.width = 400;
        canvas.height = 200;

        // Calculate scaling to fit the image within the canvas
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;

        // Do NOT add white background - preserve original transparency
        // The white background will be added ONLY during verification

        // Draw the image (preserves transparency if PNG has no background)
        ctx.drawImage(
          img,
          0, 0, img.width, img.height,
          x, y, img.width * scale, img.height * scale
        );

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png');
        setCurrentSignatureData(dataUrl);
        setHasSignature(true);
        resetVerificationOnly(); // Reset verification state only, keep signature data
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => {
      alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const deleteSignature = () => {
    onChange(id, '');
    setHasSignature(false);
    setUploadedFileName(null);
    setUploadedFileType(null);
  };

  const verifySignature = async () => {
    let signatureFile: File | null = null;
    
    // If drawing tab, convert canvas to file with WHITE background for ML model
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Create a new canvas for verification with WHITE background (ML model expects white background)
        const verificationCanvas = document.createElement('canvas');
        verificationCanvas.width = canvas.width;
        verificationCanvas.height = canvas.height;
        const verificationCtx = verificationCanvas.getContext('2d');
        
        if (!verificationCtx) return;
        
        // Fill with white background (ML model training data has white backgrounds)
        verificationCtx.fillStyle = 'white';
        verificationCtx.fillRect(0, 0, verificationCanvas.width, verificationCanvas.height);
        
        // Draw the signature on white background
        verificationCtx.drawImage(canvas, 0, 0);
        
        // Convert to blob and create file with white background
        const blob = await new Promise<Blob>((resolve) => {
          verificationCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/png');
        });
        
        signatureFile = new File([blob], 'signature.png', { type: 'image/png' });
        
        // For display, still use transparent version
        const transparentCanvas = document.createElement('canvas');
        transparentCanvas.width = canvas.width;
        transparentCanvas.height = canvas.height;
        const transparentCtx = transparentCanvas.getContext('2d');
        
        if (transparentCtx) {
          // Create transparent version for display
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const transparentImageData = transparentCtx.createImageData(canvas.width, canvas.height);
          const transparentData = transparentImageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            if (!(data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) && data[i + 3] > 0) {
              transparentData[i] = data[i];
              transparentData[i + 1] = data[i + 1];
              transparentData[i + 2] = data[i + 2];
              transparentData[i + 3] = data[i + 3];
            } else {
              transparentData[i + 3] = 0;
            }
          }
          
          transparentCtx.putImageData(transparentImageData, 0, 0);
          setCurrentSignatureData(transparentCanvas.toDataURL('image/png'));
        }
      }
    } else if (currentSignatureData) {
      // For uploaded files, add white background for ML service verification
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = currentSignatureData;
      });
      
      // Create canvas with white background for ML model
      const verificationCanvas = document.createElement('canvas');
      verificationCanvas.width = img.width;
      verificationCanvas.height = img.height;
      const verificationCtx = verificationCanvas.getContext('2d');
      
      if (verificationCtx) {
        // Fill with white background for ML model
        verificationCtx.fillStyle = 'white';
        verificationCtx.fillRect(0, 0, verificationCanvas.width, verificationCanvas.height);
        
        // Draw the uploaded image on white background
        verificationCtx.drawImage(img, 0, 0);
        
        // Convert to blob and create file with white background
        const blob = await new Promise<Blob>((resolve) => {
          verificationCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/png');
        });
        
        signatureFile = new File([blob], 'signature.png', { type: 'image/png' });
      }
    }
    
    if (!signatureFile) {
      alert('No signature to verify. Please draw or upload a signature first.');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Use FormData approach like in your working page.tsx
      const formData = new FormData();
      formData.append('file', signatureFile);

      const response = await fetch('/api/verify-signature-direct', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const result = await response.json();

      // Decide which confidence to use:
      // - Draw tab: apply random penalty (user-drawn signature)
      // - Upload tab:
      //     * JPEG/JPG uploads: subtract fixed 15 points
      //     * PNG uploads: no subtraction (use raw confidence)
      let effectiveConfidence = result.confidence;

      if (activeTab === 'draw') {
        // Apply a random penalty to the raw confidence before using it.
        // The ML service returns confidence in the 0–1 range, so we temporarily
        // convert to percent, subtract a random amount, then convert back.
        const rawConfidencePercent = result.confidence * 100;
        const randomPenalty = Math.floor(Math.random() * 10) + 8; // current configured range
        const adjustedConfidencePercent = Math.max(0, rawConfidencePercent - randomPenalty);
        effectiveConfidence = adjustedConfidencePercent / 100;
      } else if (activeTab === 'upload' && uploadedFileName) {
        const lowerName = uploadedFileName.toLowerCase();
        const isJpeg = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');

        if (isJpeg) {
          const rawConfidencePercent = result.confidence * 100;
          const adjustedConfidencePercent = Math.max(0, rawConfidencePercent - 15);
          effectiveConfidence = adjustedConfidencePercent / 100;
        }
      }
      
      // Apply custom threshold for forms: 90% confidence required, using the final value
      const FORM_THRESHOLD = 0.90;
      const isAuthenticCustom = effectiveConfidence >= FORM_THRESHOLD;
      
      setVerificationResult({
        is_authentic: isAuthenticCustom,
        confidence: effectiveConfidence,
        message: isAuthenticCustom 
          ? `Signature verified as authentic (${Math.round(effectiveConfidence * 100)}% confidence)`
          : `Signature confidence ${Math.round(effectiveConfidence * 100)}% is below required ${Math.round(FORM_THRESHOLD * 100)}% threshold`
      });
      setIsVerified(isAuthenticCustom);

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        is_authentic: false,
        confidence: 0,
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setIsVerified(false);
    setVerificationResult(null);
    setCurrentSignatureData('');
  };

  const resetVerificationOnly = () => {
    setIsVerified(false);
    setVerificationResult(null);
  };

  return (
    <div className="mt-1">
      <div className="rounded-md border border-gray-300 bg-white">
        {label && (
          <div className="flex justify-between items-center p-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              {label}{required && <span className="text-red-500">*</span>}
            </span>
          </div>
        )}
        
        <div className="p-4">
          {hasSignature && value ? (
            <div className="relative group">
              <div className="border border-gray-200 rounded-md bg-white p-4 flex items-center justify-center">
                <img 
                  src={value} 
                  alt="Signature" 
                  className="max-w-full h-auto max-h-32"
                />
              </div>
              <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 rounded-full bg-white shadow-md text-gray-700 hover:text-green-600 border border-gray-200"
                  title="Edit signature"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={deleteSignature}
                  className="p-1.5 rounded-full bg-white shadow-md text-gray-700 hover:text-red-600 border border-gray-200"
                  title="Delete signature"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              <div className="p-3 rounded-full bg-blue-50 border border-blue-100">
                <Plus className="h-6 w-6 text-blue-500" />
              </div>
              <p className="mt-2 text-sm text-gray-600 font-medium">Click to add signature</p>
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal - Using Portal for better rendering */}
      {isModalOpen && typeof window === 'object' && createPortal(
        <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Background overlay */}
          <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
            {/* Modal panel */}
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              {/* Close button */}
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => setIsModalOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Modal content */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Add Signature
                    </h3>
                    
                    {/* Tabs */}
                    <div className="border-b border-gray-200 mt-4">
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
                    <div className="mt-4">
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
                          

                          {/* Verification Result */}
                          {verificationResult && (
                            <div className={`mt-3 p-3 rounded-md ${
                              verificationResult.is_authentic 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                            }`}>
                              <div className={`text-sm font-medium ${
                                verificationResult.is_authentic ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {verificationResult.is_authentic ? '✅ Signature Verified' : '❌ Verification Failed'}
                              </div>
                              <div className={`text-xs mt-1 ${
                                verificationResult.is_authentic ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {verificationResult.message}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between mt-3">
                            <button
                              type="button"
                              onClick={clearSignature}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Trash2 className="mr-2" /> Clear
                            </button>
                            
                            <div className="flex space-x-2">
                              {hasSignature && !isVerified && (
                                <button
                                  type="button"
                                  onClick={verifySignature}
                                  disabled={isVerifying}
                                  className={`inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md ${
                                    isVerifying 
                                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                                      : 'text-green-700 bg-white hover:bg-green-50'
                                  }`}
                                >
                                  {isVerifying ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2"></div>
                                      Verifying...
                                    </>
                                  ) : (
                                    'Verify'
                                  )}
                                </button>
                              )}
                              
                              <button
                                type="button"
                                onClick={saveSignature}
                                disabled={!hasSignature || !isVerified}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
                                  hasSignature && isVerified ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
                                }`}
                              >
                                <Check className="mr-2" /> Done
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : activeTab === 'upload' ? (
                        <div>
                          {!hasSignature || !currentSignatureData ? (
                            /* Upload Area - shown when no signature */
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
                          ) : (
                            /* Signature Preview - shown when signature is uploaded */
                            <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                              <div className="text-sm font-medium text-gray-700 mb-3">Uploaded Signature:</div>
                              <div 
                                className="flex justify-center cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                                title="Click to select a different image"
                              >
                                {currentSignatureData && (
                                  <img 
                                    src={currentSignatureData} 
                                    alt="Uploaded signature" 
                                    className="max-w-full h-auto max-h-40 border border-gray-300 rounded bg-white shadow-sm hover:shadow-md transition-shadow"
                                  />
                                )}
                              </div>
                            </div>
                          )}


                          {/* Verification Result */}
                          {verificationResult && (
                            <div className={`mb-4 p-3 rounded-md ${
                              verificationResult.is_authentic 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                            }`}>
                              <div className={`text-sm font-medium ${
                                verificationResult.is_authentic ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {verificationResult.is_authentic ? '✅ Signature Verified' : '❌ Verification Failed'}
                              </div>
                              <div className={`text-xs mt-1 ${
                                verificationResult.is_authentic ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {verificationResult.message}
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          {hasSignature && (
                            <div className="flex justify-end space-x-2 mb-4">
                              {!isVerified && (
                                <button
                                  type="button"
                                  onClick={verifySignature}
                                  disabled={isVerifying}
                                  className={`inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md ${
                                    isVerifying 
                                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                                      : 'text-green-700 bg-white hover:bg-green-50'
                                  }`}
                                >
                                  {isVerifying ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2"></div>
                                      Verifying...
                                    </>
                                  ) : (
                                    'Verify'
                                  )}
                                </button>
                              )}
                              
                              <button
                                type="button"
                                onClick={saveUploadedSignature}
                                disabled={!hasSignature || !isVerified}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
                                  hasSignature && isVerified ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
                                }`}
                              >
                                <Check className="mr-2" /> Done
                              </button>
                            </div>
                          )}

                          <p className="text-xs text-gray-500 text-center">
                            Accepted formats: JPG, PNG, GIF
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SignatureCapture;
