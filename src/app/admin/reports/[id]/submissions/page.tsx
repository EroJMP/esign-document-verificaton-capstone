'use client';

import { useParams } from 'next/navigation';
import FormSubmissionsViewer from '@/components/admin/FormSubmissionsViewer';

export default function ReportSubmissionsPage() {
  const params = useParams();
  const formId = params.id as string;

  return (
    <FormSubmissionsViewer
      formId={formId}
      backLink="/admin/reports"
      backLabel="Back to Reports"
      viewSubmissionBasePath="/admin/reports"
    />
  );
}

