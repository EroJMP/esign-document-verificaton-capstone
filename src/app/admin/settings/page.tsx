'use client';

import { useState } from 'react';
import { Archive, Shield, User, Smartphone, Users, MessageSquare } from 'lucide-react';
import MobileAppManagement from '@/components/admin/MobileAppManagement';
import AuditTrailViewer from '@/components/admin/AuditTrailViewer';
import ArchivedFormsViewer from '@/components/admin/ArchivedFormsViewer';
import MyAccountTab from '@/components/admin/MyAccountTab';
import AdminAccountsTab from '@/components/admin/AdminAccountsTab';
import StudentsAccountTab from '@/components/admin/StudentsAccountTab';
import ConcernsSuggestionsViewer from '@/components/admin/ConcernsSuggestionsViewer';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'archive' | 'audit' | 'account' | 'mobile' | 'concerns'>('archive');
  const [accountTab, setAccountTab] = useState<'my-account' | 'admin-accounts' | 'student-accounts'>('my-account');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage system settings and administrative functions
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('archive')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'archive'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Archive className="inline-block mr-2" />
            Archive Forms
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="inline-block mr-2" />
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'account'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="inline-block mr-2" />
            Account Management
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mobile'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Smartphone className="inline-block mr-2" />
            Mobile App
          </button>
          <button
            onClick={() => setActiveTab('concerns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'concerns'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="inline-block mr-2" />
            Concerns/Suggestions
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        {activeTab === 'archive' && <ArchivedFormsViewer />}

        {activeTab === 'audit' && <AuditTrailViewer />}

        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Account Management Sub-tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Account Tabs">
                <button
                  onClick={() => setAccountTab('my-account')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    accountTab === 'my-account'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="h-4 w-4 inline mr-2" />
                  My Account
                </button>
                <button
                  onClick={() => setAccountTab('admin-accounts')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    accountTab === 'admin-accounts'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Shield className="h-4 w-4 inline mr-2" />
                  Admin Accounts
                </button>
                <button
                  onClick={() => setAccountTab('student-accounts')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    accountTab === 'student-accounts'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-2" />
                  Student Accounts
                </button>
              </nav>
            </div>

            {/* Account Management Content */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              {accountTab === 'my-account' && <MyAccountTab />}
              {accountTab === 'admin-accounts' && <AdminAccountsTab />}
              {accountTab === 'student-accounts' && <StudentsAccountTab />}
            </div>
          </div>
        )}

        {activeTab === 'mobile' && <MobileAppManagement />}

        {activeTab === 'concerns' && <ConcernsSuggestionsViewer />}
      </div>
    </div>
  );
}
