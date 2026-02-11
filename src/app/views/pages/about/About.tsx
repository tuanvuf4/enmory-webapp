import clsx from 'clsx'
import globalStyles from '@/style/appStyle.module.scss'
import { Alert } from 'antd'
import { PageTitle } from '@/views/components/pageTitle/PageTitle'

interface IPageNotFoundProps {
  text?: string
}

export const About = ({ text = 'About' }: IPageNotFoundProps) => {
  return (
    <div className={globalStyles.container}>
      <PageTitle content={text} />

      <div className={clsx(globalStyles.contentPage, globalStyles.dark)}>
        <Alert
          message='Feature Not Available'
          description='Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ac nulla volutpat, auctor mauris vel, lobortis mi. Quisque a felis viverra, facilisis purus vitae, cursus enim. Integer non lacinia arcu. Aenean sollicitudin porta purus ac iaculis. Maecenas congue tincidunt arcu vitae pulvinar. Praesent faucibus pellentesque mi suscipit luctus. Ut rhoncus lacus tellus. Proin quis erat posuere diam volutpat sodales. Donec sit amet nibh urna. Sed nec nisl tincidunt, mollis arcu non, blandit turpis. Nunc fringilla, arcu a pellentesque iaculis, nisl ipsum aliquet massa, volutpat volutpat tortor est ac nibh. Nullam ac rutrum justo. Phasellus eget fermentum urna. Vivamus at commodo elit. In quis sapien eu urna pretium congue ac eu augue. Phasellus mattis, sapien sed imperdiet bibendum, lacus erat efficitur elit, in bibendum sapien augue luctus neque.'
          type='info'
          showIcon
        />
      </div>
    </div>
  )
}

export default About
