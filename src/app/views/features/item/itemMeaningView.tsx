import { AudioOutlined, CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons'
import { defaultSetting } from '@/config/appConfig'
import { useAppDispatch } from '@/core/hooks'
import { getTypeOfItem } from '@/helpers/item'
import { IMeaning, ECategory, EType } from '@/models/item.model'
import { itemAsync } from '@/store/async/item.async'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Tags } from '@/views/components/tags/tags'
import { theme, Row, Col, Button } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './style'
import clsx from 'clsx'
import { useState } from 'react'

interface IMeaningProps {
  meaning: IMeaning<string[]>
  catId: ECategory
  active?: boolean
}

const Pronunciation = ({ catId, meaning }: { catId: ECategory; meaning: IMeaning<string[]> }) => {
  const classes = styles()

  if (catId === ECategory.WORD && (meaning.pronunciation.us || meaning.pronunciation.uk)) {
    return (
      <div className={`${classes.pronouns} flex flex-wrap gap-x-4 gap-y-1 items-center`}>
        {meaning.pronunciation.uk && (
          <div className={classes.audio}>
            {/* <span className={classes.accent}>UK</span> */}
            <AudioOutlined className={classes.audioIcon} />
            {meaning.pronunciation?.uk || ''}
          </div>
        )}

        {meaning.pronunciation.us && (
          <div className={classes.audio}>
            {/* <span className={classes.accent}>US</span> */}
            <AudioOutlined className={classes.audioIcon} />
            {meaning.pronunciation?.us || ''}
          </div>
        )}
      </div>
    )
  }

  if (catId !== ECategory.WORD && meaning.pronunciation.common) {
    return (
      <div className={classes.pronouns}>
        <div className={classes.audio}>
          <AudioOutlined className={classes.audioIcon} />
          {meaning.pronunciation?.common || ''}
        </div>
      </div>
    )
  }

  return null
}

export const MeaningItemView: React.FC<IMeaningProps> = ({ catId, meaning, active = false }) => {
  const { token } = theme.useToken()
  const classes = styles()

  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const [show, setShow] = useState<boolean>(false)

  const onSearch = (keyword: string) => {
    dispatch(settingAction.updateViewItemModal(false))
    dispatch(
      itemAction.updatePagination({
        page: 0,
        size: defaultSetting.pagination.size,
      }),
    )
    dispatch(
      itemAction.updateSearchFormValue({
        keyword: keyword,
        cat: ECategory.ALL,
        type: EType.ALL,
        archive: false,
        defect: false,
      }),
    )
    if (location.pathname.includes('library')) {
      dispatch(
        itemAsync.fetchItems({
          keyword: keyword,
          page: 0,
          size: defaultSetting.pagination.size,
          cat: ECategory.ALL,
          type: EType.ALL,
          archive: false,
          defect: false,
        }),
      )
    } else {
      navigate('/library')
    }
  }

  return (
    <div className={'relative my-4'}>
      <div
        className={'!p-0 text-center absolute z-10'}
        style={{
          left: '-19px',
          height: '100%',
        }}
      >
        <Button
          className={'!p-0'}
          type={'text'}
          onClick={() => setShow((prev) => !prev)}
          style={{
            position: 'absolute',
            top: '-16px',
          }}
          icon={
            <CaretDownOutlined
              style={{
                fontSize: 16,
                color: show ? token.colorPrimary : active ? token.colorText : token.colorWhite,
                backgroundColor: 'transparent',
                padding: 4,
              }}
            />
          }
        />

        <Button
          className={'!p-0'}
          type={'text'}
          onClick={() => setShow((prev) => !prev)}
          style={{
            position: 'absolute',
            bottom: '-16px',
          }}
          icon={
            <CaretUpOutlined
              style={{
                fontSize: 16,
                color: show ? token.colorPrimary : active ? token.colorText : token.colorWhite,
                backgroundColor: 'transparent',
                padding: 4,
              }}
            />
          }
        />
      </div>

      <div
        className={clsx(
          classes.meaningItem,
          meaning.enable ? '' : classes.disableMeaning,
          meaning.common ? classes.meaningCommon : '',
          meaning.translation ? '' : classes.disableMeaning,
        )}
      >
        <Row align={'middle'}>
          {(meaning.pronunciation.uk ||
            meaning.pronunciation.us ||
            meaning.pronunciation.common) && (
            <Col span={18}>
              <Pronunciation catId={catId} meaning={meaning} />{' '}
            </Col>
          )}

          {catId === ECategory.WORD && (
            <Col
              span={6}
              className={`m-0 p-0 ${
                meaning.pronunciation.uk || meaning.pronunciation.us || meaning.pronunciation.common
                  ? 'text-right'
                  : 'text-left'
              } `}
            >
              {getTypeOfItem(meaning.typeId)}
            </Col>
          )}
        </Row>

        {!show && (
          <h3
            className={classes.translate}
            dangerouslySetInnerHTML={{ __html: meaning.translation }}
          />
        )}

        {show && (
          <>
            {meaning.note && (
              <div className={classes.note} dangerouslySetInnerHTML={{ __html: meaning.note }} />
            )}

            {meaning.definition && (
              <h3
                className={classes.definition}
                dangerouslySetInnerHTML={{ __html: meaning.definition }}
              />
            )}

            {meaning.translation && (
              <h3
                className={classes.translate}
                dangerouslySetInnerHTML={{ __html: meaning.translation }}
              />
            )}

            {meaning.collocations && (
              <ul className={classes.listItem}>
                {meaning.collocations
                  .replace(/\n/g, '*')
                  .replace(/- /g, '')
                  .split('*')
                  .map((value, key) => (value ? <li key={key}>{value}</li> : ''))}
              </ul>
            )}

            {meaning.grammar && (
              <ul className={classes.listItem}>
                {meaning.grammar
                  .replace(/\n/g, '*')
                  .replace(/- /g, '')
                  .split('*')
                  .map((value, key) => (value ? <li key={key}>{value}</li> : ''))}
              </ul>
            )}

            {meaning.synonyms.filter((item) => item).length > 0 && meaning.synonyms.length > 0 && (
              <Tags label={'Synonyms'} tags={meaning.synonyms} onSearch={onSearch} />
            )}

            {meaning.antonyms.filter((item) => item).length > 0 && meaning.antonyms.length > 0 && (
              <Tags label={'Antonyms'} tags={meaning.antonyms} onSearch={onSearch} />
            )}

            {meaning.examples.filter((item) => item).length > 0 && meaning.examples.length > 0 && (
              <div className={classes.examples}>
                {/* <h4>Example:</h4> */}
                <ul>
                  {meaning.examples.map((example, key) => {
                    return (
                      <li key={key} className={classes.exampleItem}>
                        <ul>
                          <li className={classes.nestedExampleItem}>{example.original}</li>
                          <li className={classes.nestedExampleItem}>{example.translation}</li>
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
