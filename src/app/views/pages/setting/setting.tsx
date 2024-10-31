import globalStyle from '@/style/appStyle'
import { appConfig, defaultSetting } from '@/config/appConfig'
import { useAppSelector, useAppDispatch } from '@/core/hooks'
import { IUserConfig } from '@/models/user.model'
import { apiUser } from '@/services/api'
import { actionAsyncUser } from '@/store/async/user'
import { authAction } from '@/store/reducers/auth.reducer'
import { theme, CheckboxOptionType, Row, Col, Space, Select, Checkbox, Button } from 'antd'
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import styles from './style'
import clsx from 'clsx'

const Setting = () => {
  const { token } = theme.useToken()
  const classes = styles()
  const gClasses = globalStyle()

  const { user } = useAppSelector((state) => state.auth)

  const dispatch = useAppDispatch()

  const { control, handleSubmit } = useForm<IUserConfig<number[]>>({
    defaultValues: user.configuration,
  })

  const convertDataToServer = (
    data: IUserConfig<number[] | string>,
    toClient = true,
  ): IUserConfig<number[] | string> => {
    return {
      ...data,
      references: toClient
        ? (data as IUserConfig<string>).references
            .replaceAll(' ', '')
            .split(',')
            .map((item) => parseInt(item))
        : (data as IUserConfig<number[]>).references.join(','),
    }
  }

  const onSubmit = (data: IUserConfig<number[]>) => {
    apiUser.userConfig(convertDataToServer(data, false) as IUserConfig<string>).then((repsonse) => {
      dispatch(
        authAction.updateUserConfig(convertDataToServer(repsonse.content) as IUserConfig<number[]>),
      )
    })
  }

  const plainOptions: CheckboxOptionType[] = appConfig.references.map((refs) => {
    return {
      label: refs.src,
      value: refs.id,
    }
  })

  useEffect(() => {
    dispatch(actionAsyncUser.getUserInfo())
  }, [])

  return (
    <div className={gClasses.container}>
      <div className={clsx(gClasses.bodyContent)}>
        <Row className={gClasses.innerContainer}>
          <Col xs={24} className={classes.sep}>
            <h2 className={gClasses.pageTitle}>Settings</h2>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Space direction='vertical' style={{ display: 'flex' }}>
                <Row
                  align={'top'}
                  gutter={[token.size, token.size]}
                  style={{ marginBottom: token.size }}
                >
                  <Col xs={24} md={8}>
                    <h3 className={classes.grTitle}>Study Set</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'middle'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Number Of Words:</h4>
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
                                defaultValue={defaultSetting.studySet.numberOfWordsInStudySet}
                                onChange={onChange}
                                options={defaultSetting.studySet.options}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Number Of Phrases:</h4>
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
                                defaultValue={defaultSetting.studySet.numberOfPhraseInStudySet}
                                onChange={onChange}
                                options={defaultSetting.studySet.options}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Number Of Idioms:</h4>
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
                                defaultValue={defaultSetting.studySet.numberOfIdiomInStudySet}
                                onChange={onChange}
                                options={defaultSetting.studySet.stOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Number Of Slang:</h4>
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
                                defaultValue={defaultSetting.studySet.numberOfSlangInStudySet}
                                onChange={onChange}
                                options={defaultSetting.studySet.stOptions}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Number Of Collocations:</h4>
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
                                defaultValue={
                                  defaultSetting.studySet.numberOfCollocationsInStudySet
                                }
                                onChange={onChange}
                                options={defaultSetting.studySet.options}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Number Of Sentences:</h4>
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
                                defaultValue={defaultSetting.studySet.numberOfSentencesInStudySet}
                                onChange={onChange}
                                options={defaultSetting.studySet.options}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Number Of Example:</h4>
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
                                defaultValue={defaultSetting.studySet.numberOfExampleReview}
                                onChange={onChange}
                                options={defaultSetting.studySet.rdOptions}
                              />
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
                    <h3 className={classes.grTitle}>Dictation</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'middle'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Player:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`player`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Checkbox
                                checked={value}
                                onChange={(e) => onChange(e.target.checked)}
                                className={classes.checkbox}
                              >
                                {value ? 'Display' : 'Hide'}
                              </Checkbox>
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Type:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`listeningType`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                value={value}
                                defaultValue={defaultSetting.listening.type.default}
                                onChange={onChange}
                                options={defaultSetting.listening.type.options}
                              />
                            )
                          }}
                        />
                      </Col>

                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Exercise Items:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`numberOfDictationItem`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                style={{ minWidth: 60 }}
                                value={value}
                                defaultValue={defaultSetting.listening.exerciseItemOptions.default}
                                onChange={onChange}
                                options={defaultSetting.listening.exerciseItemOptions.options}
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
                    <h3 className={classes.grTitle}>Community</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'middle'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>Enable Community:</h4>
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
                                className={classes.checkbox}
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
                    <h3 className={classes.grTitle}>References</h3>
                  </Col>

                  <Col xs={24} md={16}>
                    <Row align={'top'} gutter={[token.size, token.size]}>
                      <Col xs={12} md={12}>
                        <h4 className={classes.title}>References:</h4>
                      </Col>

                      <Col xs={12} md={12}>
                        <Controller
                          control={control}
                          name={`references`}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Checkbox.Group
                                options={plainOptions}
                                value={value as number[]}
                                onChange={(e) => onChange(e as number[])}
                                className={classes.checkboxGroup}
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

                <div className={classes.formAction}>
                  <Button type='primary' htmlType='submit'>
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
