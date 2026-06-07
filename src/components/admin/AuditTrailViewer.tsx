'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, Activity, Eye, EyeOff, ChevronUp, ChevronDown, Info, FileText, Tag, Globe, Clock } from 'lucide-react';

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  timestamp: string;
  users: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface AuditTrailData {
  auditEntries: AuditEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    actions: string[];
    entityTypes: string[];
  };
}

export default function AuditTrailViewer() {
  const [data, setData] = useState<AuditTrailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchAuditTrail = async (page: number = 1, action: string = '', entityType: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      
      if (action) params.append('action', action);
      if (entityType) params.append('entity_type', entityType);
      
      const response = await fetch(`/api/admin/audit-trail?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }
      
      const result = await response.json();
      setData(result);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const handleFilterChange = () => {
    fetchAuditTrail(1, selectedAction, selectedEntityType);
  };

  const handlePageChange = (page: number) => {
    fetchAuditTrail(page, selectedAction, selectedEntityType);
  };

  const toggleDetails = (entryId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'form_created': 'bg-green-100 text-green-800',
      'form_updated': 'bg-blue-100 text-blue-800',
      'form_published': 'bg-purple-100 text-purple-800',
      'form_archived': 'bg-yellow-100 text-yellow-800',
      'form_deleted': 'bg-red-100 text-red-800',
      'form_status_changed': 'bg-orange-100 text-orange-800',
      'access_link_created': 'bg-indigo-100 text-indigo-800',
      'access_link_deleted': 'bg-pink-100 text-pink-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getFormTitle = (details: Record<string, any>, action: string) => {
    // For deleted forms, try to get the form title from details
    if (action === 'form_deleted' && details.form_title) {
      return details.form_title;
    }
    return details.form_title || 'N/A';
  };

  const getStatusChange = (details: Record<string, any>, action: string) => {
    // For deleted forms, show "deleted" status
    if (action === 'form_deleted') {
      return 'Deleted';
    }
    
    // For archived forms, show "archived" status
    if (action === 'form_archived') {
      return 'Archived';
    }
    
    // For status changes, show the transition
    if (details.previous_status && details.status && details.previous_status !== details.status) {
      return `${details.previous_status} → ${details.status}`;
    }
    
    return details.status || 'N/A';
  };

  const formatDetails = (details: Record<string, any>, action: string, entityType: string) => {
    const formattedDetails: Array<{ label: string; value: any; icon?: React.ReactNode }> = [];

    // Common fields
    if (details.form_title) {
      formattedDetails.push({
        label: 'Form Title',
        value: details.form_title,
        icon: <FileText className="h-4 w-4 text-blue-500" />
      });
    }

    if (details.description) {
      formattedDetails.push({
        label: 'Description',
        value: details.description,
        icon: <Info className="h-4 w-4 text-gray-500" />
      });
    }

    // Status information
    if (details.status) {
      formattedDetails.push({
        label: 'Status',
        value: details.status,
        icon: <Tag className="h-4 w-4 text-green-500" />
      });
    }

    if (details.previous_status && details.previous_status !== details.status) {
      formattedDetails.push({
        label: 'Previous Status',
        value: details.previous_status,
        icon: <Tag className="h-4 w-4 text-gray-500" />
      });
    }

    // Date/time fields
    if (details.created_at) {
      formattedDetails.push({
        label: 'Created At',
        value: new Date(details.created_at).toLocaleString(),
        icon: <Clock className="h-4 w-4 text-purple-500" />
      });
    }

    if (details.updated_at) {
      formattedDetails.push({
        label: 'Updated At',
        value: new Date(details.updated_at).toLocaleString(),
        icon: <Clock className="h-4 w-4 text-orange-500" />
      });
    }

    if (details.available_from) {
      formattedDetails.push({
        label: 'Available From',
        value: new Date(details.available_from).toLocaleString(),
        icon: <Calendar className="h-4 w-4 text-blue-500" />
      });
    }

    if (details.available_until) {
      formattedDetails.push({
        label: 'Available Until',
        value: new Date(details.available_until).toLocaleString(),
        icon: <Calendar className="h-4 w-4 text-red-500" />
      });
    }

    // Access link fields
    if (details.access_link) {
      formattedDetails.push({
        label: 'Access Link',
        value: details.access_link,
        icon: <Globe className="h-4 w-4 text-indigo-500" />
      });
    }

    if (details.expires_at) {
      formattedDetails.push({
        label: 'Expires At',
        value: new Date(details.expires_at).toLocaleString(),
        icon: <Clock className="h-4 w-4 text-red-500" />
      });
    }

    // Add any other fields that aren't already formatted
    Object.keys(details).forEach(key => {
      if (!['form_title', 'description', 'status', 'previous_status', 'created_at', 'updated_at', 
            'available_from', 'available_until', 'access_link', 'expires_at'].includes(key)) {
        const value = details[key];
        if (value !== null && value !== undefined && value !== '') {
          formattedDetails.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
            icon: <Info className="h-4 w-4 text-gray-400" />
          });
        }
      }
    });

    return formattedDetails;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Loading audit trail...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Audit Trail</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => fetchAuditTrail()}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Audit Data</h3>
        <p className="mt-1 text-sm text-gray-500">No audit trail entries found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">System Audit Trail</h2>
          <p className="text-sm text-gray-600">
            View all administrative actions and system activities
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {data.pagination.total} entries
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              <option value="">All Actions</option>
              {data.filters.actions.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              <option value="">All Types</option>
              {data.filters.entityTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleFilterChange}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <Filter className="inline-block mr-2 h-4 w-4" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form/Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status/Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.auditEntries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(entry.action)}`}>
                        {entry.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.users ? `${entry.users.first_name} ${entry.users.last_name}` : 'Unknown User'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{getFormTitle(entry.details, entry.action)}</div>
                        <div className="text-gray-500 text-xs">{entry.entity_type.replace(/_/g, ' ')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getStatusChange(entry.details, entry.action)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.ip_address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => toggleDetails(entry.id)}
                        className="p-2 text-green-600 hover:text-green-900 rounded"
                        title={showDetails[entry.id] ? 'Hide details' : 'Show details'}
                      >
                        {showDetails[entry.id] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </td>
                  </tr>
                  {showDetails[entry.id] && (
                    <tr key={`${entry.id}-details`}>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <Info className="h-4 w-4 text-blue-500" />
                              Full Details
                            </h4>
                            {entry.entity_id && (
                              <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                Entity ID: <span className="font-mono">{entry.entity_id}</span>
                              </div>
                            )}
                          </div>
                          
                          {Object.keys(entry.details).length > 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                {formatDetails(entry.details, entry.action, entry.entity_type).map((item, index) => (
                                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-gray-500 mb-1">
                                        {item.label}
                                      </div>
                                      <div className="text-sm text-gray-900 break-words">
                                        {typeof item.value === 'string' && item.value.length > 100 ? (
                                          <div className="space-y-1">
                                            <div className="line-clamp-3">{item.value}</div>
                                            <details className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                                              <summary>Show full text</summary>
                                              <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 whitespace-pre-wrap break-words">
                                                {item.value}
                                              </pre>
                                            </details>
                                          </div>
                                        ) : (
                                          <div className="whitespace-pre-wrap break-words">{item.value}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
                              No additional details available
                            </div>
                          )}

                          {/* Raw JSON view (collapsible) */}
                          <details className="mt-4">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              View raw JSON data
                            </summary>
                            <div className="mt-2 bg-gray-900 rounded-md p-3 overflow-x-auto">
                              <pre className="text-xs text-green-400 font-mono">
                                {JSON.stringify(entry.details, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data.pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * data.pagination.limit) + 1} to{' '}
            {Math.min(currentPage * data.pagination.limit, data.pagination.total)} of{' '}
            {data.pagination.total} entries
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {currentPage} of {data.pagination.pages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === data.pagination.pages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
