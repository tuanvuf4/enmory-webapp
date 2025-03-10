import globalStyle from '@/style/appStyle'
import { useAppSelector, useAppDispatch } from '@/core/hooks'
import { transformItemModelToClient } from '@/helpers/item'
import { itemApi } from '@/services/api'
import { settingAction } from '@/store/reducers/setting.reducer'
import { ExampleForm } from '@/views/features/exampleOverview/exampleFormAdd'
import { ExampleOverView } from '@/views/features/exampleOverview/exampleOverview'
import { FormSearchItem } from '@/views/features/formSearchItem/formSearchItem'
import { StudySet } from '@/views/features/studySet/studySet'
import { Widget } from '@/views/features/widget/widget'
import { theme, Space, Row, Col } from 'antd'
import About from '../about/about'
import { Item } from '@/views/features/item/Item'
import { ExampleMode } from '@/models/example.model'
import { usePrompt } from '@/helpers/hooks'

const Home = () => {
  const { token } = theme.useToken()

  const gClasses = globalStyle()

  const { openNotification } = usePrompt()

  const { isAuth } = useAppSelector((state) => state.auth)
  const { isShowSearchFormItem } = useAppSelector((state) => state.setting)

  const { word, phrase, idiom, slang, collocation, sentence } = useAppSelector(
    (state) => state.iotd,
  )

  const dispatch = useAppDispatch()

  const onEdit = async (id: number) => {
    try {
      const { content } = await itemApi.getItemById(id)
      dispatch(
        settingAction.setCurrentItem({
          ...transformItemModelToClient(content),
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
          {/* {isShowSearchFormItem && (
            <div className={gClasses.stickyBar}>
              <div className={gClasses.container}>
                <FormSearchItem filter={false} submit={true} />
              </div>
            </div>
          )} */}

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
                      <Item
                        active
                        reload
                        data={word}
                        type='full'
                        onEdit={() => onEdit(word.id as number)}
                      />
                    </Widget>
                  )}

                  {phrase && phrase.original && (
                    <Widget title='Phrase of the day'>
                      <Item
                        active
                        reload
                        data={phrase}
                        type='full'
                        onEdit={() => onEdit(phrase.id as number)}
                      />
                    </Widget>
                  )}

                  {collocation && collocation.original && (
                    <Widget title='Collocation of the day'>
                      <Item
                        active
                        reload
                        data={collocation}
                        type='full'
                        onEdit={() => onEdit(collocation.id as number)}
                      />
                    </Widget>
                  )}

                  {sentence && sentence.original && (
                    <Widget title='sentence of the day'>
                      <Item
                        active
                        reload
                        data={sentence}
                        type='full'
                        onEdit={() => onEdit(sentence.id as number)}
                      />
                    </Widget>
                  )}

                  {idiom && idiom.original && (
                    <Widget title='Idiom of the day'>
                      <Item
                        active
                        reload
                        data={idiom}
                        type='full'
                        onEdit={() => onEdit(idiom.id as number)}
                      />
                    </Widget>
                  )}

                  {slang && slang.original && (
                    <Widget title='Slang of the day'>
                      <Item
                        active
                        reload
                        data={slang}
                        type='full'
                        onEdit={() => onEdit(slang.id as number)}
                      />
                    </Widget>
                  )}
                </Col>
              </Row>
            </Space>
          </div>
        </>
      )}

      {!isAuth && <About />}
    </>
  )
}

export default Home
