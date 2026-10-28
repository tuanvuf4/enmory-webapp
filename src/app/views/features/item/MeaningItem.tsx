import {
  SoundOutlined,
  StarFilled,
  TranslationOutlined,
  BulbOutlined,
  ApartmentOutlined,
  ReadOutlined,
} from '@ant-design/icons'
import { appSetting } from '@/config/appConfig'
import { getType } from '@/helpers/item'
import { IMeaning, ECategory, IExample, EType } from '@/models/item.model'
import { Tags } from '@/views/components'
import { Tag, Tooltip } from 'antd'
import { useNavigate } from 'react-router-dom'
import styles from './item.module.scss'
import clsx from 'clsx'
import { speakWord, speakSentence } from '@/helpers/mics'
import { sanitizePronunciation } from '@/core/utils'

interface IMeaningProps {
  origin: string
  meaning: IMeaning
  catId: ECategory
}

const getTypeColor = (type: EType): string => {
  switch (type) {
    case EType.NOUN:
      return 'geekblue'
    case EType.VERB:
      return 'green'
    case EType.ADJECTIVE:
      return 'gold'
    case EType.ADVERB:
      return 'cyan'
    case EType.PREPOSITION:
      return 'purple'
    case EType.CONJUNCTION:
      return 'magenta'
    case EType.PRONOUN:
      return 'blue'
    case EType.INTERJECTION:
      return 'volcano'
    default:
      return 'default'
  }
}

const stripHtml = (html?: string) => {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, '').trim()
}

const Pronunciation = ({ catId, origin, meaning }: IMeaningProps) => {
  const { pronunciation = { uk: '', us: '', common: '' } } = meaning
  const cleanUk = sanitizePronunciation(pronunciation.uk)
  const cleanUs = sanitizePronunciation(pronunciation.us)
  const cleanCommon = sanitizePronunciation(pronunciation.common)

  if (catId === ECategory.WORD && (cleanUs || cleanUk)) {
    return (
      <div className={styles.pronounceList}>
        {cleanUk && (
          <Tooltip title='Phát âm tiếng Anh - Anh (UK)'>
            <button
              type='button'
              className={clsx(styles.audioPill, styles.audioPillUk)}
              onClick={() => speakWord(origin, 'en-GB')}
            >
              <span className={styles.accentLabel}>UK</span>
              <span className={styles.phoneticText}>{cleanUk}</span>
              <SoundOutlined className={styles.audioIcon} />
            </button>
          </Tooltip>
        )}

        {cleanUs && (
          <Tooltip title='Phát âm tiếng Anh - Mỹ (US)'>
            <button
              type='button'
              className={clsx(styles.audioPill, styles.audioPillUs)}
              onClick={() => speakWord(origin, 'en-US')}
            >
              <span className={styles.accentLabel}>US</span>
              <span className={styles.phoneticText}>{cleanUs}</span>
              <SoundOutlined className={styles.audioIcon} />
            </button>
          </Tooltip>
        )}
      </div>
    )
  }

  if (catId !== ECategory.WORD && cleanCommon) {
    return (
      <div className={styles.pronounceList}>
        <Tooltip title='Nghe phát âm'>
          <button
            type='button'
            className={styles.audioPill}
            onClick={() => speakWord(origin, 'en-US')}
          >
            <span className={styles.phoneticText}>{cleanCommon}</span>
            <SoundOutlined className={styles.audioIcon} />
          </button>
        </Tooltip>
      </div>
    )
  }

  return null
}

