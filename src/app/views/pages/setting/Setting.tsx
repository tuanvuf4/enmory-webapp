import appStyle from '@/style/appStyle.module.scss'
import { appConfig, appSetting } from '@/config/appConfig'
import { useSelector, useDispatch } from '@/core/hooks'
import { IUserConfig } from '@/models/user.model'
import { apiUser } from '@/services/firebase/api/user.api'
import { authAction } from '@/store/reducers/auth.reducer'
import {
  theme,
  Row,
  Col,
  Space,
  Select,
  Switch,
  Button,
  Card,
  Divider,
  Typography,
  Badge,
} from 'antd'
import {
  BookOutlined,
  TeamOutlined,
  SoundOutlined,
  LinkOutlined,
  TagsOutlined,
  AppstoreOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useForm, Controller } from 'react-hook-form'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { usePrompt } from '@/helpers/hooks'
import { TagManagerForm, BlogTagManagerForm } from '@/views/components'

const { Text } = Typography

// ─── Reusable sub-components ────────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}

const SectionCard = ({ icon, title, description, children }: SectionCardProps) => {
  const { token } = theme.useToken()
  return (
    <Card
      style={{
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token.sizeSM,
          padding: `${token.sizeMD}px ${token.sizeLG}px`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillAlter,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: token.borderRadius,
            background: token.colorPrimaryBg,
            color: token.colorPrimary,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600, fontSize: token.fontSizeLG, color: token.colorText }}>
            {title}
          </div>
          {description && (
            <div style={{ fontSize: token.fontSizeSM, color: token.colorTextDescription }}>
              {description}
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: `${token.sizeMD}px ${token.sizeLG}px` }}>{children}</div>
    </Card>
  )
}

interface SettingRowProps {
  label: string
  hint?: string
  children: React.ReactNode
  last?: boolean
}

