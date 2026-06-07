'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Link as LinkIcon, Copy, Plus } from 'lucide-react';
import { use } from 'react';

type AccessLink = {
  id: string;
  form_id: string;
  access_token: string;
  created_by: string;
  expires_at: string | null;
  created_at: string;
  description: string | null;
};

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  available_from: string | null;
  available_until: string | null;
};

export default function GenerateLinkPage({ params }: { params: { id: string } }) {
  // Unwrap the params object using React.use()
  const unwrappedParams = use(params);
  const formId = unwrappedParams.id;
  
  const [form, setForm] = useState<Form | null>(null);
  const [accessLinks, setAccessLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkDescription, setLinkDescription] = useState('');
  const [linkExpirationDays, setLinkExpirationDays] = useState(30);
  const [maxExpirationDays, setMaxExpirationDays] = useState<number | null>(null);
  
  
  useEffect(() => {
    fetchFormAndLinks();
  }, [formId]);
  
  useEffect(() => {
    if (form?.available_until) {
      // Calculate days until form becomes unavailable
      const availableUntil = new Date(form.available_until);
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
  }, [form]);
  
  const fetchFormAndLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/forms/${formId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch form details');
      }
      
      const data = await response.json();
      setForm(data.form);
      setAccessLinks(data.accessLinks || []);
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while fetching form details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateLink = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      // Validate expiration days against form availability
      if (maxExpirationDays !== null && linkExpirationDays > maxExpirationDays) {
        setError(`Link expiration cannot exceed ${maxExpirationDays} days (form availability period)`);
        setGenerating(false);
        return;
      }
      
      const response = await fetch(`/api/admin/forms/${formId}/generate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: linkDescription,
          expiration_days: linkExpirationDays,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate access link');
      }
      
      const data = await response.json();
      setAccessLinks(prevLinks => [...prevLinks, data.accessLink]);
      setLinkDescription('');
      setLinkExpirationDays(30);
      setSuccess('Access link generated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while generating the access link');
    } finally {
      setGenerating(false);
    }
  };
  
  const copyLinkToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    setSuccess('Link copied to clipboard');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };
  
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-gray-500">Loading form details...</p>
      </div>
    );
  }
  
  if (!form) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-600">Form Not Found</h2>
          <p className="mb-4 text-gray-600">The form you are looking for does not exist or has been deleted.</p>
          <Link href="/admin/forms" className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700">
            Back to Forms
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            href={`/admin/forms/${formId}`}
            className="mr-4 text-green-600 hover:underline"
          >
            <ArrowLeft className="inline h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Generate Access Links</h1>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800">
          <p>{success}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Generate New Link */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Generate New Access Link</h2>
          <p className="mb-4 text-sm text-gray-600">
            Create a new access link for <strong>{form.title}</strong>. Students can use this link to access and fill out the form.
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="linkDescription" className="block text-sm font-medium text-gray-700">
                Description
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
                Optional description to help you identify this link
              </p>
            </div>
            
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
                placeholder="30"
              />
              <p className="mt-1 text-xs text-gray-500">
                Set to 0 for no expiration
                {maxExpirationDays !== null && (
                  <span className="block text-amber-600 mt-1">
                    ⚠️ Maximum: {maxExpirationDays} days (form becomes unavailable on {new Date(form.available_until!).toLocaleDateString()})
                  </span>
                )}
                {maxExpirationDays !== null && linkExpirationDays > maxExpirationDays && (
                  <span className="block text-red-600 mt-1 font-medium">
                    ❌ Cannot exceed form availability period
                  </span>
                )}
              </p>
            </div>
            
            <button
              onClick={handleGenerateLink}
              disabled={generating || (maxExpirationDays !== null && linkExpirationDays > maxExpirationDays)}
              className="w-full inline-flex justify-center items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Plus className="mr-2" />
              {generating ? 'Generating...' : 'Generate Link'}
            </button>
          </div>
        </div>
        
        {/* Existing Links */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Existing Access Links</h2>
          {accessLinks.length > 0 ? (
            <div className="space-y-3">
              {accessLinks.map((link) => {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://plp-doc-auth.vercel.app';
                const accessUrl = `${baseUrl}/forms/access/${link.access_token}`;
                const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                
                return (
                  <div
                    key={link.id}
                    className={`rounded-md border p-4 ${
                      isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-medium">
                        {link.description || 'Access Link'}
                        {isExpired && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                            Expired
                          </span>
                        )}
                      </p>
                      <button
                        onClick={() => copyLinkToClipboard(accessUrl)}
                        className="inline-flex items-center rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                      >
                        <Copy className="mr-1" />
                        Copy
                      </button>
                    </div>
                    <div className="mb-2 rounded bg-white p-2 font-mono text-xs text-gray-600 break-all">
                      {accessUrl}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                      {link.expires_at && (
                        <span>Expires: {new Date(link.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No access links generated yet. Create your first link using the form on the left.</p>
          )}
        </div>
      </div>
      
      {/* Tips */}
      <div className="mt-6 rounded-md bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <LinkIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Access Link Tips</h3>
            <div className="mt-2 text-sm text-green-700">
              <ul className="list-disc space-y-1 pl-5">
                <li>Share these links with students who need to fill out the form</li>
                <li>Each link can be used multiple times by different students</li>
                <li>Set expiration dates to control when the form is no longer accessible</li>
                <li>Use descriptions to organize links for different groups or classes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
