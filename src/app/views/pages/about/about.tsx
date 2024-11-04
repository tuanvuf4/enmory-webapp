import { Col, Row, Space, theme } from 'antd'
import classNames from 'clsx'
import globalStyle from '@/style/appStyle'
import { Link } from 'react-router-dom'

import registerStyle from '../register/style'
import loginStyle from '../login/style'
import { useAppSelector } from '@/app/core/hooks/redux'

const About = () => {
  const { token } = theme.useToken()

  const gClasses = globalStyle()
  const classesLogin = loginStyle()
  const classesRegister = registerStyle()

  const { isAuth } = useAppSelector((state) => state.auth)

  return (
    <div className={gClasses.container}>
      <h2 className={classNames(gClasses.pageTitle)}>About</h2>

      <div className={classNames(gClasses.contentPage)}>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ac nulla volutpat,
          auctor mauris vel, lobortis mi. Quisque a felis viverra, facilisis purus vitae, cursus
          enim. Integer non lacinia arcu. Aenean sollicitudin porta purus ac iaculis. Maecenas
          congue tincidunt arcu vitae pulvinar. Praesent faucibus pellentesque mi suscipit luctus.
          Ut rhoncus lacus tellus. Proin quis erat posuere diam volutpat sodales. Donec sit amet
          nibh urna. Sed nec nisl tincidunt, mollis arcu non, blandit turpis. Nunc fringilla, arcu a
          pellentesque iaculis, nisl ipsum aliquet massa, volutpat volutpat tortor est ac nibh.
          Nullam ac rutrum justo. Phasellus eget fermentum urna. Vivamus at commodo elit. In quis
          sapien eu urna pretium congue ac eu augue. Phasellus mattis, sapien sed imperdiet
          bibendum, lacus erat efficitur elit, in bibendum sapien augue luctus neque.
        </p>

        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ac nulla volutpat,
          auctor mauris vel, lobortis mi. Quisque a felis viverra, facilisis purus vitae, cursus
          enim. Integer non lacinia arcu. Aenean sollicitudin porta purus ac iaculis. Maecenas
          congue tincidunt arcu vitae pulvinar. Praesent faucibus pellentesque mi suscipit luctus.
          Ut rhoncus lacus tellus. Proin quis erat posuere diam volutpat sodales. Donec sit amet
          nibh urna. Sed nec nisl tincidunt, mollis arcu non, blandit turpis. Nunc fringilla, arcu a
          pellentesque iaculis, nisl ipsum aliquet massa, volutpat volutpat tortor est ac nibh.
          Nullam ac rutrum justo. Phasellus eget fermentum urna. Vivamus at commodo elit. In quis
          sapien eu urna pretium congue ac eu augue. Phasellus mattis, sapien sed imperdiet
          bibendum, lacus erat efficitur elit, in bibendum sapien augue luctus neque.
        </p>

        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ac nulla volutpat,
          auctor mauris vel, lobortis mi. Quisque a felis viverra, facilisis purus vitae, cursus
          enim. Integer non lacinia arcu. Aenean sollicitudin porta purus ac iaculis. Maecenas
          congue tincidunt arcu vitae pulvinar. Praesent faucibus pellentesque mi suscipit luctus.
          Ut rhoncus lacus tellus. Proin quis erat posuere diam volutpat sodales. Donec sit amet
          nibh urna. Sed nec nisl tincidunt, mollis arcu non, blandit turpis. Nunc fringilla, arcu a
          pellentesque iaculis, nisl ipsum aliquet massa, volutpat volutpat tortor est ac nibh.
          Nullam ac rutrum justo. Phasellus eget fermentum urna. Vivamus at commodo elit. In quis
          sapien eu urna pretium congue ac eu augue. Phasellus mattis, sapien sed imperdiet
          bibendum, lacus erat efficitur elit, in bibendum sapien augue luctus neque.
        </p>

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
