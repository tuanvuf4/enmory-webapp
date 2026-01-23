import { AudioOutlined, ColumnHeightOutlined, VerticalAlignMiddleOutlined } from '@ant-design/icons'
import { setting } from '@/config/appConfig'
import { getType } from '@/helpers/item'
import { IMeaning, ECategory, IExample } from '@/models/item.model'
import { Tags } from '@/views/components'
import { Row, Col, Button, Flex } from 'antd'
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
      <div
        className={`${classes.pronouns} flex justify-end flex-wrap gap-x-4 gap-y-1 items-center`}
      >
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

export const MeaningItem: React.FC<IMeaningProps> = ({ catId, meaning }) => {
  const classes = styles()

  const navigate = useNavigate()
  const location = useLocation()

  const [show, setShow] = useState<boolean>(false)

  const onSearch = (keyword: string) => {
    // Navigate to library with search params
    const params = new URLSearchParams()
    params.set('keyword', keyword)
    params.set('page', '0')
    params.set('size', setting.pagination.size.toString())

    if (location.pathname.includes('library')) {
      navigate(`/library?${params.toString()}`)
    } else {
      navigate(`/library?${params.toString()}`)
    }
  }

  return (
    <div className={'relative my-4'}>
      <div
        className={clsx(
          classes.meaningItem,
          meaning.enable ? '' : classes.disableMeaning,
          meaning.common ? classes.meaningCommon : '',
          'relative',
        )}
      >
        <Flex justify={'space-between'} align={'center'} className={`w-full`}>
          <div>
            <Button
              size={'small'}
              icon={show ? <VerticalAlignMiddleOutlined /> : <ColumnHeightOutlined />}
              onClick={() => setShow((prev) => !prev)}
            />
            {catId === ECategory.WORD && (
              <span className='ml-2'>{getType(meaning.typeId).origin}</span>
            )}
          </div>

          {(meaning.pronunciation.uk ||
            meaning.pronunciation.us ||
            meaning.pronunciation.common) && <Pronunciation catId={catId} meaning={meaning} />}
        </Flex>

        {!show && (
          <>
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
              <>
                {/* <h5 className={'italic'}>Definition:</h5> */}
                <h3
                  className={classes.definition}
                  dangerouslySetInnerHTML={{ __html: meaning.definition }}
                />
              </>
            )}

            {meaning.translation && (
              <>
                {/* <h5 className={'italic'}>Translation:</h5> */}
                <h3
                  className={classes.translate}
                  dangerouslySetInnerHTML={{ __html: meaning.translation }}
                />
              </>
            )}

            {meaning.collocations && (
              <>
                <h5 className={'italic'}>Collocations:</h5>
                <div
                  className={classes.definition}
                  dangerouslySetInnerHTML={{ __html: meaning.collocations }}
                />
              </>
            )}

            {meaning.grammar && (
              <>
                <h5 className={'italic'}>Grammar:</h5>
                <div
                  className={classes.translate}
                  dangerouslySetInnerHTML={{ __html: meaning.grammar }}
                />
              </>
            )}

            {meaning.synonyms.length > 0 && (
              <Tags active label={'Synonyms'} tags={meaning.synonyms} onSearch={onSearch} />
            )}

            {meaning.antonyms.length > 0 && (
              <Tags active label={'Antonyms'} tags={meaning.antonyms} onSearch={onSearch} />
            )}

            {meaning.examples.length > 0 && (
              <div className={classes.examples}>
                <h5 className={'italic'}>Example:</h5>
                <ul>
                  {(meaning.examples as IExample[]).map((example, key) => {
                    return (
                      <li key={key} className={classes.exampleItem}>
                        <ul>
                          <li
                            className={classes.nestedExampleItem}
                            dangerouslySetInnerHTML={{ __html: example.origin }}
                          />
                          <li
                            className={classes.nestedExampleItem}
                            dangerouslySetInnerHTML={{ __html: example.translation }}
                          />
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
