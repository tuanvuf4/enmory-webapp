import React from 'react'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { Button, Col, Row, Space, theme } from 'antd'
import styles from './style'
import globalStyle from '@/style/appStyle'
import classNames from 'clsx'
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'
import { SearchItemForm } from '../searchItemForm'
import { ViewMode } from '../viewMode'

interface IProps {
  formSearch?: React.JSX.Element
  pagination?: React.JSX.Element
}

export const Toolbar = ({ formSearch = <SearchItemForm />, pagination }: IProps) => {
  const { token } = theme.useToken()

  const classes = styles()
  const globalClasses = globalStyle()

  const dispatch = useDispatch()

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
