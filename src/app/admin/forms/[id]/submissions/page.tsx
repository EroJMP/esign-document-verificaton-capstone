'use client';

import { useParams } from 'next/navigation';
import FormSubmissionsViewer from '@/components/admin/FormSubmissionsViewer';

export default function FormSubmissionsPage() {
  const params = useParams();
  const formId = params.id as string;

  return (
    <FormSubmissionsViewer
      formId={formId}
      backLink="/admin/forms"
      backLabel="Back to Forms"
      viewSubmissionBasePath="/admin/forms"
    />
  );
}