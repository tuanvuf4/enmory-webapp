import appStyle from '@/style/appStyle.module.scss'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Alert } from 'antd'
import clsx from 'clsx'

export const Listening = () => {
  return (
    <div className={appStyle.container}>
      <PageTitle content={'Practice listening skill'} />

      <div className={clsx(appStyle.contentPage, appStyle.dark)}>
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
