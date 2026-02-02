import globalStyle from '@/style/appStyle'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Alert } from 'antd'
import clsx from 'clsx'

export const Listening = () => {
  const globalClasses = globalStyle()

  return (
    <div className={globalClasses.container}>
      <PageTitle content={'Practice listening skill'} />

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
