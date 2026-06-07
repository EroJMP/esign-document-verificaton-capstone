'use client';

import { use } from 'react';
import SubmissionDetailViewer from '@/components/admin/SubmissionDetailViewer';

export default function ReportSubmissionViewPage({ 
  params 
}: { 
  params: Promise<{ id: string; submissionId: string }> 
}) {
  const { id, submissionId } = use(params);

  return (
    <SubmissionDetailViewer
      formId={id}
      submissionId={submissionId}
      backLink={`/admin/reports/${id}/submissions`}
      backLabel="Back to Submissions"
    />
  );
}

