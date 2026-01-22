import { Timeline } from 'antd'
import classNames from 'clsx'
import globalStyle from '@/style/appStyle'

const Schedule = () => {
  const globalClasses = globalStyle()

  const timeline = [
    {
      label: '8:00 - 10:00 (2 hours)',
      children: 'Review and learn new words',
    },
    {
      children: 'Speak with Elsa app',
    },
    {
      label: '10:30 - 12:30 (2 hours)',
      children: 'Listening (dictation / taking notes)',
    },
    {
      children: 'Watching videos (listening + imitating)',
    },
    {
      label: '15:00 - 17:00 (2 hours)',
      children: 'Review words of the day',
    },
    {
      children: 'Reading an article (aloud)',
    },
    {
      label: '20:00 - 24:00',
      children: 'Review words of the day',
    },
    {
      children: 'Speak with Elsa app',
    },
    {
      children: 'Listen to podcast/stories/YouTube (imitate)',
    },
  ]

  return (
    <div className={globalClasses.container}>
      <h2 className={classNames(globalClasses.pageTitle)}>Schedule</h2>

      <div className={classNames(globalClasses.contentPage, '!pt-24')}>
        <Timeline mode={'left'} items={timeline} />

        {/* {!isAuth && (
          <Space direction='vertical' size={[token.size, token.size]} className={globalClasses.fulWidth}>
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
        )} */}
      </div>
    </div>
  )
}

export default Schedule
