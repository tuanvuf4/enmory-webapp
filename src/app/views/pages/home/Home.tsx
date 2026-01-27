import globalStyle from '@/style/appStyle'
import { usePrefetchAllIotd, useSelector } from '@/core/hooks'
import { ExampleOverView } from '@/views/features/exampleOverview/ExampleOverview'
import { StudySet } from '@/views/features/studySet/StudySet'
import { Widget } from '@/views/features/widget/Widget'
import { theme, Space, Row, Col, Skeleton } from 'antd'
import { Item } from '@/views/features/item/Item'
import { ExampleMode } from '@/models/example.model'
import registerStyle from '@/views/pages/register/style'
import loginStyle from '@/views/pages/login/style'
import { Link } from 'react-router-dom'
import { Toolbar } from '@/views/features'
import { ExampleForm } from '@/views/features/exampleOverview/ExampleForm'

const Home = () => {
  const { token } = theme.useToken()
  const globalClasses = globalStyle()
  const classesRegister = registerStyle()
  const classesLogin = loginStyle()

  const { isAuth } = useSelector((state) => state.auth)
  const { isShowSearchFormItem } = useSelector((state) => state.setting)
  const { word, phrase, idiom, slang, collocation, sentence } = useSelector((state) => state.iotd)

  const { isLoading, isError } = usePrefetchAllIotd(isAuth)

  return (
    <>
      {isAuth && (
        <>
          {isShowSearchFormItem && (
            <div className={globalClasses.stickyBar}>
              <div className={globalClasses.container}>
                <Toolbar pagination={undefined} />
              </div>
            </div>
          )}

          <div className={globalClasses.container}>
            <Space
              direction='vertical'
              size={[token.size, token.size]}
              className={globalClasses.fulWidth}
            >
              <Row justify={'start'} align={'top'} gutter={[token.size, token.size]}>
                <Col xs={24} md={16}>
                  <Widget title={`Study Set`}>
                    <StudySet />
                  </Widget>

                  <Widget title={'Translator!'}>
                    <ExampleForm showSelect mode={ExampleMode.Translation} />
                  </Widget>

                  <Widget title={'Review Example'}>
                    <ExampleOverView />
                  </Widget>
                </Col>

                <Col xs={24} md={8}>
                  {word?.item && word.item.origin && (
                    <Widget title='Word of the day'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={word.item} />}
                    </Widget>
                  )}

                  {phrase?.item && phrase.item.origin && (
                    <Widget title='Phrase of the day'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={phrase.item} />}
                    </Widget>
                  )}

                  {collocation?.item && collocation.item.origin && (
                    <Widget title='Collocation of the day'>
                      {isLoading && !isError ? (
                        <Skeleton />
                      ) : (
                        <Item reload data={collocation.item} />
                      )}
                    </Widget>
                  )}

                  {sentence?.item && sentence.item.origin && (
                    <Widget title='Sentence of the day'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={sentence.item} />}
                    </Widget>
                  )}

                  {idiom?.item && idiom.item.origin && (
                    <Widget title='Idiom of the day'>
                      {isLoading && !isError ? <Skeleton /> : <Item reload data={idiom.item} />}
                    </Widget>
                  )}

                  {slang?.item && slang.item.origin && (
                    <Widget title='Slang of the day'>
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
          className={globalClasses.fulWidth}
        >
          <Row justify={'center'}>
            <Col span={24}>
              <div className={classesRegister.register}>
                <p>
                  Don't have a account? <Link to={'/register'}>Register now!</Link>
                </p>
              </div>
            </Col>
          </Row>

          <Row justify={'center'}>
            <Col span={24}>
              <div className={classesLogin.register}>
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
