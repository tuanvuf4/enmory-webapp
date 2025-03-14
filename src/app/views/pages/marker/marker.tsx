import { Button, Flex, Radio, Table, TableColumnsType } from 'antd'
import classNames from 'clsx'
import globalStyle, { appStyleConfig } from '@/style/appStyle'
import { useEffect, useState } from 'react'
import { appApi, itemApi } from '@/services/api'
import { ECategory, IIotd } from '@/models/item.model'
import { getCategory, transformItemModelToClient } from '@/helpers/item'
import { settingAction } from '@/store/reducers/setting.reducer'
import { useAppDispatch } from '@/core/hooks'
import moment from 'moment'
import { dateTimeUtils } from '@/core/utils'
import { ColumnType } from 'antd/es/table'
import { DeleteOutlined } from '@ant-design/icons'

interface DataType {
  key: string | number
  category: string
  items: (IIotd<string>[] | undefined)[]
}

interface dateRangeType {
  id: number
  label: string
  value: [number, number]
}

const dateRange: dateRangeType[] = [
  {
    id: 1,
    label: 'Last week',
    value: [
      moment().utc().subtract(1, 'week').startOf('week').toDate().getTime(),
      moment().utc().subtract(1, 'week').endOf('week').toDate().getTime(),
    ],
  },
  {
    id: 2,
    label: 'Today',
    value: [
      moment().utc().startOf('day').toDate().getTime(),
      moment().utc().endOf('day').toDate().getTime(),
    ],
  },
  {
    id: 3,
    label: 'This week',
    value: [
      moment().utc().startOf('week').toDate().getTime(),
      moment().utc().endOf('week').toDate().getTime(),
    ],
  },
]

const initialColumn: ColumnType<DataType> = {
  title: '',
  width: 120,
  className: '!text-center',
  dataIndex: 'category',
  fixed: 'left',
}

const Marker = () => {
  const [dataSource, setDataSource] = useState<DataType[]>([])
  const [columns, setColumns] = useState<TableColumnsType<DataType>>([initialColumn])

  const [range, setRange] = useState<[number, number]>(dateRange[1].value)
  const [currentDate, setCurrentDate] = useState<number>(Number(dateRange[1].id || 0))

  console.log(`******* dateRange ******* `, dateRange)

  const dispatch = useAppDispatch()

  const gClasses = globalStyle()

  const onView = async (id: number) => {
    const { isSuccess, content: item } = await itemApi.getItemById(id)
    if (isSuccess) {
      dispatch(settingAction.toggleViewItemModal())
      dispatch(
        settingAction.setCurrentItem({
          ...transformItemModelToClient(item),
        }),
      )
    }
  }

  const fetchMarkedIotd = async (range: [number, number]) => {
    const { isSuccess, content } = await appApi.getIotdRange({
      isMarked: true,
      from: dateTimeUtils.getStartOfDateUTC(range[0]),
      to: dateTimeUtils.getEndOfDateUTC(range[1]),
    })

    const dateRange = dateTimeUtils.getRangeDate(range[0], range[1])

    if (isSuccess && content) {
      const columns: TableColumnsType<DataType> = dateRange.map((value, key) => ({
        title: value.title,
        align: 'center',
        minWidth: 120,
        render: (_, record) => {
          if (!record.items[key]) return null

          return (
            <Flex gap={8} justify={'center'} align={'center'} wrap={'wrap'}>
              {record.items[key].map((value, index) => (
                // <Tag
                //   style={{ cursor: 'pointer', fontSize: token.fontSize }}
                //   onClick={() => onView(value.item.id as number)}
                //   key={index}
                //   closeIcon={
                //     <DeleteOutlined
                //       style={{
                //         color: appStyleConfig.color.red[3],
                //       }}
                //     />
                //   }
                //   onClose={async (e) => {
                //     e.stopPropagation()
                //     await appApi.deleteMarkIotd(value.id)
                //     await fetchMarkedIotd(range)
                //   }}
                // >
                //   {value.item.original}
                // </Tag>

                <Button
                  color='default'
                  size={'small'}
                  key={index}
                  onClick={() => onView(value.item.id as number)}
                  icon={
                    <DeleteOutlined
                      style={{
                        color: appStyleConfig.color.red[3],
                      }}
                      onClick={async (e) => {
                        e.stopPropagation()
                        await appApi.deleteMarkIotd(value.id)
                        await fetchMarkedIotd(range)
                      }}
                    />
                  }
                  iconPosition={'end'}
                >
                  {value.item.original}
                </Button>
              ))}
            </Flex>
          )
        },
      }))

      setColumns([initialColumn, ...columns])

      const cats = Object.keys(ECategory).filter(
        (predicate) => !isNaN(Number(predicate)) && predicate !== '0',
      )

      const dataSource = cats.map((cat) => {
        const findItem = dateRange.map((range) => {
          const findItems = content
            .map((c) => ({
              ...c,
              first_of_date:
                c.first_of_date - (dateTimeUtils.getLocalTimeZoneInMilliseconds(new Date()) || 0),
              last_of_date:
                c.last_of_date - (dateTimeUtils.getLocalTimeZoneInMilliseconds(new Date()) || 0),
            }))
            .filter(
              (t) =>
                range.from <= t.first_of_date &&
                t.first_of_date <= range.to &&
                Number(cat) === t.item.catId,
            )
          if (findItems.length > 0) return findItems
          return undefined
        })

        return {
          key: cat,
          category: getCategory(Number(cat)),
          items: [...findItem],
        }
      })

      setDataSource(dataSource)
    }
  }

  useEffect(() => void fetchMarkedIotd(range), [range])

  return (
    <div className={gClasses.containerFluid}>
      {/* <h2 className={classNames(gClasses.pageTitle)}>Marker</h2> */}

      <Flex className={'py-4 my-4'} justify={'center'}>
        <Radio.Group value={currentDate} onChange={(e) => setCurrentDate(e.target.value)}>
          {dateRange.map((item, key) => (
            <Radio.Button
              key={key}
              className={'select-none'}
              value={item.id}
              onClick={() => setRange(item.value)}
            >
              {item.label}
            </Radio.Button>
          ))}
        </Radio.Group>
      </Flex>

      <Table<DataType>
        bordered
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 'max-content' }}
        pagination={false}
      />
    </div>
  )
}

export default Marker
