import {
  CaretDownOutlined,
  CaretRightOutlined,
  DeleteOutlined,
  PlusOutlined,
  TranslationOutlined,
} from '@ant-design/icons'
import { Button, Checkbox, Col, Flex, Input, Row, Select, Space, Tag,theme } from 'antd'
import clsx from 'clsx'
import { memo, useCallback,useEffect, useMemo, useState } from 'react'
import { Controller,useFieldArray, useFormContext } from 'react-hook-form'

import { useSelector } from '@/core/hooks'
import { sanitizePronunciation } from '@/core/utils'
import { usePrompt } from '@/helpers/hooks'
import { getType } from '@/helpers/item'
import { ECategory, EType, IItem } from '@/models/item.model'
import appStyle from '@/style/appStyle.module.scss'
import { InputTag, TextEditor } from '@/views/components'

import { meaningItem } from './data'
import { ExampleItem } from './ExampleItemForm'
import styles from './itemModal.module.scss'

interface IProps {
  origin?: string
  loading?: boolean
  showMeanings?: boolean
  catType: ECategory
  onSubmit?: () => void
}

export const MeaningItemForm = memo<IProps>(({ catType, showMeanings = true }) => {
  const { token } = theme.useToken()

  const [show, setShow] = useState<boolean[]>([])
  const [onlyCommon, setOnlyCommon] = useState<boolean>(false)
  const { types } = useSelector((state) => state.setting)

  const { confirm } = usePrompt()

  const { control, getValues, trigger, watch } = useFormContext<IItem>()

  const { fields, remove, prepend } = useFieldArray({ control, name: 'meanings' })

  useEffect(() => {
    showMeanings
      ? setShow(new Array(fields?.length).fill(true))
      : setShow(new Array(fields?.length).fill(false))
  }, [fields?.length, showMeanings])

  const meaningsValues = watch('meanings') || []
  const hasCommonMeanings = fields.some((field, idx) =>
    Boolean(meaningsValues[idx]?.common ?? (field as any).common),
  )
  const commonCount = fields.filter((field, idx) =>
    Boolean(meaningsValues[idx]?.common ?? (field as any).common),
  ).length
  const totalCount = fields.length
  const nonCommonCount = totalCount - commonCount

  const typeOptions = useMemo(
    () =>
      types
        .filter((item) => item.value !== EType.ALL)
        .map((item) => ({
          ...item,
          label: getType(item.value).origin,
        })),
    [types],
  )

  const handleAddMeaning = useCallback(() => {
    setShow((prev) => [true, ...prev])
    if (fields.length > 0) {
      prepend({
        ...meaningItem,
        pronunciation: {
          uk: sanitizePronunciation(getValues(`meanings.0.pronunciation.uk`)),
          us: sanitizePronunciation(getValues(`meanings.0.pronunciation.us`)),
          common: sanitizePronunciation(getValues(`meanings.0.pronunciation.common`)),
        },
      })
    } else {
      prepend({ ...meaningItem })
    }
  }, [fields.length, prepend, getValues])

  const handleDeleteMeaning = useCallback(
    (index: number) => {
      confirm({
        title: 'Xóa định nghĩa?',
        content: `Bạn có chắc chắn muốn xóa định nghĩa #${index + 1} này không?`,
        okText: 'Xóa',
        cancelText: 'Hủy',
        onOk: () => {
          remove(index)
          setShow((prev) => prev.filter((_, key) => key !== index))
        },
      })
    },
    [confirm, remove],
  )

  return (
    <Space direction='vertical' size={[token.size / 2, token.size / 2]} className={appStyle.full}>
      {/* ── SECTION HEADER (Giống cardHeader của sectionCard) ── */}
      <div className={styles.cardHeader}>
        <Flex
          align='center'
          justify={'space-between'}
          gap={token.size / 2}
          wrap='wrap'
          className={appStyle.full}
        >
          <Flex align='center' gap={token.size / 2}>
            <TranslationOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
            <span className={styles.sectionTitle}>Ý nghĩa</span>
            <Tag color='processing' style={{ borderRadius: 10, margin: 0 }}>
              {fields.length} nghĩa
            </Tag>
          </Flex>

          <Flex align='center' gap={token.size / 2}>
            {hasCommonMeanings && nonCommonCount > 0 && (
              <Button
                size='small'
                type={onlyCommon ? 'primary' : 'default'}
                ghost={onlyCommon}
                onClick={() => setOnlyCommon((prev) => !prev)}
                style={{ fontSize: 12, borderRadius: 6 }}
              >
                {`Common (${commonCount})`}
              </Button>
            )}

            <Button size='small' type='primary' icon={<PlusOutlined />} onClick={handleAddMeaning}>
              Thêm nghĩa
            </Button>
          </Flex>
        </Flex>
      </div>

      {fields.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ marginBottom: 12 }}>Chưa có định nghĩa nào cho từ này.</p>
          <Button type='primary' size='small' icon={<PlusOutlined />} onClick={handleAddMeaning}>
            Thêm định nghĩa đầu tiên
          </Button>
        </div>
      )}

      {fields.map((field, index) => {
        const isCommon = Boolean(meaningsValues[index]?.common ?? (field as any).common)

        // Prioritize common meaning: only show common meanings in ItemForm if onlyCommon is active
        if (onlyCommon && hasCommonMeanings && !isCommon && !show[index]) {
          return null
        }

        const enable = watch(`meanings.${index}.enable`)
        const definition = watch(`meanings.${index}.definition`)
        const translation = watch(`meanings.${index}.translation`)

        return (
          <div
            className={clsx(
              styles.contentStyle,
              !enable && styles.disabledMeaning,
              !definition && !translation && styles.disabledMeaning,
              isCommon ? styles.commonMeaning : styles.uncommonMeaning,
            )}
            key={field.id || index}
          >
            {/* ── CARD HEADER CỦA MỖI MEANING ITEM ── */}
            <div
              className={clsx(
                styles.meaningCardHeader,
                !show[index] && styles.meaningCardHeaderCollapsed,
              )}
            >
              <Flex align='center' gap={8} wrap='wrap' className={styles.meaningHeaderLeft}>
                <Button
                  type='text'
                  size='small'
                  className={styles.meaningCollapseBtn}
                  onClick={() => {
                    setShow((prev) => {
                      const previous = [...prev]
                      previous[index] = !prev[index]
                      return previous
                    })
                  }}
                  icon={show[index] ? <CaretDownOutlined /> : <CaretRightOutlined />}
                  style={{ color: token.colorPrimary }}
                />

                <Tag
                  color={isCommon ? 'gold' : 'default'}
                  style={{ fontWeight: 600, margin: 0, borderRadius: 4 }}
                >
                  #{index + 1}
                </Tag>

                {show[index] && catType === ECategory.WORD && (
                  <Controller
                    control={control}
                    name={`meanings.${index}.typeId`}
                    render={({ field }) => (
                      <Select
                        size='small'
                        className={styles.meaningTypeSelect}
                        {...field}
                        options={typeOptions}
                        defaultValue={EType.NOUN}
                      />
                    )}
                  />
                )}

                {!show[index] && (
                  <Flex align='center' gap={8} className={styles.collapsedPreview}>
                    {catType === ECategory.WORD && (
                      <Tag color='geekblue' style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                        {getType(getValues(`meanings.${index}.typeId`) as EType).abbr}
                      </Tag>
                    )}

                    <div
                      className={clsx(styles.collapsedTranslation, styles.showMeaningOption)}
                      dangerouslySetInnerHTML={{
                        __html:
                          getValues(`meanings.${index}.translation`) ||
                          getValues(`meanings.${index}.definition`) ||
                          '<span style="opacity: 0.5">(Chưa có nghĩa)</span>',
                      }}
                    />
                  </Flex>
                )}
              </Flex>

              <Flex align='center' gap={12} className={styles.meaningHeaderRight}>
                <Controller
                  control={control}
                  name={`meanings.${index}.common`}
                  render={({ field: { onChange, value } }) => (
                    <Checkbox checked={value} onChange={onChange}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>Common</span>
                    </Checkbox>
                  )}
                />

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
                      <span style={{ fontSize: 12, fontWeight: 500 }}>Enable</span>
                    </Checkbox>
                  )}
                />

                <Button
                  type='text'
                  danger
                  size='small'
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteMeaning(index)}
                />
              </Flex>
            </div>

            {/* ── MEANING FIELDS ── */}
            {show[index] && (
              <Space
                direction='vertical'
                size={[token.size / 2, token.size / 2]}
                className={clsx(appStyle.full)}
              >
                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <span className={styles.fieldLabel}>Pronunciation:</span>
                    </Col>

                    {catType !== ECategory.WORD && (
                      <Col md={20} xs={24}>
                        <Controller
                          control={control}
                          name={`meanings.${index}.pronunciation.common`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={sanitizePronunciation(field.value)}
                              onChange={(e) =>
                                field.onChange(sanitizePronunciation(e.target.value))
                              }
                              onBlur={() => trigger()}
                              onInput={(e) => {
                                const input = e.target as HTMLInputElement
                                input.value = sanitizePronunciation(input.value)
                              }}
                            />
                          )}
                        />
                      </Col>
                    )}

                    {catType === ECategory.WORD && (
                      <>
                        <Col md={10} xs={12}>
                          <Controller
                            control={control}
                            name={`meanings.${index}.pronunciation.uk`}
                            render={({ field }) => (
                              <Input
                                {...field}
                                value={sanitizePronunciation(field.value)}
                                onChange={(e) =>
                                  field.onChange(sanitizePronunciation(e.target.value))
                                }
                                placeholder='UK (/.../)'
                                onBlur={() => trigger()}
                                onInput={(e) => {
                                  const input = e.target as HTMLInputElement
                                  input.value = sanitizePronunciation(input.value)
                                }}
                              />
                            )}
                          />
                        </Col>

                        <Col md={10} xs={12}>
                          <Controller
                            control={control}
                            name={`meanings.${index}.pronunciation.us`}
                            render={({ field }) => (
                              <Input
                                {...field}
                                value={sanitizePronunciation(field.value)}
                                onChange={(e) =>
                                  field.onChange(sanitizePronunciation(e.target.value))
                                }
                                placeholder='US (/.../)'
                                onBlur={() => trigger()}
                                onInput={(e) => {
                                  const input = e.target as HTMLInputElement
                                  input.value = sanitizePronunciation(input.value)
                                }}
                              />
                            )}
                          />
                        </Col>
                      </>
                    )}
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <span className={styles.fieldLabel}>Note:</span>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.note`}
                        render={({ field: { onChange, value } }) => (
                          <TextEditor content={value} onChange={onChange} />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <span className={styles.fieldLabel}>Definition:</span>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.definition`}
                        render={({ field: { onChange, value } }) => (
                          <TextEditor content={value} onChange={onChange} />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <span className={styles.fieldLabel}>Translation:</span>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.translation`}
                        render={({ field: { onChange, value } }) => (
                          <TextEditor content={value} onChange={onChange} />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <span className={styles.fieldLabel}>Collocations:</span>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.collocations`}
                        render={({ field: { onChange, value } }) => (
                          <TextEditor content={value} onChange={onChange} />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={24}>
                      <span className={styles.fieldLabel}>Grammar:</span>
                    </Col>

                    <Col md={20} xs={24}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.grammar`}
                        render={({ field: { onChange, value } }) => (
                          <TextEditor content={value} onChange={onChange} />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={6}>
                      <span className={styles.fieldLabel}>Synonyms:</span>
                    </Col>

                    <Col md={20} xs={18}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.synonyms`}
                        render={({ field: { onChange, value } }) => (
                          <InputTag
                            tags={value || []}
                            onChange={(val: string[]) => onChange(val)}
                          />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col span={24}>
                  <Row gutter={[token.size / 2, token.size / 2]} align={'middle'}>
                    <Col md={4} xs={6}>
                      <span className={styles.fieldLabel}>Antonyms:</span>
                    </Col>

                    <Col md={20} xs={18}>
                      <Controller
                        control={control}
                        name={`meanings.${index}.antonyms`}
                        render={({ field: { onChange, value } }) => (
                          <InputTag
                            onChange={(value: string[]) => onChange(value)}
                            tags={value || []}
                          />
                        )}
                      />
                    </Col>
                  </Row>
                </Col>

                <ExampleItem nestIndex={index} />
              </Space>
            )}
          </div>
        )
      })}
    </Space>
  )
})
