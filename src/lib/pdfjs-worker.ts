import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  // For client-side rendering
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url,
    ).toString();
  } catch (error) {
    console.error('Failed to set PDF.js worker source:', error);
    
    // Fallback to CDN if local import fails
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  }
} else {
  // For server-side rendering, use a dummy worker
  pdfjs.GlobalWorkerOptions.workerSrc = '';
}

export default pdfjs; 