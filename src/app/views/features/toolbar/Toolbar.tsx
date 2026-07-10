import React from 'react'
import { useSelector } from '@/core/hooks/redux'
import { Col, Row, Space, theme } from 'antd'
import appStyle from '@/style/appStyle.module.scss'
import { SearchItemForm } from '../searchItemForm'

interface IProps {
  formSearch?: React.JSX.Element
  pagination?: React.JSX.Element
}

export const Toolbar = ({ formSearch = <SearchItemForm />, pagination }: IProps) => {
  const { token } = theme.useToken()

  const { isShowSearchFormItem } = useSelector((state) => state.setting)

  if (!isShowSearchFormItem) return null

  return (
    <div className={appStyle.stickyBar}>
      <div className={appStyle.container}>
        <div>
          <Space direction='vertical' size={[token.size, token.size]} className={appStyle.fulWidth}>
            <Row
              justify={isShowSearchFormItem ? 'space-between' : 'end'}
              align={'top'}
              gutter={[0, token.size / 2]}
            >
              {isShowSearchFormItem && (
                <Col
                  xs={24}
                  sm={pagination ? 12 : 24}
                  md={pagination ? 15 : 24}
                  lg={pagination ? 14 : 24}
                >
                  {formSearch}
                </Col>
              )}

              {pagination && (
                <Col xs={24} sm={12} md={9} lg={10}>
                  <Row justify={'end'} gutter={[token.size / 2, token.size / 2]}>
                    <Col>{pagination}</Col>

                    {/* <Col> <ViewMode /> </Col> */}
                  </Row>
                </Col>
              )}
            </Row>
          </Space>
        </div>
      </div>
    </div>
  )
}
