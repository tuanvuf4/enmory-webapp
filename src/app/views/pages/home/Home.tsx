import globalStyle from '@/style/appStyle'
import { useSelector, useDispatch } from '@/core/hooks'
import { itemApi } from '@/services/firebase/api/item.api'
import { settingAction } from '@/store/reducers/setting.reducer'
import { ExampleForm } from '@/views/features/exampleOverview/ExampleFormAdd'
import { ExampleOverView } from '@/views/features/exampleOverview/ExampleOverview'
import { StudySet } from '@/views/features/studySet/StudySet'
import { Widget } from '@/views/features/widget/Widget'
import { theme, Space, Row, Col } from 'antd'
// import About from '../schedule/Schedule'
import { Item } from '@/views/features/item/Item'
import { ExampleMode } from '@/models/example.model'
import { usePrompt } from '@/helpers/hooks'
import registerStyle from '@/views/pages/register/style'
import loginStyle from '@/views/pages/login/style'
import { Link } from 'react-router-dom'
import { FormSearchItem } from '@/views/features/formSearchItem/FormSearchItem'
import { useAllIotd } from '@/core/hooks/useCommon'
import { ECategory } from '@/models/item.model'

const Home = () => {
  const { token } = theme.useToken()

  const globalClasses = globalStyle()
  const classesRegister = registerStyle()
  const classesLogin = loginStyle()

  const { openNotification } = usePrompt()

  const { isAuth } = useSelector((state) => state.auth)
  const { isShowSearchFormItem } = useSelector((state) => state.setting)

  const { word, phrase, idiom, slang, collocation, sentence } = useSelector((state) => state.iotd)

  const dispatch = useDispatch()

  // Fetch all IOTD categories when authenticated
  useAllIotd(isAuth)

  const onEdit = async (id: string) => {
    try {
      const { content } = await itemApi.getItemById(id)
      dispatch(
        settingAction.setCurrentItem({
          ...content,
        }),
      )
      dispatch(settingAction.setOnEditItem(true))
      dispatch(settingAction.toggleItemModal())
    } catch (error) {
      openNotification({ type: 'error', message: JSON.stringify(error) })
    }
  }

  return (
    <>
      {isAuth && (
        <>
          {isShowSearchFormItem && (
            <div className={globalClasses.stickyBar}>
              <div className={globalClasses.container}>
                <FormSearchItem filter={false} submit={true} />
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
                  {word && word.origin && (
                    <Widget title='Word of the day'>
                      <Item reload data={word} onEdit={() => onEdit(word.id || '')} />
                    </Widget>
                  )}

                  {phrase && phrase.origin && (
                    <Widget title='Phrase of the day'>
                      <Item reload data={phrase} onEdit={() => onEdit(phrase.id || '')} />
                    </Widget>
                  )}

                  {collocation && collocation.origin && (
                    <Widget title='Collocation of the day'>
                      <Item reload data={collocation} onEdit={() => onEdit(collocation.id || '')} />
                    </Widget>
                  )}

                  {sentence && sentence.origin && (
                    <Widget title='sentence of the day'>
                      <Item reload data={sentence} onEdit={() => onEdit(sentence.id || '')} />
                    </Widget>
                  )}

                  {idiom && idiom.origin && (
                    <Widget title='Idiom of the day'>
                      <Item reload data={idiom} onEdit={() => onEdit(idiom.id || '')} />
                    </Widget>
                  )}

                  {slang && slang.origin && (
                    <Widget title='Slang of the day'>
                      <Item reload data={slang} onEdit={() => onEdit(slang.id || '')} />
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
