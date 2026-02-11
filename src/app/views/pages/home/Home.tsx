import globalStyles from '@/style/appStyle.module.scss'
import { usePrefetchAllIotd, useSelector } from '@/core/hooks'
import { Example } from '@/views/features/example/Example'
import { StudySet } from '@/views/features/studySet/StudySet'
import { Widget } from '@/views/features/widget/Widget'
import { theme, Space, Row, Col, Skeleton } from 'antd'
import { Item } from '@/views/features/item/Item'
import { ExampleMode } from '@/models/example.model'
import registerStyles from '@/views/pages/register/style.module.scss'
import loginStyles from '@/views/pages/login/style.module.scss'
import { Link } from 'react-router-dom'
import { Toolbar } from '@/views/features'
import { ExampleForm } from '@/views/features/example/ExampleForm'

const Home = () => {
  const { token } = theme.useToken()

  const { isAuth } = useSelector((state) => state.auth)
  const { isShowSearchFormItem } = useSelector((state) => state.setting)
  const { word, phrase, idiom, slang, collocation, sentence } = useSelector((state) => state.iotd)

  const { isLoading, isError } = usePrefetchAllIotd(isAuth)

  return (
    <>
      {isAuth && (
        <>
          {isShowSearchFormItem && (
            <div className={globalStyles.stickyBar}>
              <div className={globalStyles.container}>
                <Toolbar pagination={undefined} />
              </div>
            </div>
          )}

          <div className={globalStyles.container}>
            <Space
              direction='vertical'
              size={[token.size, token.size]}
              className={globalStyles.fulWidth}
            >
              <Row justify={'start'} align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={16}>
                  <Widget title={`Study Set`}>
                    <StudySet />
                  </Widget>

                  <Widget title={'Translator!'}>
                    <ExampleForm resetAfterSave={false} mode={ExampleMode.Translation} />
                  </Widget>

                  <Widget title={'Examples!'}>
                    <Example />
                  </Widget>
                </Col>

                <Col xs={24} md={8}>
                  {word?.item && word.item.origin && (
                    <Widget title='Word'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={word.item} />}
                    </Widget>
                  )}

                  {phrase?.item && phrase.item.origin && (
                    <Widget title='Phrase'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={phrase.item} />}
                    </Widget>
                  )}

                  {collocation?.item && collocation.item.origin && (
                    <Widget title='Collocation'>
                      {isLoading && !isError ? (
                        <Skeleton />
                      ) : (
                        <Item reload data={collocation.item} />
                      )}
                    </Widget>
                  )}

                  {sentence?.item && sentence.item.origin && (
                    <Widget title='Sentence'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={sentence.item} />}
                    </Widget>
                  )}

                  {idiom?.item && idiom.item.origin && (
                    <Widget title='Idiom'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={idiom.item} />}
                    </Widget>
                  )}

                  {slang?.item && slang.item.origin && (
                    <Widget title='Slang'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={slang.item} />}
                    </Widget>
                  )}
                </Col>
              </Row>
            </Space>
          </div>
        </>
      )}

      {!isAuth && (
        <Space
          direction='vertical'
          size={[token.size, token.size]}
          className={globalStyles.fulWidth}
        >
          <Row justify={'center'}>
            <Col span={24}>
              <div className={registerStyles.register}>
                <p>
                  Don't have a account? <Link to={'/register'}>Register now!</Link>
                </p>
              </div>
            </Col>
          </Row>

          <Row justify={'center'}>
            <Col span={24}>
              <div className={loginStyles.register}>
                <p>
                  Already have an account? <Link to={'/login'}>Log in</Link>
                </p>
              </div>
            </Col>
          </Row>
        </Space>
      )}
    </>
  )
}

export default Home
