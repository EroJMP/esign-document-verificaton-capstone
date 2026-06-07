import { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, Check, AlertCircle } from 'lucide-react';

type FormData = {
  title: string;
  description: string;
  availableFrom: string;
  availableUntil: string;
  pdfTemplate: File | null;
  templateUrl: string;
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

type GenerateLinkStepProps = {
  formData: FormData;
  formId: string;
};

export default function GenerateLinkStep({ formData, formId }: GenerateLinkStepProps) {
  const [linkDescription, setLinkDescription] = useState('');
  const [linkExpirationDays, setLinkExpirationDays] = useState(30);
  const [generatedLinks, setGeneratedLinks] = useState<Array<{
    id: string;
    description: string;
    access_token: string;
    expires_at: string;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [maxExpirationDays, setMaxExpirationDays] = useState<number | null>(null);
  
  // Set default expiration based on form availability
  useEffect(() => {
    if (formData.availableUntil) {
      // Calculate days until form becomes unavailable
      const availableUntil = new Date(formData.availableUntil);
      const today = new Date();
      const diffTime = availableUntil.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Set maximum expiration days to form availability period
      setMaxExpirationDays(diffDays > 0 ? diffDays : 0);
      
      // Set default expiration to the maximum allowed (or 30 if no limit)
      if (diffDays > 0) {
        setLinkExpirationDays(Math.min(diffDays, 30));
      }
    } else {
      // No form end date, no limit on expiration
      setMaxExpirationDays(null);
    }
    
    // Load existing links
    loadExistingLinks();
  }, [formData.availableUntil, formId]);
  
  // Load existing links for this form
  const loadExistingLinks = async () => {
    try {
      setIsLoadingLinks(true);
      
      const response = await fetch(`/api/admin/forms/${formId}/links`);
      
      if (!response.ok) {
        console.warn('Failed to load existing links, but continuing');
        return;
      }
      
      const data = await response.json();
      if (data.links && Array.isArray(data.links)) {
        setGeneratedLinks(data.links);
      }
    } catch (error) {
      console.warn('Error loading links:', error);
    } finally {
      setIsLoadingLinks(false);
    }
  };
  
  // Generate a new access link
  const generateLink = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate expiration days against form availability
      if (maxExpirationDays !== null && linkExpirationDays > maxExpirationDays) {
        setError(`Link expiration cannot exceed ${maxExpirationDays} days (form availability period)`);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/admin/forms/${formId}/generate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: linkDescription || `Access link for ${formData.title}`,
          expiration_days: linkExpirationDays,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Link generation error:', data);
        throw new Error(data.error || 'Failed to generate access link');
      }
      
      const data = await response.json();
      setGeneratedLinks([...generatedLinks, data.accessLink]);
      setSuccess('Access link generated successfully');
      
      // Reset form
      setLinkDescription('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error: unknown) {
      console.error('Error generating link:', error);
      setError((error as Error).message || 'An error occurred while generating the access link');
    } finally {
      setLoading(false);
    }
  };
  
  // Copy link to clipboard
  const copyLinkToClipboard = (link: string, linkId: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkId(linkId);
    setSuccess('Link copied to clipboard');
    
    // Reset copied state after 3 seconds
    setTimeout(() => {
      setCopiedLinkId(null);
      setSuccess(null);
    }, 3000);
  };
  
  // Format availability dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No restriction';
    return new Date(dateString).toLocaleString();
  };
  
  // Check if form has availability restrictions
  const hasAvailabilityRestrictions = formData.availableFrom || formData.availableUntil;
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Generate Student Link</h2>
        <p className="text-gray-600">
          Create access links for students to fill out the form. These links will direct students to the form in their portal.
          {hasAvailabilityRestrictions && (
            <span className="block mt-1 text-amber-600">
              Note: Access will be restricted based on the form&apos;s availability period.
            </span>
          )}
        </p>
      </div>
      
      {/* Error and success messages */}
      {error && (
        <div className="mb-4 flex items-start rounded-md bg-red-50 p-4 text-red-800">
          <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium">Error</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-4 flex items-start rounded-md bg-green-50 p-4 text-green-800">
          <Check className="mr-3 h-5 w-5 flex-shrink-0 text-green-400" />
          <div>
            <p className="font-medium">Success</p>
            <p className="mt-1 text-sm">{success}</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Link generation form */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium">Create Access Link</h3>
            
            <div className="space-y-4">
              {/* Link Description */}
              <div>
                <label htmlFor="linkDescription" className="block text-sm font-medium text-gray-700">
                  Link Description
                </label>
                <input
                  type="text"
                  id="linkDescription"
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  placeholder="e.g., For Class A Students"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional. Helps you identify the purpose of this link.
                </p>
              </div>
              
              {/* Link Expiration */}
              <div>
                <label htmlFor="linkExpiration" className="block text-sm font-medium text-gray-700">
                  Expiration (Days)
                  {maxExpirationDays !== null && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Max: {maxExpirationDays} days)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  id="linkExpiration"
                  value={linkExpirationDays}
                  onChange={(e) => setLinkExpirationDays(parseInt(e.target.value) || 0)}
                  min="0"
                  max={maxExpirationDays || undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
                    maxExpirationDays !== null && linkExpirationDays > maxExpirationDays
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Set to 0 for no expiration. Links will expire after the specified number of days
                  {maxExpirationDays !== null && (
                    <span className="block text-amber-600 mt-1">
                      ⚠️ Maximum: {maxExpirationDays} days (form becomes unavailable on {formatDate(formData.availableUntil)})
                    </span>
                  )}
                  {maxExpirationDays !== null && linkExpirationDays > maxExpirationDays && (
                    <span className="block text-red-600 mt-1 font-medium">
                      ❌ Cannot exceed form availability period
                    </span>
                  )}
                </p>
              </div>
              
              {/* Generate Button */}
              <button
                onClick={generateLink}
                disabled={loading || (maxExpirationDays !== null && linkExpirationDays > maxExpirationDays)}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <LinkIcon className="mr-2" />
                {loading ? 'Generating...' : 'Generate Access Link'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Generated Links */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium">Access Links</h3>
            
            {isLoadingLinks ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : generatedLinks.length > 0 ? (
              <div className="space-y-4">
                {generatedLinks.map((link) => {
                  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://plp-doc-auth.vercel.app';
                  // Use consistent access URL format
                  const accessUrl = `${baseUrl}/forms/access/${link.access_token}`;
                  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                  
                  return (
                    <div
                      key={link.id}
                      className={`rounded-md border p-4 ${
                        isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {link.description || 'Access Link'}
                            {isExpired && (
                              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                                Expired
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(link.created_at).toLocaleString()}
                            {link.expires_at && (
                              <span className="ml-2">
                                Expires: {new Date(link.expires_at).toLocaleString()}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => copyLinkToClipboard(accessUrl, link.id)}
                          className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium ${
                            copiedLinkId === link.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {copiedLinkId === link.id ? (
                            <>
                              <Check className="mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <div className="mt-2 break-all rounded-md bg-white p-2 text-sm font-mono text-gray-800">
                        {accessUrl}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md bg-gray-50 p-8 text-center">
                <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No links generated yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Generate an access link to share with students.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Form Summary */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium">Form Summary</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Title</h4>
            <p>{formData.title}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Fields</h4>
            <p>{formData.fields.length} field(s) added</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Available From</h4>
            <p>{formatDate(formData.availableFrom)}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Available Until</h4>
            <p>{formatDate(formData.availableUntil)}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-500">Description</h4>
          <p className="whitespace-pre-wrap">{formData.description || 'No description'}</p>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Click &quot;Finish&quot; to complete the form creation process and return to the forms list.
        </p>
      </div>
    </div>
  );
} 