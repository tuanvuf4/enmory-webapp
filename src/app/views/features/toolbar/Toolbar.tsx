import React from 'react'
import { useDispatch, useSelector } from '@/core/hooks/redux'
import { Button, Col, Row, Space, theme } from 'antd'
import styles from './style'
import { FormSearchItem } from '../formSearchItem/FormSearchItem'
import globalStyle from '@/style/appStyle'
import classNames from 'clsx'
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons'
import { settingAction } from '@/store/reducers/setting.reducer'

interface IProps {
  formSearch?: React.JSX.Element
  pagination?: React.JSX.Element
}

export const Toolbar = ({ formSearch = <FormSearchItem />, pagination }: IProps) => {
  const { token } = theme.useToken()

  const classes = styles()
  const globalClasses = globalStyle()

  const dispatch = useDispatch()

  const { isShowSearchForm } = useSelector((state) => state.setting)

  return (
    <div className={classes.toolbar}>
      <Space
        direction='vertical'
        size={[token.size, token.size]}
        className={globalClasses.fulWidth}
      >
        <Row justify={'space-between'} align={'top'} gutter={[token.size / 2, token.size / 2]}>
          <Col
            xs={24}
            sm={12}
            md={15}
            lg={14}
            className={classNames(isShowSearchForm ? classes.toggleForm : '')}
          >
            {formSearch}
          </Col>

          <Col xs={24} sm={12} md={9} lg={10}>
            <Row justify={'end'} gutter={[token.size / 2, token.size / 2]}>
              <Col className={globalClasses.toXs}>
                <Button
                  type='text'
                  size='small'
                  onClick={() => dispatch(settingAction.toggleSearchForm())}
                  className={classes.btnToggle}
                >
                  {isShowSearchForm ? <CaretDownOutlined /> : <CaretUpOutlined />}
                </Button>
              </Col>

              <Col>{pagination}</Col>

              {/* <Col> */}
              {/* <ViewMode></ViewMode> */}
              {/* </Col> */}
            </Row>
          </Col>
        </Row>
      </Space>
    </div>
  )
}
