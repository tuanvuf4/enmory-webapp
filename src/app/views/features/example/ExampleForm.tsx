import { useDispatch, useSelector } from '@/core/hooks'
import { useCreateExample, useUpdateExample } from '@/core/hooks/useExamples'
import { useExampleModal, usePrompt } from '@/helpers/hooks'
import { ExampleMode } from '@/models/example.model'
import { IExample } from '@/models/item.model'
import { exampleAction } from '@/store/reducers/example.reducer'
import { Button, Col, Flex, Row, Space, theme } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import clsx from 'clsx'
import { PropsWithChildren, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import styles from './example.module.scss'
import { initExampleData } from '@/constant/example'
import { ReviewableTextArea } from '@/views/components'
import { removeLineBreaks } from '@/core/utils'
import { TranslationPractice } from './TranslationPractice'

interface IProps {
  data?: IExample
  mode?: ExampleMode
  resetAfterSave?: boolean
  onSuccess?: (data: IExample) => void
  onCancel?: () => void
}

export const ExampleForm: React.FC<PropsWithChildren & IProps> = ({
  mode = ExampleMode.Default,
  data,
  resetAfterSave = true,
  onSuccess,
  onCancel,
}) => {
  // Delegate Translation practice mode to the dedicated TranslationPractice component
  if (mode === ExampleMode.Translation) {
    return <TranslationPractice initialExample={data} onCancel={onCancel} onSuccess={onSuccess} />
  }

  const { token } = theme.useToken()
  const { notification } = usePrompt()
  const { closeExampleModal } = useExampleModal()
  const dispatch = useDispatch()
  const { translate } = useSelector((state) => state.example)

  const [loading, setLoading] = useState<boolean>(false)

  const { mutateAsync: createMutation } = useCreateExample()
  const { mutateAsync: updateMutation } = useUpdateExample()

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<IExample>({
    defaultValues: data || (translate as IExample) || initExampleData,
  })

  // Synchronize form when data changes
  useEffect(() => {
    if (data) {
      reset({ ...data })
    } else if (translate) {
      reset({ ...translate })
    }
  }, [data, translate, reset])

  const onSubmit = async (formData: IExample) => {
    setLoading(true)
    try {
      let result: IExample | null

      const updatedData: IExample = {
        ...formData,
        origin: removeLineBreaks(formData.origin).trim(),
        translation: removeLineBreaks(formData.translation).trim(),
        note: formData.note?.trim() || '',
        itemId: formData.itemId || data?.itemId,
        itemOrigin: formData.itemOrigin || data?.itemOrigin,
        catId: formData.catId !== undefined ? formData.catId : data?.catId,
      }

      if (formData.id) {
        result = await updateMutation({ ...updatedData })
        if (result) {
          dispatch(exampleAction.setTranslate(result))
          dispatch(exampleAction.batchUpdate([result]))
        }
        notification({ type: 'success', message: 'Update example successful!' })
      } else {
        result = await createMutation({ ...updatedData })
        notification({ type: 'success', message: 'Add example successful!' })
      }

      closeExampleModal()
      if (resetAfterSave) reset(initExampleData)
      if (result) {
        onSuccess?.(result)
      }
    } catch (error: any) {
      const errorMsg = error?.message || error || 'An error occurred'
      notification({
        type: 'error',
        message: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className={clsx(styles.exampleForm)}
      onSubmit={handleSubmit(onSubmit)}
      style={{ width: '100%' }}
    >
      <Space direction='vertical' style={{ display: 'flex', width: '100%' }} size={token.size}>
        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>Origin:</Col>

          <Col xs={24}>
            <Controller
              control={control}
              name={`origin`}
              rules={{
                required: {
                  value: true,
                  message: 'Required',
                },
              }}
              render={({ field: { onChange, value } }) => {
                return (
                  <ReviewableTextArea
                    autoSize={{ minRows: 2 }}
                    value={value}
                    placeholder='Origin'
                    className={styles.autoSearchInput}
                    onChange={onChange}
                    language='en'
                    enableReview={true}
                  />
                )
              }}
            />
          </Col>
        </Row>

        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>Translation:</Col>

          <Col xs={24}>
            <Controller
              control={control}
              name={`translation`}
              rules={{
                required: {
                  value: true,
                  message: 'Required',
                },
              }}
              render={({ field: { onChange, value } }) => {
                return (
                  <TextArea
                    value={value}
                    autoSize={{ minRows: 2 }}
                    placeholder='Translation'
                    className={styles.autoSearchInput}
                    onChange={(text) => onChange(text.target.value)}
                  />
                )
              }}
            />
          </Col>
        </Row>

        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>Note:</Col>

          <Col xs={24}>
            <Controller
              control={control}
              name={`note`}
              render={({ field: { onChange, value } }) => {
                return (
                  <TextArea
                    value={value}
                    autoSize={{ minRows: 2 }}
                    placeholder='Note'
                    className={styles.autoSearchInput}
                    onChange={(text) => onChange(text.target.value)}
                  />
                )
              }}
            />
          </Col>
        </Row>

        <Row align={'middle'} gutter={[token.size, token.size / 2]}>
          <Col xs={24}>
            <Flex justify='flex-end' gap={token.size}>
              {onCancel && (
                <Button
                  type='default'
                  style={{ minWidth: 120 }}
                  onClick={() => {
                    closeExampleModal()
                    onCancel?.()
                  }}
                >
                  Cancel
                </Button>
              )}

              <Button
                type='primary'
                htmlType='submit'
                loading={loading}
                disabled={!isValid}
                style={{ minWidth: 120 }}
              >
                Save
              </Button>
            </Flex>
          </Col>
        </Row>
      </Space>
    </form>
  )
}
