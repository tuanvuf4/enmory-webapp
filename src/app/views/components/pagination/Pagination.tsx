import { Button, Select, theme } from 'antd'
import { CaretLeftOutlined, CaretRightOutlined } from '@ant-design/icons'
import styles from './style'
import { BaseOptionType } from 'antd/es/cascader'
import { setting } from '@/app/config/appConfig'

export interface IDataOnChange {
  page: number
  size: number
}

interface IPros {
  size?: number
  page?: number
  total?: number
  totalPage?: number
  options?: BaseOptionType[]
  onPageChange: (data: IDataOnChange) => void
}

export const Pagination = ({
  size = setting.pagination.size,
  page = 1,
  total = 0,
  totalPage = 1,
  options = setting.pagination.options,
  onPageChange,
}: IPros) => {
  const { token } = theme.useToken()
  const classes = styles(token)

  const onSelectChange = (value: number) => {
    onPageChange({
      page: 0,
      size: value,
    })
  }

  const onPrev = () => {
    onPageChange({
      page: page - 1,
      size,
    })
  }

  const onNext = () => {
    onPageChange({
      page: page + 1,
      size,
    })
  }

  return (
    <div className={classes.pagination}>
      <div className={classes.paginationSelect}>
        <Select value={size} defaultValue={size} onChange={onSelectChange} options={options} />
      </div>

      <div className={classes.paginationOverall}>
        <Button>{`${page * size + 1}-${
          (page + 1) * size > total ? total : (page + 1) * size
        }/${total}`}</Button>
      </div>

      <div className={classes.paginationNav}>
        <Button disabled={page === 0 || total === 0} onClick={onPrev}>
          <CaretLeftOutlined />
        </Button>

        <Button disabled={totalPage === page + 1 || total === 0} onClick={onNext}>
          <CaretRightOutlined />
        </Button>
      </div>
    </div>
  )
}
