// Add TypeScript declaration for window.pdfjsLib
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

import { useState, useEffect, useRef } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { PDF_DISPLAY_SCALE } from '@/lib/pdf-constants';

interface PDFViewerProps {
  url: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onPageChange?: (pageNumber: number, totalPages: number) => void;
}

export default function PDFViewer({ url, className = '', onLoad, onError, onPageChange }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  
  // Use the imported scale constant for consistency
  const scale = PDF_DISPLAY_SCALE;
  const rotation = 0;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF.js from CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfLibLoaded(true);
    };
    
    script.onerror = () => {
      setError('Failed to load PDF.js library. Please try again later.');
      if (onError) onError(new Error('Failed to load PDF.js library'));
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Only remove if it exists and we were the ones who added it
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [onError]);

  // Load the PDF when the library is loaded and URL is provided
  useEffect(() => {
    if (!pdfLibLoaded || !url) return;
    
    let isMounted = true;
    
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if pdfjsLib is available
        if (!window.pdfjsLib) {
          throw new Error('PDF.js library not loaded');
        }
        
        // First try to fetch the PDF to get it as an ArrayBuffer
        // This helps with authentication and CORS issues
        const response = await fetch(url, {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Accept': 'application/pdf'
          }
        }).catch((err: Error) => {
          console.error('Fetch error:', err);
          throw new Error('Failed to fetch PDF. Please try again later.');
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        
        const pdfData = await response.arrayBuffer().catch((err: Error) => {
          console.error('ArrayBuffer error:', err);
          throw new Error('Failed to process PDF data. Please try again later.');
        });
        
        // Load the PDF document from the ArrayBuffer
        const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise.catch((err: Error) => {
          console.error('PDF.js loading error:', err);
          throw new Error('Failed to load PDF document. Please try again later.');
        });
        
        if (isMounted) {
          setPdfDocument(pdf);
          setTotalPages(pdf.numPages);
          
          // Notify about total pages
          if (onPageChange) {
            onPageChange(1, pdf.numPages);
          }
          
          if (onLoad) onLoad();
        }
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load PDF');
          if (onError) onError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadPdf();
    
    return () => {
      isMounted = false;
    };
  }, [pdfLibLoaded, url, onLoad, onError, onPageChange]);

  // Update page change notification when current page changes
  useEffect(() => {
    if (pdfDocument && onPageChange) {
      onPageChange(currentPage, totalPages);
    }
  }, [currentPage, totalPages, pdfDocument, onPageChange]);

  // Render the current page when it changes
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;
    
    let isMounted = true;
    let renderingCancelled = false;
    
    const renderPage = async () => {
      try {
        // Get the page
        const page = await pdfDocument.getPage(currentPage);
        
        if (!isMounted || renderingCancelled) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) {
          console.error('Could not get canvas context');
          return;
        }
        
        const viewport = page.getViewport({ scale, rotation });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          enableWebGL: true, // Try to use WebGL for better performance
        };
        
        // Clear the canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render the page
        await page.render(renderContext).promise;
      } catch (err: any) {
        if (!renderingCancelled && isMounted) {
          console.error('Error rendering page:', err);
        }
      }
    };
    
    renderPage();
    
    return () => {
      isMounted = false;
      renderingCancelled = true;
    };
  }, [pdfDocument, currentPage, scale, rotation]);

  // Navigation functions
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-100 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] bg-gray-100 ${className}`}>
        <AlertCircle className="text-red-500 w-12 h-12 mb-4" />
        <p className="text-red-600 font-medium mb-2">Failed to load PDF</p>
        <p className="text-gray-600 text-sm">{error}</p>
        <p className="mt-4">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-500 hover:underline"
          >
            Download the PDF instead
          </a>
        </p>
      </div>
    );
  }

  // Show PDF viewer
  return (
    <div ref={containerRef} className={`bg-gray-100 flex flex-col h-full ${className}`}>
      {/* Simplified toolbar - only page navigation */}
      {pdfDocument && (
        <div className="bg-gray-50 border-b border-gray-200 p-2 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-sm text-gray-700 px-2">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* PDF Canvas - with improved scrolling and mobile responsiveness */}
      <div className="flex justify-center items-start p-2 sm:p-4 overflow-auto h-full">
        <div className="bg-white shadow-lg max-w-full" style={{ maxWidth: '100%', width: 'fit-content' }}>
          <canvas 
            ref={canvasRef} 
            className="max-w-full h-auto block"
            style={{ 
              maxWidth: '100%',
              height: 'auto',
              display: 'block'
            }} 
          />
        </div>
      </div>
    </div>
  );
} 