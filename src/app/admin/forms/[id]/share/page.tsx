'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Copy, Trash2 } from 'lucide-react';

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

type AccessLink = {
  id: string;
  form_id: string;
  access_token: string;
  created_by: string;
  expires_at: string | null;
  created_at: string;
  description: string | null;
};

export default function FormShare({ params }: { params: { id: string } }) {
  const [form, setForm] = useState<Form | null>(null);
  const [accessLinks, setAccessLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGenerateLinkModalOpen, setIsGenerateLinkModalOpen] = useState(false);
  const [linkDescription, setLinkDescription] = useState('');
  const [linkExpirationDays, setLinkExpirationDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<AccessLink | null>(null);
  
  
  useEffect(() => {
    fetchFormDetails();
  }, [params.id]);
  
  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/forms/${params.id}`);
      
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
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/admin/forms/${params.id}/generate-link`, {
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
        throw new Error('Failed to generate access link');
      }
      
      const data = await response.json();
      setAccessLinks(prevLinks => [...prevLinks, data.accessLink]);
      setIsGenerateLinkModalOpen(false);
      setLinkDescription('');
      setLinkExpirationDays(30);
      setSuccess('Access link generated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: unknown) {
      setError(error.message || 'An error occurred while generating the access link');
    } finally {
      setSaving(false);
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
  
  const openDeleteModal = (link: AccessLink) => {
    setLinkToDelete(link);
    setIsDeleteModalOpen(true);
  };
  
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setLinkToDelete(null);
  };
  
  const handleDeleteLink = async () => {
    if (!linkToDelete) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/admin/forms/${params.id}/links/${linkToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete access link');
      }
      
      setAccessLinks(prevLinks => prevLinks.filter(link => link.id !== linkToDelete.id));
      closeDeleteModal();
      setSuccess('Access link deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: unknown) {
      setError(error.message || 'An error occurred while deleting the access link');
    } finally {
      setSaving(false);
    }
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
            href={`/admin/forms/${params.id}`}
            className="mr-4 inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-1" />
            Back to Form
          </Link>
          <h1 className="text-2xl font-bold">Share Form</h1>
        </div>
        <button
          onClick={() => setIsGenerateLinkModalOpen(true)}
          className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="mr-2" />
          Generate New Link
        </button>
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
      
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <h2 className="mb-6 text-xl font-semibold">Form: {form.title}</h2>
        
        {accessLinks.length > 0 ? (
          <div className="space-y-4">
            <p className="mb-4 text-gray-600">
              Share these links with students to provide access to the form. Each link can be used to access the form.
            </p>
            
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Expires
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Link
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {accessLinks.map((link) => {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://plp-document-authentication-web.vercel.app';
                    const accessUrl = `${baseUrl}/forms/access/${link.access_token}`;
                    const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                    
                    return (
                      <tr key={link.id} className={isExpired ? 'bg-red-50' : ''}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {link.description || 'Access Link'}
                              {isExpired && (
                                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                                  Expired
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(link.created_at).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="truncate">{accessUrl}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => copyLinkToClipboard(accessUrl)}
                              className="text-green-600 hover:text-green-900"
                              title="Copy Link"
                            >
                              <Copy />
                            </button>
                            <button
                              onClick={() => openDeleteModal(link)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Link"
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="mb-4 text-gray-600">No access links generated yet.</p>
            <button
              onClick={() => setIsGenerateLinkModalOpen(true)}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="mr-2" />
              Generate Access Link
            </button>
          </div>
        )}
      </div>
      
      {/* Generate Link Modal */}
      {isGenerateLinkModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">Generate Access Link</h3>
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
                  </div>
                  <div>
                    <label htmlFor="linkExpiration" className="block text-sm font-medium text-gray-700">
                      Expiration (Days)
                    </label>
                    <input
                      type="number"
                      id="linkExpiration"
                      value={linkExpirationDays}
                      onChange={(e) => setLinkExpirationDays(parseInt(e.target.value) || 0)}
                      min="0"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                      placeholder="30"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Set to 0 for no expiration
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleGenerateLink}
                  disabled={saving}
                >
                  {saving ? 'Generating...' : 'Generate'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setIsGenerateLinkModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Link Modal */}
      {isDeleteModalOpen && linkToDelete && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Delete Access Link</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this access link? This action cannot be undone.
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900">
                        {linkToDelete.description || 'Access Link'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteLink}
                  disabled={saving}
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={closeDeleteModal}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 