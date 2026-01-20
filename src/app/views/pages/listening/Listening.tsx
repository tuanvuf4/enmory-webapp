import globalStyle from '@/style/appStyle'
import { Alert } from 'antd'
import clsx from 'clsx'

export const Listening = () => {
  const globalClasses = globalStyle()

  return (
    <div className={globalClasses.container}>
      <h2 className={clsx(globalClasses.pageTitle)}>Practice listening skill</h2>

      <div className={clsx(globalClasses.contentPage, globalClasses.dark)}>
        <Alert
          message='Feature Not Available'
          description='The listening practice feature is currently unavailable. Media API has not been implemented yet.'
          type='info'
          showIcon
        />
      </div>
    </div>
  )
}

export default Listening
