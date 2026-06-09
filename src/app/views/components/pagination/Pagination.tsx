import { Button, Select } from 'antd'
import { CaretLeftOutlined, CaretRightOutlined } from '@ant-design/icons'
import styles from './style.module.scss'
import { BaseOptionType } from 'antd/es/cascader'
import { appSetting } from '@/config/appConfig'

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
  size = appSetting.pagination.size,
  page = 0,
  total = 0,
  totalPage = 1,
  options = appSetting.pagination.options,
  onPageChange,
}: IPros) => {
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

  // const onFirst = () => {
  //   onPageChange({
  //     page: 0,
  //     size,
  //   })
  // }

  // const onLast = () => {
  //   onPageChange({
  //     page: totalPage - 1,
  //     size,
  //   })
  // }

  const startItem = total === 0 ? 0 : page * size + 1
  const endItem = Math.min((page + 1) * size, total)
  // Check if there's a next page: we have items and haven't reached the last page
  const hasNextPage = total > 0 && totalPage > 0 && page < totalPage - 1

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationOverall}>
        <Button type={'text'}>{total > 0 ? `${startItem}-${endItem}/${total}` : '0/0'}</Button>
      </div>

      <div className={styles.paginationSelect}>
        <Select value={size} defaultValue={size} onChange={onSelectChange} options={options} />
      </div>

      <div className={styles.paginationNav}>
        {/* <Button disabled={page === 0 || total === 0} onClick={onFirst}>
          <DoubleLeftOutlined />
        </Button> */}

        <Button disabled={page === 0 || total === 0} onClick={onPrev}>
          <CaretLeftOutlined />
        </Button>

        <Button disabled={!hasNextPage} onClick={onNext}>
          <CaretRightOutlined />
        </Button>

        {/* <Button disabled={!hasNextPage} onClick={onLast}>
          <DoubleRightOutlined />
        </Button> */}
      </div>
    </div>
  )
}
