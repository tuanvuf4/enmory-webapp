import { Rate, theme } from 'antd'
import { StarFilled } from '@ant-design/icons'
import styles from './style'
import { EItemLevel } from '../../features/modals/itemModal/data'

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
  const { token } = theme.useToken()
  const classes = styles(token)

  return (
    <Rate
      className={classes.rate}
      character={(item) => {
        return (item.index as number) < level ? (
          <StarFilled
            style={{ fontSize: size }}
            className={classes.rateItemActive + ' ' + classes.rateItemDefault}
          />
        ) : (
          <StarFilled style={{ fontSize: size }} className={classes.rateItemDefault} />
        )
      }}
      disabled={disabled}
      value={level}
      count={max}
      onChange={(rate) => (onChange ? onChange(rate) : '')}
    />
  )
}
