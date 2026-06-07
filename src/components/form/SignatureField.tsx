'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';

interface SignatureFieldProps {
  id: string;
  value: string | null;
  onChange: (id: string, value: string) => void;
  required?: boolean;
  label?: string;
}

const SignatureField: React.FC<SignatureFieldProps> = ({ 
  id, 
  value, 
  onChange,
  required = false,
  label = 'Signature'
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  // Initialize canvas and load existing signature if available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas styling
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Load existing signature if available
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    setHasSignature(true);

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
    setIsDrawing(false);
    if (hasSignature) {
      saveSignature();
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(id, '');
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to data URL and save
    const dataUrl = canvas.toDataURL('image/png');
    onChange(id, dataUrl);
  };

  return (
    <div className="mt-1">
      <div className="rounded-md border border-gray-300 bg-white">
        <div className="flex justify-between items-center p-2 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">{label}{required && <span className="text-red-500">*</span>}</span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={clearSignature}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Clear signature"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={saveSignature}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Save signature"
              disabled={!hasSignature}
            >
              <Check size={16} />
            </button>
          </div>
        </div>
        <div className="p-2">
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="w-full border border-gray-200 touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
          />
        </div>
        {!hasSignature && (
          <div className="p-2 text-center text-gray-400 text-xs">
            Sign above using mouse or touch
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatureField;
