import globalStyle from '@/style/appStyle'
import { SyncOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useDispatch } from '@/core/hooks'
import { useAutoComplete, usePrompt } from '@/helpers/hooks'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/firebase/api/example.api'
import { settingAction } from '@/store/reducers/setting.reducer'
import { theme, Skeleton, Button, AutoComplete, Input } from 'antd'
import { PropsWithChildren, useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './style'
import exStyles from '@/views/features/item/style'
import clsx from 'clsx'
import { NoResult } from '@/views/components'
import { ExampleItem } from '../exampleItem'

interface IProps {
  title?: string
}

interface IExampleForm {
  query: string
  // translation: string
}

export const ExampleOverView: React.FC<PropsWithChildren & IProps> = () => {
  const { token } = theme.useToken()
  const classes = styles()
  const exClasses = exStyles()
  const globalClasses = globalStyle()

  const { openNotification } = usePrompt()

  const [keyword, setKeyword] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [selected, setSelected] = useState<IExample>()
  const [randomExamples, setRandomExamples] = useState<IExample[]>([])
  const [currentPage, setCurrentPage] = useState<number>(0)

  const { options } = useAutoComplete(keyword, 'example')

  const { control, setValue } = useForm<IExampleForm>({
    defaultValues: {
      query: '',
    },
  })

  const onSelect = (option: any) => {
    exampleApi.getExampleById(option.id).then(({ content }) => {
      setValue('query', '')
      if (content) {
        setSelected(content)
      }
    })
  }

  const getRandomExamples = async () => {
    setIsLoaded(false)
    setSelected(undefined)
    const nextPage = currentPage + 1
    try {
      const response = await exampleApi.getRandomExamples({
        page: nextPage,
        size: 10,
      })
      setRandomExamples(response.content || [])
      setCurrentPage(nextPage)
    } catch (error) {
      console.error('Error fetching random examples:', error)
      openNotification({ type: 'error', message: 'Failed to fetch examples' })
      setRandomExamples([])
    } finally {
      setIsLoaded(true)
    }
  }

  const onEdit = async (id: number | string) => {
    try {
      await exampleApi.getExampleById(id)
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onDelete = async (id: number | string) => {
    try {
      await exampleApi.getExampleById(id)
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  useEffect(() => {
    getRandomExamples()
  }, [])

  return (
    <div className={classes.exampleOverview}>
      <form
        className={classes.overviewForm}
        // onSubmit={handleSubmit(onSubmit)}
        style={{ width: '100%' }}
      >
        <Button
          type='default'
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: token.colorWhite,
          }}
          onClick={getRandomExamples}
        >
          <SyncOutlined />
          <span className={globalClasses.fromTablet}>Refresh</span>
        </Button>

        <Controller
          control={control}
          name={`query`}
          render={({ field: { onChange, value } }) => {
            return (
              <AutoComplete
                value={value}
                placeholder='Keyword'
                className={classes.autoSearchInput}
                notFoundContent={<NoResult showAddBtn={false} />}
                children={
                  <Input
                    className={classes.searchExampleInput}
                    allowClear={{
                      clearIcon: (
                        <CloseCircleOutlined
                          style={{
                            background: token.colorWhite,
                            padding: token.size / 8,
                            borderRadius: '50%',
                            color: token.colorBgLayout,
                            fontSize: 14,
                          }}
                        />
                      ),
                    }}
                  />
                }
                options={options}
                onSelect={(_, o) => onSelect(o)}
                onClear={() => onChange('')}
                onChange={(text) => {
                  onChange(text)
                  setKeyword(text)
                }}
              />
            )
          }}
        />
      </form>

      {selected && selected.origin && (
        <div className={clsx(exClasses.examples, classes.exampleSelectedEx)}>
          <ul>
            <li className={clsx(exClasses.exampleItem)} style={{ paddingLeft: 8 }}>
              <ExampleItem
                data={selected}
                onEdit={() => onEdit(selected.id || -1)}
                onDelete={() => onDelete(selected.id || -1)}
              />
            </li>
          </ul>
        </div>
      )}

      {randomExamples?.length > 0 && (
        <div className={clsx(exClasses.examples)}>
          {!isLoaded && <Skeleton />}
          <ul>
            {randomExamples.map((example, key) => {
              return (
                <li key={key} className={clsx(exClasses.exampleItem)} style={{ paddingLeft: 8 }}>
                  <ExampleItem
                    data={example}
                    onEdit={() => onEdit(example.id || -1)}
                    onDelete={() => onDelete(example.id || -1)}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