const SettingRow = ({ label, hint, children, last }: SettingRowProps) => {
  const { token } = theme.useToken()
  return (
    <>
      <Row
        align='middle'
        gutter={[token.size, token.sizeXS]}
        style={{ padding: `${token.sizeXS}px 0` }}
      >
        <Col xs={24} sm={14}>
          <Text style={{ fontWeight: 500, color: token.colorText }}>{label}</Text>
          {hint && (
            <div>
              <Text type='secondary' style={{ fontSize: token.fontSizeSM }}>
                {hint}
              </Text>
            </div>
          )}
        </Col>
        <Col xs={24} sm={10} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {children}
        </Col>
      </Row>
      {!last && <Divider style={{ margin: `${token.sizeXS}px 0` }} />}
    </>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

const Setting = () => {
  const { token } = theme.useToken()
  const { message } = usePrompt()

  // User info comes from Firebase auth state
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const [isLoading, setIsLoading] = useState(false)

  const sanitizeConfig = (config?: Partial<IUserConfig> | null): IUserConfig => {
    const cleanConfig = Object.fromEntries(
      Object.entries(config || {}).filter(([_, v]) => v !== undefined),
    )
    return {
      ...appSetting.meta,
      itemTags: user?.configuration?.itemTags || [],
      blogTags: user?.configuration?.blogTags || [],
      ...cleanConfig,
      numberOfListeningSentences:
        config?.numberOfListeningSentences ?? appSetting.meta.numberOfListeningSentences,
    }
  }

  const { control, handleSubmit, reset } = useForm<IUserConfig>({
    defaultValues: sanitizeConfig(user?.configuration),
  })

  useEffect(() => {
    if (user?.configuration) {
      reset(sanitizeConfig(user.configuration))
    }
  }, [user?.configuration, reset])

  const onSubmit = async (data: IUserConfig) => {
    setIsLoading(true)
    try {
      const sanitizedData = sanitizeConfig(data)
      const result = await apiUser.updateUserConfig(sanitizedData)

      if (result.isSuccess) {
        message({ type: 'success', content: 'Settings saved successfully!' })
        // Update user configuration in Redux store
        dispatch(authAction.updateUserConfig(sanitizedData))
      } else {
        message({ type: 'error', content: result.message || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      message({ type: 'error', content: 'Failed to save settings. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const plainOptions: Array<{ label: string; value: number }> = appConfig.references.map(
    (refs) => ({
      label: refs.src,
      value: refs.id,
    }),
  )

  // Study set fields config — avoids repetitive JSX blocks
  type SelectOption = { value: number; label: number }
  const studySetFields: Array<{
    label: string
    name: keyof Pick<
      IUserConfig,
      | 'numberOfWordsInStudySet'
      | 'numberOfPhraseInStudySet'
      | 'numberOfIdiomInStudySet'
      | 'numberOfSlangInStudySet'
      | 'numberOfCollocationsInStudySet'
      | 'numberOfSentencesInStudySet'
      | 'numberOfExampleReview'
      | 'numberOfListeningSentences'
    >
    defaultKey: keyof typeof appSetting.meta
    options: SelectOption[]
    hint?: string
  }> = [
    {
      label: 'Words',
      name: 'numberOfWordsInStudySet',
      defaultKey: 'numberOfWordsInStudySet',
      options: appSetting.options,
      hint: 'Vocabulary words per study session',
    },
    {
      label: 'Phrases',
      name: 'numberOfPhraseInStudySet',
      defaultKey: 'numberOfPhraseInStudySet',
      options: appSetting.rdOptions,
      hint: 'Common phrases per session',
    },
    {
      label: 'Idioms',
      name: 'numberOfIdiomInStudySet',
      defaultKey: 'numberOfIdiomInStudySet',
      options: appSetting.rdOptions,
    },
    {
      label: 'Slangs',
      name: 'numberOfSlangInStudySet',
      defaultKey: 'numberOfSlangInStudySet',
      options: appSetting.rdOptions,
    },
    {
      label: 'Collocations',
      name: 'numberOfCollocationsInStudySet',
      defaultKey: 'numberOfCollocationsInStudySet',
      options: appSetting.rdOptions,
    },
    {
      label: 'Sentences',
      name: 'numberOfSentencesInStudySet',
      defaultKey: 'numberOfSentencesInStudySet',
      options: appSetting.rdOptions,
    },
    {
      label: 'Example Reviews',
      name: 'numberOfExampleReview',
      defaultKey: 'numberOfExampleReview',
      options: appSetting.rdOptions,
    },
    {
      label: 'Listening Sentences',
      name: 'numberOfListeningSentences',
      defaultKey: 'numberOfListeningSentences',
      options: appSetting.rdOptions,
      hint: 'Sentences used in listening practice',
    },
  ]

  return (
    <div className={appStyle.container}>
      <h2 className={appStyle.pageTitle}>Settings</h2>

      <div className={clsx(appStyle.bodyContent)}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Space
            direction='vertical'
            size={token.sizeMD}
            style={{ display: 'flex', maxWidth: 760, margin: '0 auto' }}
          >
            {/* ── Study Set ── */}
            <SectionCard
              icon={<BookOutlined />}
              title='Study Set'
              description='Configure how many items appear in each study session'
            >
              {studySetFields.map((field, idx) => (
                <SettingRow
                  key={field.name}
                  label={field.label}
                  hint={field.hint}
                  last={idx === studySetFields.length - 1}
                >
                  <Controller
                    control={control}
                    name={field.name}
                    render={({ field: { onChange, value } }) => (
                      <Select
                        style={{ minWidth: 80 }}
                        value={(value as number) ?? (appSetting.meta[field.defaultKey] as number)}
                        defaultValue={appSetting.meta[field.defaultKey] as number}
                        onChange={onChange}
                        options={field.options}
                        size='small'
                      />
                    )}
                  />
                </SettingRow>
              ))}
            </SectionCard>

            {/* ── Community & Player side by side ── */}
            <Row gutter={[token.sizeMD, token.sizeMD]}>
              <Col xs={24} sm={12}>
                <SectionCard
                  icon={<TeamOutlined />}
                  title='Community'
                  description='Social & sharing features'
                >
                  <SettingRow label='Enable Community' last>
                    <Controller
                      control={control}
                      name='community'
                      render={({ field: { onChange, value } }) => (
                        <Switch
                          checked={value}
                          onChange={onChange}
                          checkedChildren='On'
                          unCheckedChildren='Off'
                        />
                      )}
                    />
                  </SettingRow>
                </SectionCard>
              </Col>

              <Col xs={24} sm={12}>
                <SectionCard
                  icon={<SoundOutlined />}
                  title='Player'
                  description='Audio player visibility'
                >
                  <SettingRow label='Show Player' last>
                    <Controller
                      control={control}
                      name='showPlayer'
                      render={({ field: { onChange, value } }) => (
                        <Switch
                          checked={value}
                          onChange={onChange}
                          checkedChildren='On'
                          unCheckedChildren='Off'
                        />
                      )}
                    />
                  </SettingRow>
                </SectionCard>
              </Col>
            </Row>

            {/* ── References ── */}
            <SectionCard
              icon={<LinkOutlined />}
              title='References'
              description='Select active reference sources'
            >
              <Controller
                control={control}
                name='references'
                render={({ field: { onChange, value } }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: token.sizeSM }}>
                    {plainOptions.map((opt) => {
                      const activeRefs = (value as number[] | undefined) ?? []
                      const isActive = activeRefs.includes(opt.value)
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            const next = isActive
                              ? activeRefs.filter((v) => v !== opt.value)
                              : [...activeRefs, opt.value]
                            onChange(next)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: `${token.sizeXS}px ${token.sizeSM}px`,
                            borderRadius: token.borderRadius,
                            border: `1px solid ${isActive ? token.colorPrimary : token.colorBorderSecondary}`,
                            background: isActive ? token.colorPrimaryBg : token.colorBgContainer,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <Text style={{ fontWeight: 500, color: token.colorText }}>
                            {opt.label}
                          </Text>
                          <Badge
                            status={isActive ? 'processing' : 'default'}
                            text={
                              <Text
                                style={{
                                  fontSize: token.fontSizeSM,
                                  color: isActive ? token.colorPrimary : token.colorTextDescription,
                                }}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </Text>
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              />
            </SectionCard>

            {/* ── Item Tags ── */}
            <SectionCard
              icon={<TagsOutlined />}
              title='Item Tags'
              description='Manage tags used for vocabulary items'
            >
              <TagManagerForm />
            </SectionCard>

            {/* ── Blog Categories ── */}
            <SectionCard
              icon={<AppstoreOutlined />}
              title='Blog Categories'
              description='Manage categories for blog posts'
            >
              <BlogTagManagerForm />
            </SectionCard>

            {/* ── Save button ── */}
            <div style={{ textAlign: 'center', paddingBottom: token.sizeLG }}>
              <Button
                type='primary'
                htmlType='submit'
                loading={isLoading}
                icon={<SaveOutlined />}
                size='large'
                style={{ minWidth: 220, borderRadius: token.borderRadiusLG }}
              >
                Save Settings
              </Button>
            </div>
          </Space>
        </form>
      </div>
    </div>
  )
}

export default Setting
