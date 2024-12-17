import globalStyle from '@/style/appStyle'
import { SyncOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@/core/hooks'
import { useAutoComplete, usePrompt } from '@/helpers/hooks'
import { IExample } from '@/models/item.model'
import { exampleApi } from '@/services/api'
import { exampleAsync } from '@/store/async/example.async'
import { exampleAction } from '@/store/reducers/example.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { theme, Skeleton, Button, AutoComplete, Input } from 'antd'
import { PropsWithChildren, useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { ExItem } from '../exItem/exItem'
import styles from './style'
import exStyles from '@/views/features/item/style'
import clsx from 'clsx'

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
  const gClasses = globalStyle()

  const dispatch = useAppDispatch()
  const { randomExamples } = useAppSelector((state) => state.example)
  const { configuration } = useAppSelector((state) => state.auth.user)

  const { openNotification } = usePrompt()

  const [keyword, setKeyword] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [selected, setSelected] = useState<IExample>()

  const { options } = useAutoComplete(keyword, 'example')

  const { control, handleSubmit, setValue } = useForm<IExampleForm>({
    defaultValues: {
      query: '',
    },
  })

  const onSelect = (option: any) => {
    dispatch(exampleAction.setSelectedExample(option.id))
    exampleApi.getExampleById(option.id).then(({ content }) => {
      setValue('query', '')
      setSelected(content)
    })
  }

  const onSubmit = (data: IExampleForm) => {
    // console.log(`data: `, data)
  }

  const NoResultInList = () => {
    return [
      {
        value: 'noresult',
        label: 'No result!',
      },
    ]
  }

  const getRandomExamples = () => {
    dispatch(
      exampleAsync.fetchRandomExample({
        page: 0,
        size: configuration.numberOfExampleReview,
      }),
    ).then(() => {
      setIsLoaded(true)
    })
  }

  const onEdit = async (id: number) => {
    try {
      const { content } = await exampleApi.getExampleById(id)
      dispatch(exampleAction.setSelectedExample(content))
      dispatch(settingAction.toggleExModal())
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  const onDelete = async (id: number) => {
    try {
      const { content } = await exampleApi.getExampleById(id)
      dispatch(exampleAction.setSelectedExample(content))
      dispatch(settingAction.toggleDeleteExModal())
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  useEffect(() => getRandomExamples(), [])

  return (
    <>
      {!isLoaded && <Skeleton />}

      {isLoaded && (
        <div className={classes.exampleOverview}>
          <form
            className={classes.overviewForm}
            onSubmit={handleSubmit(onSubmit)}
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
              <span className={gClasses.fromTablet}>Refresh</span>
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
                    options={
                      options && options.length === 0 && value
                        ? NoResultInList()
                        : options.length > 0 && value
                          ? options
                          : []
                    }
                    onSelect={(v, o) => onSelect(o)}
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

          {selected && selected.original && (
            <div className={clsx(exClasses.examples, classes.exampleSelectedEx)}>
              <ul>
                <li className={clsx(exClasses.exampleItem)} style={{ paddingLeft: 8 }}>
                  <ExItem
                    data={selected}
                    onEdit={() => onEdit(selected.id || -1)}
                    onDelete={() => onDelete(selected.id || -1)}
                  />
                </li>
              </ul>
            </div>
          )}

          {randomExamples.length > 0 && (
            <div className={clsx(exClasses.examples)}>
              <ul>
                {randomExamples.map((example, key) => {
                  return (
                    <li
                      key={key}
                      className={clsx(exClasses.exampleItem)}
                      style={{ paddingLeft: 8 }}
                    >
                      <ExItem
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
      )}
    </>
  )
}
