import { useAuthStore } from '@/stores/authStore';
import { useIELTSPreview } from '@/pages/admin/ielts-preview/IELTSPreviewContext';

/**
 * Resolves the student ID to query for.
 * - If admin is previewing: use mockStudent.id (null → triggers zero-data state)
 * - If student is logged in: use profile.id
 * - Otherwise: null
 */
export function useStudentId() {
  const profile = useAuthStore((s) => s.profile);
  const preview = useIELTSPreview();

  if (preview?.previewMode) {
    return preview.mockStudent?.id || null;
  }
  return profile?.id || null;
}
