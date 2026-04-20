import PreviewBanner from '../shared/PreviewBanner'
import IELTSMasterclassV2Preview from './curriculum/components/IELTSMasterclassV2Preview'

export default function IELTSPreview() {
  return (
    <div style={{ padding: '0 0 48px' }}>
      <PreviewBanner />
      <div style={{ padding: '24px 28px 0' }}>
        <IELTSMasterclassV2Preview />
      </div>
    </div>
  )
}
