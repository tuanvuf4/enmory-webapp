import { CloseSquareOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { ITracks } from '@/models/media.model'
import { MediaUploadForm } from './MediaUploadForm'

interface IProps {
  onConfirm?: (track: ITracks) => void
  onCancel?: () => void
  open: boolean
  title?: string
  trackData?: ITracks
}

export const MediaUploadModal: React.FC<IProps> = ({
  open,
  title,
  onCancel,
  onConfirm,
  trackData,
}) => {
  return (
    <Modal
      title={trackData?.id ? `Edit Track` : title || 'Upload'}
      closeIcon={<CloseSquareOutlined />}
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={false}
      maskClosable={false}
    >
      <MediaUploadForm trackData={trackData} onConfirm={onConfirm} onCancel={onCancel} />
    </Modal>
  )
}
