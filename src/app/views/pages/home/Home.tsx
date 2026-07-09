import appStyle from '@/style/appStyle.module.scss'
import { usePrefetchAllIotd, useSelector } from '@/core/hooks'
import { Example } from '@/views/features/example/Example'
import { StudySet } from '@/views/features/studySet/StudySet'
import { Widget } from '@/views/features/widget/Widget'
import { theme, Space, Row, Col, Skeleton } from 'antd'
import { Item } from '@/views/features/item/Item'
import { ExampleMode } from '@/models/example.model'
import { Link } from 'react-router-dom'
import { ExampleForm } from '@/views/features/example/ExampleForm'
import styles from './style.module.scss'

const Home = () => {
  const { token } = theme.useToken()

  const { isAuth } = useSelector((state) => state.auth)
  const iotdState = useSelector((state) => state.iotd) || {}
  const {
    word = {} as any,
    phrase = {} as any,
    idiom = {} as any,
    slang = {} as any,
    collocation = {} as any,
    sentence = {} as any,
  } = iotdState

  const { isLoading, isError } = usePrefetchAllIotd(isAuth)

  return (
    <>
      {isAuth && (
        <div className={appStyle.container}>
          <Row
            justify={'start'}
            align={'top'}
            gutter={token.size * 1.5}
            className={styles.homeGrid}
          >
            <Col xs={24} md={14}>
              <Space direction='vertical' size={token.size * 1.5}>
                <Widget title={`Study Set`}>
                  <StudySet />
                </Widget>

                <Widget title={'Translator'}>
                  <ExampleForm resetAfterSave={false} mode={ExampleMode.Translation} />
                </Widget>

                <Widget title={'Examples'}>
                  <Example />
                </Widget>
              </Space>
            </Col>

            <Col xs={24} md={10}>
              <Space direction='vertical' size={token.size * 1.5}>
                {word?.item && word.item.origin && (
                  <Widget title={'Items of the day'}>
                    {isLoading && !isError ? <Skeleton /> : <Item reload data={word.item} />}
                  </Widget>
                )}

                {phrase?.item && phrase.item.origin && (
                  <Widget>
                    {isLoading && !isError ? <Skeleton /> : <Item reload data={phrase.item} />}
                  </Widget>
                )}

                {collocation?.item && collocation.item.origin && (
                  <Widget>
                    {isLoading && !isError ? <Skeleton /> : <Item reload data={collocation.item} />}
                  </Widget>
                )}

                {sentence?.item && sentence.item.origin && (
                  <Widget>
                    {isLoading && !isError ? <Skeleton /> : <Item reload data={sentence.item} />}
                  </Widget>
                )}

                {idiom?.item && idiom.item.origin && (
                  <Widget>
                    {isLoading && !isError ? <Skeleton /> : <Item reload data={idiom.item} />}
                  </Widget>
                )}

                {slang?.item && slang.item.origin && (
                  <Widget>
                    {isLoading && !isError ? <Skeleton /> : <Item reload data={slang.item} />}
                  </Widget>
                )}
              </Space>
            </Col>
          </Row>
        </div>
      )}

      {!isAuth && (
        <Space direction='vertical' size={[token.size, token.size]} className={appStyle.fulWidth}>
          <Row justify={'center'}>
            <Col span={24}>
              <div className={'text-center'}>
                <p>
                  Don't have a account? <Link to={'/register'}>Register now!</Link>
                </p>
              </div>
            </Col>
          </Row>

          <Row justify={'center'}>
            <Col span={24}>
              <div className={'text-center'}>
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
