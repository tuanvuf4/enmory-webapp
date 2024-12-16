import globalStyle from '@/style/appStyle'
import { PlusOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons'
import { patternValidation } from '@/core/utils'
import { ECategory, IPair, EType, IItem } from '@/models/item.model'
import { InputTag } from '@/views/components/inputTag/inputTag'
import { theme, Space, Col, Row, Button, Select, Checkbox, Input } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { meaningItem } from '.'
import { ExampleItem } from './exampleItem'
import styles from './style'
import clsx from 'clsx'
import { TextEditor } from '@/views/components'
import { usePrompt } from '@/helpers/hooks'

interface IProps {
  origin?: string
  catType: ECategory
  types: IPair<string, EType>[]
  onSubmit?: () => void
}

export const MeaningItem: React.FC<IProps> = ({ catType, types, onSubmit }) => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const { confirmDeleteModal } = usePrompt()

  const { control, getValues, trigger, setValue } = useFormContext<IItem>()

  const { fields, remove, prepend } = useFieldArray({
    control,
    name: 'meanings',
  })

  return (
    <Space
      direction='vertical'
      size={[token.size, token.size]}
      className={gClasses.fulWidth}
      style={{ padding: `${token.size}px 0` }}
    >
      <Col span={24}>
        <Row align={'middle'} gutter={[token.size / 2, token.size / 2]}>
          <Col md={4} xs={8}>
            <label htmlFor=''>Meaning:</label>
          </Col>
          <Col md={20} xs={16}>
            <Button
              onClick={() => {
                fields.length > 0
                  ? prepend({
                      ...meaningItem,
                      pronunciation: {
                        uk: getValues(`meanings.0.pronunciation.uk`),
                        us: getValues(`meanings.0.pronunciation.us`),
                        common: getValues(`meanings.0.pronunciation.common`),
                      },
                    })
                  : prepend({ ...meaningItem })
              }}
              type='primary'
              icon={<PlusOutlined />}
            />
          </Col>
        </Row>
      </Col>

      {fields.map((field, index) => {
        return (
          <div
            className={clsx(
              classes.contentStyle,
              getValues(`meanings.${index}.enable`) ? '' : classes.disableMeaning,
            )}
            key={field.id || index}
          >
            <Row>
              <Space
                direction='vertical'
                size={[token.size, token.size]}
                className={gClasses.fulWidth}
              >
                <Col xs={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col span={12} style={{ display: 'flex' }}>
                      <Button
                        type={'text'}
                        size={'large'}
                        onClick={onSubmit}
                        icon={<SaveOutlined />}
                        style={{ color: '#90C53F' }}
                      />
                    </Col>

                    <Col
                      span={12}
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Button
                        danger
                        onClick={() => {
                          confirmDeleteModal({
                            onOk: () => {
                              remove(index)
                            },
                          })
                        }}
                        icon={<DeleteOutlined />}
                      />
                    </Col>
                  </Row>
                </Col>

                {catType === ECategory.WORD && (
                  <Row gutter={[token.size / 2, token.size]} align={'middle'}>
                    <Col
                      md={{
                        span: 4,
                        order: 1,
                      }}
                      xs={{
                        span: 12,
                        order: 3,
                      }}
                    >
                      <label htmlFor=''>Type:</label>
                    </Col>

                    <Col
                      md={{
                        span: 4,
                        order: 2,
                      }}
                      xs={{
                        span: 12,
                        order: 4,
                      }}
                    >
                      <Controller
                        control={control}
                        name={`meanings.${index}.typeId`}
                        render={({ field }) => (
                          <Select
                            className={gClasses.fulWidth}
                            {...field}
                            options={types.filter((item) => item.value !== EType.ALL)}
                            defaultValue={EType.NOUN}
                          />
                        )}
                      />
                    </Col>

                    <Col
                      md={{
                        span: 5,
                        order: 4,
                      }}
                      xs={{
                        span: 12,
                        order: 2,
                      }}
                    >
                      <Controller
                        control={control}
                        name={`meanings.${index}.enable`}
                        render={({ field: { onChange, value } }) => (
                          <Checkbox
                            checked={value}
                            onChange={(e) => {
                              onChange(e)
                              trigger()
                            }}
                          >
                            Enable
                          </Checkbox>
                        )}
                      />
                    </Col>

                    <Col
                      md={{
                        span: 5,
                        offset: 6,
                        order: 3,
                      }}
                      xs={{
                        span: 12,
                        order: 1,
                      }}
                    >
                      <Controller
                        control={control}
                        name={`meanings.${index}.common`}
                        render={({ field: { onChange, value } }) => (
                          <Checkbox checked={value} onChange={onChange}>
                            Common
                          </Checkbox>
                        )}
                      />
                    </Col>
                  </Row>
                )}

                {catType !== ECategory.WORD && (
                  <Row gutter={[token.size / 2, token.size]} align={'middle'}>
                    <Col
                      md={{
                        span: 6,
                        order: 2,
                      }}
                      xs={{
                        span: 12,
                        order: 2,
                      }}
                    >
                      <Controller
                        control={control}
                        name={`meanings.${index}.enable`}
                        render={({ field: { onChange, value } }) => (
                          <Checkbox checked={value} onChange={onChange}>
                            Enable
                          </Checkbox>
                        )}
                      />
                    </Col>

                    <Col
                      md={{
                        span: 6,
                        offset: 4,
                        order: 1,
                      }}
                      xs={{
                        span: 12,
                        order: 1,
                      }}
                    >
                      <Controller
                        control={control}
                        name={`meanings.${index}.common`}
                        render={({ field: { onChange, value } }) => (
                          <Checkbox checked={value} onChange={onChange}>
                            Common
                          </Checkbox>
                        )}
                      />
                    </Col>
                  </Row>
                )}

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    {catType !== ECategory.WORD && (
                      <>
                        <Col md={4} xs={24}>
                          <label htmlFor=''>
                            Pronunciation:
                            {/* {!getValues(`meanings.${index}.pronunciation.common`) && (
                              <Popover title={msgWarning.empty}>
                                <WarningOutlined className={classes.alertIcon} />
                              </Popover>
                            )} */}
                          </label>
                        </Col>

                        <Col md={20} xs={24}>
                          <Controller
                            control={control}
                            name={`meanings.${index}.pronunciation.common`}
                            render={({ field }) => (
                              <Input
                                {...field}
                                onBlur={() => trigger()}
                                onInput={(e) => {
                                  const input = e.target as HTMLInputElement
                                  input.value = input.value
                                    .toLowerCase()
                                    .replace(patternValidation.specialCharacterPronouns, '')
                                }}
                              />
                            )}
                          />
                        </Col>
                      </>
                    )}

                    {catType === ECategory.WORD && (
                      <>
                        <Col md={4} xs={24}>
                          <label htmlFor=''>Pronunciation:</label>
                        </Col>

                        <Col md={10} xs={12}>
                          <Row gutter={[token.size / 4, token.size / 4]}>
                            {/* <Col xs={24}>
                              UK
                              {!getValues(`meanings.${index}.pronunciation.uk`) && (
                                <Popover title={msgWarning.empty}>
                                  <WarningOutlined className={classes.alertIcon} />
                                </Popover>
                              )}
                            </Col> */}
                            <Col xs={24}>
                              <Controller
                                control={control}
                                name={`meanings.${index}.pronunciation.uk`}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    // placeholder='UK'
                                    onBlur={() => trigger()}
                                    onInput={(e) => {
                                      const input = e.target as HTMLInputElement
                                      input.value = input.value
                                        .toLowerCase()
                                        .replace(patternValidation.specialCharacterPronouns, '')
                                    }}
                                  />
                                )}
                              />
                            </Col>
                          </Row>
                        </Col>

                        <Col md={10} xs={12}>
                          <Row gutter={[token.size / 4, token.size / 4]}>
                            {/* <Col xs={24}>
                              US
                              {!getValues(`meanings.${index}.pronunciation.us`) && (
                                <Popover title='This field is missing!'>
                                  <WarningOutlined className={classes.alertIcon} />
                                </Popover>
                              )}
                            </Col> */}
                            <Col xs={24}>
                              <Controller
                                control={control}
                                name={`meanings.${index}.pronunciation.us`}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    // placeholder='US'
                                    onBlur={() => trigger()}
                                    onInput={(e) => {
                                      const input = e.target as HTMLInputElement
                                      input.value = input.value
                                        .toLowerCase()
                                        .replace(patternValidation.specialCharacterPronouns, '')
                                    }}
                                  />
                                )}
                              />
                            </Col>
                          </Row>
                        </Col>
                      </>
                    )}
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <label htmlFor=''>Note:</label>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.note`}
                        render={({ field: { onChange, value } }) => {
                          return (
                            // <TextArea
                            //   autoSize={{ minRows: 2, maxRows: 4 }}
                            //   value={value}
                            //   placeholder='Note'
                            //   onChange={onChange}
                            // />
                            <TextEditor
                              content={value}
                              onChange={(content: any) => {
                                setValue(`meanings.${index}.note`, content ?? '')
                                onChange(content)
                              }}
                            />
                          )
                        }}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <label htmlFor=''>Translation:</label>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.translation`}
                        render={({ field }) => (
                          <TextArea
                            {...field}
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            placeholder='Translation'
                          />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <label htmlFor=''>Definition:</label>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.definition`}
                        render={({ field: { onChange, value } }) => (
                          <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            placeholder='Definition'
                            onChange={onChange}
                            value={value}
                          />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <label htmlFor=''>Collocations:</label>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.collocations`}
                        render={({ field: { onChange, value } }) => (
                          <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            value={value}
                            placeholder=''
                            onChange={onChange}
                          />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <label htmlFor=''>Grammar:</label>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.grammar`}
                        render={({ field: { onChange, value } }) => (
                          <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            value={value}
                            placeholder=''
                            onChange={onChange}
                          />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      Synonyms:
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.synonyms`}
                        render={({ field: { onChange, value } }) => (
                          <InputTag tags={value} onChange={(val: string[]) => onChange(val)} />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      Antonyms:
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.antonyms`}
                        render={({ field: { onChange, value } }) => (
                          <InputTag onChange={(value: string[]) => onChange(value)} tags={value} />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <ExampleItem nestIndex={index} />
              </Space>
            </Row>
          </div>
        )
      })}
    </Space>
  )
}

export default MeaningItem
