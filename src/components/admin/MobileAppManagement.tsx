'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface MobileCode {
  id: string;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  users?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export default function MobileAppManagement() {
  const [codes, setCodes] = useState<MobileCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [daysValid, setDaysValid] = useState(30);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/mobile-app-codes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch codes');
      }

      const data = await response.json();
      setCodes(data.codes || []);
    } catch (err) {
      console.error('Error fetching codes:', err);
      setError('Failed to load mobile app codes');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/admin/mobile-app-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysValid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate code');
      }

      const data = await response.json();
      
      // Add new code to the list
      setCodes([data.code, ...codes]);
      
      // Auto-copy the new code
      copyToClipboard(data.code.code);
      
      // Reset days valid to default
      setDaysValid(30);
    } catch (err: any) {
      console.error('Error generating code:', err);
      setError(err.message || 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  const deactivateCode = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this code? Users will no longer be able to use it.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/mobile-app-codes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate code');
      }

      // Update local state
      setCodes(codes.map(code => 
        code.id === id ? { ...code, is_active: false } : code
      ));
    } catch (err) {
      console.error('Error deactivating code:', err);
      alert('Failed to deactivate code');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (code: MobileCode) => {
    if (!code.is_active) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Deactivated
        </span>
      );
    }
    
    if (isExpired(code.expires_at)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Mobile App Access Codes</h2>
        <p className="mt-1 text-sm text-gray-600">
          Generate and manage 6-digit codes for mobile app authentication
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Generate Code Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Generate New Code</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="daysValid" className="block text-sm font-medium text-gray-700 mb-2">
              Valid for (days)
            </label>
            <input
              type="number"
              id="daysValid"
              min="1"
              max="365"
              value={daysValid}
              onChange={(e) => setDaysValid(parseInt(e.target.value) || 1)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
              disabled={generating}
            />
          </div>
          <button
            onClick={generateCode}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Plus className="mr-2" />
                Generate Code
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          The generated code will be automatically copied to your clipboard
        </p>
      </div>

      {/* Codes List */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Active Codes ({codes.filter(c => c.is_active && !isExpired(c.expires_at)).length})
        </h3>
        <button
          onClick={fetchCodes}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="mr-1" />
          Refresh
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Plus className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No codes generated</h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate your first mobile app access code to get started
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Code
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Created
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Expires
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Usage
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {codes.map((code) => (
                <tr key={code.id} className={!code.is_active || isExpired(code.expires_at) ? 'opacity-60' : ''}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center">
                      <span className="font-mono font-bold text-lg text-gray-900 tracking-wider">
                        {code.code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title="Copy code"
                      >
                        {copiedCode === code.code ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {getStatusBadge(code)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatDate(code.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatDate(code.expires_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <div>
                      <div className="font-medium text-gray-900">{code.usage_count} times</div>
                      {code.last_used_at && (
                        <div className="text-xs text-gray-500">
                          Last: {formatDate(code.last_used_at)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    {code.is_active && !isExpired(code.expires_at) && (
                      <button
                        onClick={() => deactivateCode(code.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <Trash2 className="mr-1" />
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How it works</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Generate a 6-digit code that users will enter in the mobile app</li>
                <li>Set how many days the code will remain valid</li>
                <li>Users must enter a valid code before they can scan QR codes</li>
                <li>Deactivate codes at any time to revoke access</li>
                <li>Track usage statistics for each code</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

