import appStyle from '@/style/appStyle.module.scss'
import { useItem, usePrefetchAllIotd, useSelector } from '@/core/hooks'
import { Example } from '@/views/features/example/Example'
import { StudySet } from '@/views/features/studySet/StudySet'
import { Checklist } from '@/views/features/checklist'
import { Widget } from '@/views/features/widget/Widget'
import { theme, Space, Row, Col, Skeleton } from 'antd'
import { Item } from '@/views/features/item/Item'
import { ExampleMode } from '@/models/example.model'
import { IIotdDoc } from '@/models/item.model'
import { Link } from 'react-router-dom'
import { ExampleForm } from '@/views/features/example/ExampleForm'

interface IIotdItemCardProps {
  iotd?: IIotdDoc | null
  title?: string
  isLoadingPrefetch?: boolean
}

const IotdItemCard: React.FC<IIotdItemCardProps> = ({ iotd, title, isLoadingPrefetch }) => {
  const itemId = iotd?.itemId || (iotd as any)?.item?.id
  const { data: item, isLoading } = useItem(itemId || '', !!itemId)

  if (!itemId) return null

  if (isLoading || isLoadingPrefetch) {
    return (
      <Widget title={title}>
        <Skeleton />
      </Widget>
    )
  }

  const displayItem = item || (iotd as any)?.item
  if (!displayItem || !displayItem.origin) return null

  return (
    <Widget title={title}>
      <Item reload data={displayItem} />
    </Widget>
  )
}

const Home = () => {
  const { token } = theme.useToken()

  const { isAuth } = useSelector((state) => state.auth)
  const iotdState = useSelector((state) => state.iotd) || {}
  const {
    word = null,
    phrase = null,
    idiom = null,
    slang = null,
    collocation = null,
    sentence = null,
  } = iotdState

  const { isLoading, isError } = usePrefetchAllIotd(isAuth)

  return (
    <>
      {isAuth && (
        <div className={appStyle.container}>
          <Row justify={'start'} align={'top'} gutter={token.size * 1.5}>
            <Col xs={24} sm={14} md={14}>
              <Space direction='vertical' size={token.size * 1.5} style={{ width: '100%' }}>
                <Widget title={'Checklist'}>
                  <Checklist />
                </Widget>

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

            <Col xs={24} sm={10} md={10}>
              <Space direction='vertical' size={token.size * 1.5}>
                <IotdItemCard
                  iotd={word}
                  title={'Items of the day'}
                  isLoadingPrefetch={isLoading && !isError}
                />
                <IotdItemCard iotd={phrase} isLoadingPrefetch={isLoading && !isError} />
                <IotdItemCard iotd={collocation} isLoadingPrefetch={isLoading && !isError} />
                <IotdItemCard iotd={sentence} isLoadingPrefetch={isLoading && !isError} />
                <IotdItemCard iotd={idiom} isLoadingPrefetch={isLoading && !isError} />
                <IotdItemCard iotd={slang} isLoadingPrefetch={isLoading && !isError} />
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
