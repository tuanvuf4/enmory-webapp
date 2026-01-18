import { AudioOutlined } from '@ant-design/icons'
import { setting } from '@/config/appConfig'
import { useDispatch } from '@/core/hooks'
import { getTypeOfItem } from '@/helpers/item'
import { IMeaning, ECategory, EType } from '@/models/item.model'
import { itemAsync } from '@/store/asyncActions/item.async'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Tags } from '@/views/components/tags/tags'
import { theme, Row, Col } from 'antd'
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

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const [show, setShow] = useState<boolean>(false)

  const onSearch = (keyword: string) => {
    dispatch(settingAction.updateViewItemModal(false))
    dispatch(
      itemAction.updatePagination({
        page: 0,
        size: setting.pagination.size,
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
          size: setting.pagination.size,
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
        className={clsx(
          classes.meaningItem,
          meaning.enable ? '' : classes.disableMeaning,
          meaning.common ? classes.meaningCommon : '',
          meaning.translation || meaning.definition ? '' : classes.disableMeaning,
          'cursor-pointer',
        )}
        onDoubleClick={() => setShow((prev) => !prev)}
      >
        <Row align={'middle'} className={`select-none`}>
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
              {getTypeOfItem(meaning.typeId).origin}
            </Col>
          )}
        </Row>

        {!show && (
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
          </>
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
              <>
                <h5 className={'italic'}>Collocations:</h5>
                <div dangerouslySetInnerHTML={{ __html: meaning.collocations }} />
                {/* <ul className={classes.listItem}>
                  {meaning.collocations
                    .replace(/\n/g, '*')
                    .replace(/- /g, '')
                    .split('*')
                    .map((value, key) => (value ? <li key={key}>{value}</li> : ''))}
                </ul> */}
              </>
            )}

            {meaning.grammar && (
              <>
                <h5 className={'italic'}>Grammar:</h5>
                <div dangerouslySetInnerHTML={{ __html: meaning.grammar }} />
                {/* <ul className={classes.listItem}>
                  {meaning.grammar
                    .replace(/\n/g, '*')
                    .replace(/- /g, '')
                    .split('*')
                    .map((value, key) => (value ? <li key={key}>{value}</li> : ''))}
                </ul> */}
              </>
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
