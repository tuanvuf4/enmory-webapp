import globalStyle from '@/style/appStyle'
import { useSelector, useDispatch } from '@/core/hooks'
import { itemApi } from '@/services/firebase/api/item.api'
import { settingAction } from '@/store/reducers/setting.reducer'
import { ExampleForm } from '@/views/features/exampleOverview/exampleFormAdd'
import { ExampleOverView } from '@/views/features/exampleOverview/exampleOverview'
import { StudySet } from '@/views/features/studySet/studySet'
import { Widget } from '@/views/features/widget/widget'
import { theme, Space, Row, Col } from 'antd'
// import About from '../schedule/schedule'
import { Item } from '@/views/features/item/Item'
import { ExampleMode } from '@/models/example.model'
import { usePrompt } from '@/helpers/hooks'
import registerStyle from '@/views/pages/register/style'
import loginStyle from '@/views/pages/login/style'
import { Link } from 'react-router-dom'
import { FormSearchItem } from '@/views/features/formSearchItem/formSearchItem'

const Home = () => {
  const { token } = theme.useToken()

  const gClasses = globalStyle()
  const classesRegister = registerStyle()
  const classesLogin = loginStyle()

  const { openNotification } = usePrompt()

  const { isAuth } = useSelector((state) => state.auth)
  const { isShowSearchFormItem } = useSelector((state) => state.setting)

  const { word, phrase, idiom, slang, collocation, sentence } = useSelector((state) => state.iotd)

  const dispatch = useDispatch()

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
            <div className={gClasses.stickyBar}>
              <div className={gClasses.container}>
                <FormSearchItem filter={false} submit={true} />
              </div>
            </div>
          )}

          <div className={gClasses.container}>
            <Space
              direction='vertical'
              size={[token.size, token.size]}
              className={gClasses.fulWidth}
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
                  {word && word.original && (
                    <Widget title='Word of the day'>
                      <Item reload data={word} onEdit={() => onEdit(word.id || '')} />
                    </Widget>
                  )}

                  {phrase && phrase.original && (
                    <Widget title='Phrase of the day'>
                      <Item reload data={phrase} onEdit={() => onEdit(phrase.id || '')} />
                    </Widget>
                  )}

                  {collocation && collocation.original && (
                    <Widget title='Collocation of the day'>
                      <Item reload data={collocation} onEdit={() => onEdit(collocation.id || '')} />
                    </Widget>
                  )}

                  {sentence && sentence.original && (
                    <Widget title='sentence of the day'>
                      <Item reload data={sentence} onEdit={() => onEdit(sentence.id || '')} />
                    </Widget>
                  )}

                  {idiom && idiom.original && (
                    <Widget title='Idiom of the day'>
                      <Item reload data={idiom} onEdit={() => onEdit(idiom.id || '')} />
                    </Widget>
                  )}

                  {slang && slang.original && (
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
        <Space direction='vertical' size={[token.size, token.size]} className={gClasses.fulWidth}>
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
