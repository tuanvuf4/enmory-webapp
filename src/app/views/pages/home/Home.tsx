import globalStyle from '@/style/appStyle'
import { usePrefetchAllIotd, useSelector } from '@/core/hooks'
import { ExampleForm } from '@/views/features/exampleOverview/ExampleFormAdd'
import { ExampleOverView } from '@/views/features/exampleOverview/ExampleOverview'
import { StudySet } from '@/views/features/studySet/StudySet'
import { Widget } from '@/views/features/widget/Widget'
import { theme, Space, Row, Col, Skeleton } from 'antd'
import { Item } from '@/views/features/item/Item'
import { ExampleMode } from '@/models/example.model'
import registerStyle from '@/views/pages/register/style'
import loginStyle from '@/views/pages/login/style'
import { Link } from 'react-router-dom'
import { SearchItemForm } from '@/views/features'

const Home = () => {
  const { token } = theme.useToken()
  const globalClasses = globalStyle()
  const classesRegister = registerStyle()
  const classesLogin = loginStyle()

  const { isAuth } = useSelector((state) => state.auth)
  const { isShowSearchFormItem } = useSelector((state) => state.setting)
  const { word, phrase, idiom, slang, collocation, sentence } = useSelector((state) => state.iotd)

  const { isLoading, results } = usePrefetchAllIotd(isAuth)

  console.log(`*** results *** `, results)

  return (
    <>
      {isAuth && (
        <>
          {isShowSearchFormItem && (
            <div className={globalClasses.stickyBar}>
              <div className={globalClasses.container}>
                <SearchItemForm filter={false} submit={true} />
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

                  <Widget title={'Translation Challenge'}>
                    <ExampleForm showSelectMode mode={ExampleMode.Translation} />
                  </Widget>

                  <Widget title={'Review Example'}>
                    <ExampleOverView />
                  </Widget>
                </Col>

                <Col xs={24} md={8}>
                  <>
                    {isLoading ? (
                      <Skeleton />
                    ) : (
                      <>
                        {word && word.origin && (
                          <Widget title='Word of the day'>
                            <Item reload data={word} />
                          </Widget>
                        )}
                      </>
                    )}
                  </>

                  {phrase && phrase.origin && (
                    <Widget title='Phrase of the day'>
                      <Item reload data={phrase} />
                    </Widget>
                  )}

                  {collocation && collocation.origin && (
                    <Widget title='Collocation of the day'>
                      <Item reload data={collocation} />
                    </Widget>
                  )}

                  {sentence && sentence.origin && (
                    <Widget title='sentence of the day'>
                      <Item reload data={sentence} />
                    </Widget>
                  )}

                  {idiom && idiom.origin && (
                    <Widget title='Idiom of the day'>
                      <Item reload data={idiom} />
                    </Widget>
                  )}

                  {slang && slang.origin && (
                    <Widget title='Slang of the day'>
                      <Item reload data={slang} />
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
                  Don't have a account? <Link to={'/Register'}>Register now!</Link>
                </p>
              </div>
            </Col>
          </Row>

          <Row justify={'center'}>
            <Col span={24}>
              <div className={classesLogin.register}>
                <p>
                  Already have an account? <Link to={'/Login'}>Log in</Link>
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
