import { Modal } from 'antd'
import { TagManagerForm } from './TagManagerForm'

interface ITagManagerModalProps {
  open: boolean
  onClose: () => void
  title?: string
  onTagUpdated?: (previousValue: string, nextValue: string) => void
  onTagDeleted?: (deletedValue: string) => void
}

export const TagManagerModal: React.FC<ITagManagerModalProps> = ({
  open,
  onClose,
  title = 'Tags',
  onTagUpdated,
  onTagDeleted,
}) => {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      keyboard={false}
      width={800}
      maskClosable={false}
    >
      <TagManagerForm
        onClose={onClose}
        onTagUpdated={onTagUpdated}
        onTagDeleted={onTagDeleted}
      />
    </Modal>
  )
}
