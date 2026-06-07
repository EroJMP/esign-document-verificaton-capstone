import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-helpers';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication check - happens before rendering
  const { error, isAdmin } = await requireAdmin();
  
  if (error || !isAdmin) {
    // Redirect to unauthorized page if not admin
    redirect('/unauthorized');
  }
  
  // If admin, render the client layout (which handles UI only)
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
} 