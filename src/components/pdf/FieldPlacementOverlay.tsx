import { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export type FormField = {
  id: string;
  label: string;
  type: 'name' | 'text' | 'date' | 'signature' | 'checkbox';
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

interface FieldPlacementOverlayProps {
  fields: FormField[];
  containerRef: React.RefObject<HTMLDivElement>;
  onEditField: (field: FormField) => void;
  onDeleteField: (fieldId: string) => void;
  onUpdateField?: (field: FormField) => void;
}

export default function FieldPlacementOverlay({
  fields,
  containerRef,
  onEditField,
  onDeleteField,
  onUpdateField
}: FieldPlacementOverlayProps) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle field selection
  const handleFieldClick = (fieldId: string) => {
    setActiveFieldId(fieldId);
  };

  // Start dragging a field
  const handleDragStart = (e: React.MouseEvent, field: FormField) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isResizing) return;
    
    setIsDragging(true);
    setActiveFieldId(field.id);
    
    // Calculate offset from mouse position to field corner
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    // Store original position for undo
    setOriginalPosition({
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height
    });
  };

  // Start resizing a field
  const handleResizeStart = (e: React.MouseEvent, field: FormField) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setActiveFieldId(field.id);
    
    // Store original position and size for calculations
    setOriginalPosition({
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height
    });
    
    // Store mouse position
    setDragOffset({
      x: e.clientX,
      y: e.clientY
    });
  };

  // Handle mouse movement for drag and resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeFieldId || (!isDragging && !isResizing)) return;
      
      const activeField = fields.find(f => f.id === activeFieldId);
      if (!activeField) return;
      
      const container = containerRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      
      if (isDragging) {
        // Calculate new position
        let newX = e.clientX - containerRect.left - dragOffset.x;
        let newY = e.clientY - containerRect.top - dragOffset.y;
        
        // Constrain to container bounds
        newX = Math.max(0, Math.min(newX, containerRect.width - activeField.width));
        newY = Math.max(0, Math.min(newY, containerRect.height - activeField.height));
        
        if (onUpdateField) {
          onUpdateField({
            ...activeField,
            x: newX,
            y: newY
          });
        }
      } else if (isResizing) {
        // Calculate width and height changes
        const deltaX = e.clientX - dragOffset.x;
        const deltaY = e.clientY - dragOffset.y;
        
        // Calculate new dimensions
        let newWidth = Math.max(50, originalPosition.width + deltaX);
        let newHeight = Math.max(30, originalPosition.height + deltaY);
        
        // Constrain to container bounds
        newWidth = Math.min(newWidth, containerRect.width - originalPosition.x);
        newHeight = Math.min(newHeight, containerRect.height - originalPosition.y);
        
        if (onUpdateField) {
          onUpdateField({
            ...activeField,
            width: newWidth,
            height: newHeight
          });
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeFieldId, isDragging, isResizing, dragOffset, originalPosition, fields, containerRef, onUpdateField]);

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
      {fields.map((field) => (
        <div
          key={field.id}
          className={`absolute pointer-events-auto cursor-move border-2 ${
            activeFieldId === field.id
              ? 'border-green-500 bg-green-100 bg-opacity-30'
              : 'border-gray-400 bg-gray-100 bg-opacity-30'
          }`}
          style={{
            left: `${field.x}px`,
            top: `${field.y}px`,
            width: `${field.width}px`,
            height: `${field.height}px`,
          }}
          onClick={() => handleFieldClick(field.id)}
          onMouseDown={(e) => handleDragStart(e, field)}
        >
          <div className="absolute inset-0 flex flex-col justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{field.label}</span>
              <div className="flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditField(field);
                  }}
                  className="rounded bg-white p-0.5 text-green-600 hover:bg-green-100"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteField(field.id);
                  }}
                  className="rounded bg-white p-0.5 text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <span className="text-xs text-gray-500">{field.type}</span>
          </div>
          
          {/* Resize handle */}
          <div 
            className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-gray-400" 
            onMouseDown={(e) => {
              e.stopPropagation();
              handleResizeStart(e, field);
            }} 
          />
        </div>
      ))}
    </div>
  );
} 