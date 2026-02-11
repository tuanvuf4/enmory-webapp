import globalStyles from "@/style/appStyle.module.scss"
import { PageTitle } from '@/views/components/pageTitle/PageTitle'
import { Alert } from 'antd'
import clsx from 'clsx'

export const Listening = () => {
  

  return (
    <div className={globalStyles.container}>
      <PageTitle content={'Practice listening skill'} />

      <div className={clsx(globalStyles.contentPage, globalStyles.dark)}>
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
