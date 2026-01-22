import React from 'react'
import { useSelector } from '@/core/hooks/redux'
import { Col, Row, Space, theme } from 'antd'
import styles from './style'
import globalStyle from '@/style/appStyle'
import { SearchItemForm } from '../searchItemForm'

interface IProps {
  formSearch?: React.JSX.Element
  pagination?: React.JSX.Element
}

export const Toolbar = ({ formSearch = <SearchItemForm />, pagination }: IProps) => {
  const { token } = theme.useToken()

  const classes = styles()
  const globalClasses = globalStyle()

  const { isShowSearchFormItem } = useSelector((state) => state.setting)

  return (
    <div className={classes.toolbar}>
      <Space
        direction='vertical'
        size={[token.size, token.size]}
        className={globalClasses.fulWidth}
      >
        <Row
          justify={isShowSearchFormItem ? 'space-between' : 'end'}
          align={'top'}
          gutter={[token.size / 2, token.size / 2]}
        >
          {isShowSearchFormItem && (
            <Col xs={24} sm={12} md={15} lg={14}>
              {formSearch}
            </Col>
          )}

          <Col xs={24} sm={12} md={9} lg={10}>
            <Row justify={'end'} gutter={[token.size / 2, token.size / 2]}>
              <Col>{pagination}</Col>

              {/* <Col>
                <ViewMode />
              </Col> */}
            </Row>
          </Col>
        </Row>
      </Space>
    </div>
  )
}