export const MeaningItem: React.FC<IMeaningProps> = ({ catId, meaning, origin }) => {
  const navigate = useNavigate()

  const onSearch = (keyword: string) => {
    const params = new URLSearchParams()
    params.set('keyword', keyword)
    params.set('page', '0')
    params.set('size', appSetting.pagination.size.toString())
    navigate(`/library?${params.toString()}`)
  }

  const wordType = catId === ECategory.WORD ? getType(meaning.typeId) : null

  return (
    <div className={clsx(styles.meaningItem, meaning.common && styles.common)}>
      <div className={styles.meaningHeader}>
        <div className={styles.meaningHeaderLeft}>
          {wordType && (
            <Tag color={getTypeColor(meaning.typeId)} className={styles.posBadge}>
              {wordType.origin}
            </Tag>
          )}

          {meaning.common && (
            <Tag color='gold' icon={<StarFilled />} className={styles.commonBadge}>
              Common
            </Tag>
          )}
        </div>

        {(meaning.pronunciation.uk || meaning.pronunciation.us || meaning.pronunciation.common) && (
          <Pronunciation origin={origin} catId={catId} meaning={meaning} />
        )}
      </div>

      {meaning.definition && (
        <div className={styles.subSection}>
          <span className={styles.subSectionLabel}>
            <ReadOutlined style={{ marginRight: 4 }} />
            Definition
          </span>
          <div
            className={styles.subSectionContent}
            dangerouslySetInnerHTML={{ __html: meaning.grammar }}
          />
        </div>
      )}

      {meaning.translation && (
        <div className={styles.translationBlock}>
          <TranslationOutlined className={styles.translationIcon} />
          <div
            className={styles.translationText}
            dangerouslySetInnerHTML={{ __html: meaning.translation }}
          />
        </div>
      )}

      {meaning.note && (
        <div className={styles.noteCallout}>
          <div className={styles.noteHeader}>
            <BulbOutlined /> Lưu ý
          </div>
          <div className={styles.noteContent} dangerouslySetInnerHTML={{ __html: meaning.note }} />
        </div>
      )}

      {meaning.collocations && (
        <div className={styles.subSection}>
          <span className={styles.subSectionLabel}>
            <ApartmentOutlined style={{ marginRight: 4 }} />
            Collocations
          </span>
          <div
            className={styles.subSectionContent}
            dangerouslySetInnerHTML={{ __html: meaning.collocations }}
          />
        </div>
      )}

      {meaning.grammar && (
        <div className={styles.subSection}>
          <span className={styles.subSectionLabel}>
            <ReadOutlined style={{ marginRight: 4 }} />
            Grammar
          </span>
          <div
            className={styles.subSectionContent}
            dangerouslySetInnerHTML={{ __html: meaning.grammar }}
          />
        </div>
      )}

      {meaning.synonyms && meaning.synonyms.length > 0 && (
        <Tags label={'Synonyms'} tags={meaning.synonyms} onSearch={onSearch} />
      )}

      {meaning.antonyms && meaning.antonyms.length > 0 && (
        <Tags label={'Antonyms'} tags={meaning.antonyms} onSearch={onSearch} />
      )}

      {meaning.examples && meaning.examples.length > 0 && (
        <div className={styles.examplesSection}>
          <div className={styles.examplesHeader}>
            <ReadOutlined style={{ marginRight: 4 }} /> Examples
          </div>
          <div className={styles.examplesList}>
            {(meaning.examples as IExample[]).map((example, key) => {
              const plainOrigin = stripHtml(example.origin)
              return (
                <div key={example.id || key} className={styles.exampleCard}>
                  <div className={styles.exampleOriginRow}>
                    <div
                      className={styles.exampleOriginText}
                      dangerouslySetInnerHTML={{ __html: example.origin }}
                    />
                    {plainOrigin && (
                      <Tooltip title='Nghe câu ví dụ'>
                        <button
                          type='button'
                          className={styles.exampleAudioBtn}
                          onClick={() => speakSentence(plainOrigin)}
                          aria-label='Phát âm ví dụ'
                        >
                          <SoundOutlined />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                  {example.translation && (
                    <div
                      className={styles.exampleTranslationText}
                      dangerouslySetInnerHTML={{ __html: example.translation }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
