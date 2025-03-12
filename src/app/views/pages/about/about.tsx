import { Col, Flex, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import { Link } from 'react-router-dom'
import Style from './style'
import registerStyle from '../register/style'
import loginStyle from '../login/style'
import { useAppSelector } from '@/app/core/hooks/redux'

const About = () => {
  const { token } = theme.useToken()

  const gClasses = globalStyle()
  const style = Style()
  const classesLogin = loginStyle()
  const classesRegister = registerStyle()

  const { isAuth } = useAppSelector((state) => state.auth)

  return (
    <div className={gClasses.container}>
      <h2 className={classNames(gClasses.pageTitle)}>About</h2>

      <div className={classNames(gClasses.contentPage)}>
        <Row className={style.item} gutter={[token.size / 2, token.size / 2]}>
          <Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
            <h2>8:00 am - 10:00 am (2 hours)</h2>

            <ul>
              <li>Review and learn new words</li>
              <li>Speak with Elsa app</li>
            </ul>
          </Col>

          <Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
            <h2>10:30 am - 12:30 am (2 hours)</h2>

            <ul>
              <li>Listening (dictation / taking notes)</li>
              <li>Watching videos (listening + imitating)</li>
            </ul>
          </Col>

          <Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
            <h2>3:00 pm - 5:00 pm (2 hours)</h2>

            <ul>
              <li>Reading an article (aloud)</li>
              <li>Review words</li>
            </ul>
          </Col>

          <Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
            <h2>8:00 pm - 12:00 pm (4 hours)</h2>

            <ul>
              <li>Review words</li>
              <li>Speak with Elsa app</li>
              <li>Listen to podcast/stories/YouTube (imitate)</li>
            </ul>
          </Col>
        </Row>

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
      </div>
    </div>
  )
}

export default About
