import { Rate } from 'antd'
import { StarFilled } from '@ant-design/icons'
import styles from './style.module.scss'
import { EItemLevel } from '../../features/modals/itemModal/data'
import clsx from 'clsx'

interface IPros {
  level: number
  disabled?: boolean
  max?: number
  size?: number
  onChange?: (rate: number) => void
}

export const Level: React.FC<IPros> = ({
  level = EItemLevel.ZERO,
  disabled = true,
  max = EItemLevel.FIVE,
  size = 14,
  onChange,
}) => {
  return (
    <Rate
      className={styles.rate}
      character={(item) => {
        return (item.index as number) < level ? (
          <StarFilled style={{ fontSize: size }} className={clsx(styles.rateItemActive)} />
        ) : (
          <StarFilled style={{ fontSize: size }} className={clsx(styles.rateItemDefault)} />
        )
      }}
      disabled={disabled}
      value={level}
      count={max}
      onChange={(rate) => (onChange ? onChange(rate) : '')}
    />
  )
}
