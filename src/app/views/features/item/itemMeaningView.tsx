import { AudioOutlined } from '@ant-design/icons'
import { defaultSetting } from '@/config/appConfig'
import { useAppDispatch } from '@/core/hooks'
import { getTypeOfItem } from '@/helpers/item'
import { IMeaning, ECategory, TItem, EType } from '@/models/item.model'
import { itemAsync } from '@/store/async/item.async'
import { itemAction } from '@/store/reducers/items.reducer'
import { settingAction } from '@/store/reducers/setting.reducer'
import { Tags } from '@/views/components/tags/tags'
import { theme, Row, Col } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './style'
import clsx from 'clsx'

interface IMeaningProps {
  meaning: IMeaning<string[]>
  catId: ECategory
  type: TItem
}

export const MeaningItemView: React.FC<IMeaningProps> = ({ catId, meaning, type }) => {
  const { token } = theme.useToken()
  const classes = styles()

  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

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

  const getPronouns = () => {
    if (
      (catId === ECategory.WORD && meaning.pronunciation.uk) ||
      (catId === ECategory.WORD && meaning.pronunciation.us)
    ) {
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
  }

  return (
    <Row gutter={[token.size, token.size * 2]}>
      <Col span={24}>
        <div
          className={clsx(
            classes.meaningItem,
            meaning.common || type === 'brief' ? classes.meaningCommon : '',
            meaning.enable ? '' : classes.disableMeaning,
          )}
        >
          <div className={'flex gap-1 justify-between items-center'}>
            {getPronouns()}

            {catId === ECategory.WORD && (
              <h4 className={'m-0 p-1'}>{getTypeOfItem(meaning.typeId)}</h4>
            )}
          </div>

          {meaning.note && (
            <>
              <div className={'text-xs italic'}>Note:</div>
              <div className={classes.note} dangerouslySetInnerHTML={{ __html: meaning.note }} />
            </>
          )}

          {meaning.definition && (
            // <h3
            //   className={classes.definition}
            //   dangerouslySetInnerHTML={{
            //     __html: meaning.definition.replace(/\n/g, '<br />'),
            //   }}
            // />

            <ul className={classes.listItem}>
              {meaning.definition
                .replace(/\n/g, '*')
                .replace(/- /g, '')
                .split('*')
                .map((value, key) =>
                  value ? (
                    <li className={classes.definition} key={key}>
                      {value}
                    </li>
                  ) : (
                    ''
                  ),
                )}
            </ul>
          )}

          {meaning.translation && (
            <h3
              className={classes.translate}
              dangerouslySetInnerHTML={{
                __html: meaning.translation.replace(/\n/g, '<br />'),
              }}
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

          {type === 'full' && (
            <>
              {meaning.examples.filter((item) => item).length > 0 &&
                meaning.examples.length > 0 && (
                  <div className={classes.examples}>
                    <h4>Example:</h4>
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
      </Col>
    </Row>
  )
}
