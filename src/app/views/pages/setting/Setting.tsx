import appStyle from '@/style/appStyle.module.scss'
import { appConfig, appSetting } from '@/config/appConfig'
import { useSelector, useDispatch } from '@/core/hooks'
import { IUserConfig } from '@/models/user.model'
import { apiUser } from '@/services/firebase/api/user.api'
import { authAction } from '@/store/reducers/auth.reducer'
import { theme, CheckboxOptionType, Row, Col, Space, Select, Checkbox, Button, message } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { useState } from 'react'
import styles from './setting.module.scss'
import clsx from 'clsx'

const Setting = () => {
  const { token } = theme.useToken()

  // User info comes from Firebase auth state
  const { user } = useSelector((state) => state.auth)

  const dispatch = useDispatch()
  const [isLoading, setIsLoading] = useState(false)

  const { control, handleSubmit } = useForm<IUserConfig>({
    defaultValues: user?.configuration || appSetting.meta,
  })

  const onSubmit = async (data: IUserConfig) => {
    setIsLoading(true)
    try {
      const result = await apiUser.updateUserConfig(data)

      if (result.isSuccess) {
        message.success('Settings saved successfully!')

        // Update user configuration in Redux store
        dispatch(authAction.updateUserConfig(data))
      } else {
        message.error(result.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      message.error('Failed to save settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const plainOptions: CheckboxOptionType[] = appConfig.references.map((refs) => {
    return {
      label: refs.src,
      value: refs.id,
    }
  })

  return (
    <div className={appStyle.container}>
      <h2 className={appStyle.pageTitle}>Settings</h2>

      <div className={clsx(appStyle.bodyContent)}>
        <Row className={appStyle.innerContainer}>
          <Col xs={24}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Space direction='vertical' style={{ display: 'flex' }}>
                <Row
                  align={'top'}
                  gutter={[token.size, token.size]}
                  style={{ marginBottom: token.size }}
                >
                  <Col xs={24} md={8}>
                    <h3 className={styles.grTitle}>Study Set</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'middle'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>Number Of Words:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfWordsInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfWordsInStudySet}
                                onChange={onChange}
                                options={appSetting.options}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>Number Of Phrases:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfPhraseInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfPhraseInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>Number Of Idioms:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfIdiomInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfIdiomInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>Number Of Slang:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfSlangInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfSlangInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>Number Of Collocations:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfCollocationsInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfCollocationsInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>Number Of Sentences:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfSentencesInStudySet`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfSentencesInStudySet}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>Number Of Example:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfExampleReview`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={appSetting.meta.numberOfExampleReview}
                                onChange={onChange}
                                options={appSetting.rdOptions}
                              />
                            )
                          }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                <Row
                  align={'middle'}
                  gutter={[token.size, token.size]}
                  style={{ marginBottom: token.size }}
                >
                  <Col xs={24} md={8}>
                    <h3 className={styles.grTitle}>Community</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'middle'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>Enable Community:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`community`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Checkbox
                                checked={value}
                                onChange={(e) => onChange(e.target.checked)}
                                className={styles.checkbox}
                              >
                                {value ? 'Yes' : 'No'}
                              </Checkbox>
                            )
                          }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                <Row
                  align={'top'}
                  gutter={[token.size, token.size]}
                  style={{ marginBottom: token.size }}
                >
                  <Col xs={24} md={8}>
                    <h3 className={styles.grTitle}>References</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'top'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4 className={styles.title}>References:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`references`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Checkbox.Group
                                options={plainOptions}
                                value={value}
                                onChange={(e) => onChange(e)}
                                className={styles.checkboxGroup}
                              >
                                Active
                              </Checkbox.Group>
                            )
                          }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                <div className={styles.formAction}>
                  <Button type='primary' htmlType='submit' loading={isLoading}>
                    Save
                  </Button>
                </div>
              </Space>
            </form>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Setting
