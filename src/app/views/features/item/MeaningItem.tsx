import { AudioOutlined } from '@ant-design/icons'
import { appSetting } from '@/config/appConfig'
import { getType } from '@/helpers/item'
import { IMeaning, ECategory, IExample } from '@/models/item.model'
import { Tags } from '@/views/components'
import { Button, Flex, Space, theme } from 'antd'
import { useNavigate } from 'react-router-dom'
import styles from './item.module.scss'
import clsx from 'clsx'
import { speakWord } from '@/helpers/mics'

interface IMeaningProps {
  origin: string
  meaning: IMeaning
  catId: ECategory
}

const Pronunciation = ({ catId, origin, meaning }: IMeaningProps) => {
  if (catId === ECategory.WORD && (meaning.pronunciation.us || meaning.pronunciation.uk)) {
    return (
      <div className={`${styles.pronouns} flex justify-end flex-wrap gap-x-2 gap-y-1 items-center`}>
        {meaning.pronunciation.uk && (
          <div className={styles.audio}>
            {/* <span className={styles.accent}>UK</span> */}
            <Button
              variant={'text'}
              type={'text'}
              size={'small'}
              className={clsx({ [styles.btnAudio]: true })}
              icon={<AudioOutlined />}
              onClick={() => speakWord(origin)}
            >
              {meaning.pronunciation?.uk || ''}
            </Button>
          </div>
        )}

        {meaning.pronunciation.us && (
          <div className={styles.audio}>
            {/* <span className={styles.accent}>US</span> */}
            <Button
              variant={'text'}
              type={'text'}
              size={'small'}
              className={clsx({ [styles.btnAudio]: true })}
              icon={<AudioOutlined />}
              onClick={() => speakWord(origin, 'en-US')}
            >
              {meaning.pronunciation?.us || ''}
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (catId !== ECategory.WORD && meaning.pronunciation.common) {
    return (
      <div className={styles.pronouns}>
        <div className={styles.audio}>
          <Button
            variant={'text'}
            type={'text'}
            size={'small'}
            className={clsx({ [styles.btnAudio]: true })}
            icon={<AudioOutlined />}
            onClick={() => speakWord(origin, 'en-US')}
          >
            {meaning.pronunciation?.common || ''}
          </Button>
        </div>
      </div>
    )
  }

  return null
}

export const MeaningItem: React.FC<IMeaningProps> = ({ catId, meaning, origin }) => {
  const navigate = useNavigate()

  const { token } = theme.useToken()

  const onSearch = (keyword: string) => {
    const params = new URLSearchParams()
    params.set('keyword', keyword)
    params.set('page', '0')
    params.set('size', appSetting.pagination.size.toString())
    navigate(`/library?${params.toString()}`)
  }

  return (
    <div className={clsx(styles.meaningItem)}>
      <Flex justify={'space-between'} align={'center'} className={`w-full`}>
        <div>{catId === ECategory.WORD && <span>{getType(meaning.typeId).origin}</span>}</div>

        {(meaning.pronunciation.uk || meaning.pronunciation.us || meaning.pronunciation.common) && (
          <Pronunciation origin={origin} catId={catId} meaning={meaning} />
        )}
      </Flex>

      <>
        {meaning.note && (
          <>
            <h5 className={'italic font-bold m-0'}>Note:</h5>
            <div className={styles.note} dangerouslySetInnerHTML={{ __html: meaning.note }} />
          </>
        )}

        {meaning.definition && (
          <>
            <h5 className={'italic font-bold m-0'}>Definition:</h5>
            <div
              className={styles.definition}
              dangerouslySetInnerHTML={{ __html: meaning.definition }}
            />
          </>
        )}

        {meaning.translation && (
          <>
            <h5 className={'italic font-bold m-0'}>Translation:</h5>
            <div
              className={styles.translate}
              dangerouslySetInnerHTML={{ __html: meaning.translation }}
            />
          </>
        )}

        {meaning.collocations && (
          <div className={styles.list}>
            <h5 className={'italic font-bold m-0'}>Collocations:</h5>
            <div dangerouslySetInnerHTML={{ __html: meaning.collocations }} />
          </div>
        )}

        {meaning.grammar && (
          <div className={styles.list}>
            <h5 className={'italic font-bold m-0'}>Grammar:</h5>
            <div dangerouslySetInnerHTML={{ __html: meaning.grammar }} />
          </div>
        )}

        {meaning.synonyms.length > 0 && (
          <Tags label={'Synonyms'} tags={meaning.synonyms} onSearch={onSearch} />
        )}

        {meaning.antonyms.length > 0 && (
          <Tags label={'Antonyms'} tags={meaning.antonyms} onSearch={onSearch} />
        )}

        {meaning.examples.length > 0 && (
          <Space size={token.size / 2} direction={'vertical'}>
            <h5 className={'italic font-bold m-0'}>Example:</h5>
            <ul className={styles.examples}>
              {(meaning.examples as IExample[]).map((example, key) => {
                return (
                  <li key={key} className={styles.exampleItem}>
                    <ul>
                      <li dangerouslySetInnerHTML={{ __html: example.origin }} />
                      <li dangerouslySetInnerHTML={{ __html: example.translation }} />
                    </ul>
                  </li>
                )
              })}
            </ul>
          </Space>
        )}
      </>
    </div>
  )
}
