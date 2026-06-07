'use client';

import { useState, useEffect } from 'react';
import { FileText, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import SuggestionsSection from '@/components/admin/SuggestionsSection';
import RecentSubmissionsSection from '@/components/admin/RecentSubmissionsSection';
import RecentFormsSection from '@/components/admin/RecentFormsSection';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
}

function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
            <Icon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm text-gray-500">{description}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalForms: 0,
    totalStudents: 0,
    totalVerifiedSubmissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        // Get total forms count
        const { count: formsCount, error: formsError } = await supabase
          .from('forms')
          .select('*', { count: 'exact', head: true });
        
        if (formsError) throw formsError;
        
        // Get total students count (excluding admins)
        const { count: studentsCount, error: studentsError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');
        
        if (studentsError) throw studentsError;
        
        // Get verified submissions count (submissions with status = 'verified')
        const { count: verifiedSubmissionsCount, error: verifiedError } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'verified');
        
        if (verifiedError) throw verifiedError;
        
        setStats({
          totalForms: formsCount || 0,
          totalStudents: studentsCount || 0,
          totalVerifiedSubmissions: verifiedSubmissionsCount || 0,
        });
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Error loading dashboard data: {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Forms"
          value={stats.totalForms}
          icon={FileText}
          description="Total number of forms created"
        />
        <StatsCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          description="Total number of registered students"
        />
        <StatsCard
          title="Total Verified Submissions"
          value={stats.totalVerifiedSubmissions}
          icon={CheckCircle}
          description="Total number of verified form submissions"
        />
      </div>

      {/* Suggestions Section */}
      <div className="mt-8">
        <SuggestionsSection />
      </div>

      {/* Recent Submissions Section */}
      <div className="mt-8">
        <RecentSubmissionsSection />
      </div>

      {/* Recent Forms Section */}
      <div className="mt-8">
        <RecentFormsSection />
      </div>
    </div>
  );
} 