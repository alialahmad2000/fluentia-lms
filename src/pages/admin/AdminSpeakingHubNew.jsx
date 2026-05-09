import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AdminSpeakingHubForm from './AdminSpeakingHubForm'
import { useCreateSpeakingHub } from '@/hooks/useSpeakingHub'

export default function AdminSpeakingHubNew() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createHub = useCreateSpeakingHub()

  async function handleSave(data) {
    const hub = await createHub.mutateAsync(data)
    navigate('/admin/speaking-hubs/' + hub.id)
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold font-['Tajawal'] text-[var(--text-primary)] mb-6">
        {t('admin.speakingHub.form.createTitle', 'إنشاء جلسة جديدة')}
      </h1>
      <AdminSpeakingHubForm mode="create" onSave={handleSave} />
    </div>
  )
}
