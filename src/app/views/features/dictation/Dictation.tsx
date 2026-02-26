import { Button, Col, Row, Space, theme } from 'antd'
import styles from './style.module.scss'
import TextArea from 'antd/es/input/TextArea'
import { useEffect, useState } from 'react'
import { setting } from '@/config/appConfig'
import classNames from 'clsx'

interface IProps {
  player: boolean
  maxLengthTranscript?: number
  transcript: string
  translation: string
}

export const Dictation: React.FC<IProps> = ({
  player = true,
  maxLengthTranscript = setting.listening.maxLengthTranscript,
  transcript,
  translation,
}) => {
  const { token } = theme.useToken()

  const [isFinish, setIsFinish] = useState<boolean>(false)
  const [isStart, setIsStart] = useState<boolean>(false)
  const [source, setSource] = useState<string>(transcript)
  const [fmSource, setFmSource] = useState<string>('')

  const [srcTran, setSrcTran] = useState<string>(translation)
  const [target, setTarget] = useState<string>('')
  const [fmTarget, setFmTarget] = useState<string>('')
  const [, setTranscriptLable] = useState<string>('Transcript')
  const [, setTranslationLabel] = useState<string>('Translation')

  // const getTooltip = () => {
  //   return (
  //     <Tooltip
  //       title={`Maximum of ${maxLengthTranscript} words, separated by a dot to display better`}
  //     >
  //       <InfoCircleOutlined style={{ fontSize: 20 }} />
  //     </Tooltip>
  //   )
  // }

  useEffect(() => {
    setSource(transcript)
    setSrcTran(translation)
  }, [transcript, translation])

  useEffect(() => {
    if (!isFinish && !isStart) {
      setFmTarget('')
      setTarget('')
      setTranscriptLable('Transcript')
      setTranslationLabel('Translation')
    }
    if (isStart && !isFinish) {
      setTranscriptLable('Typing here')
      setTranslationLabel('')
    }

    if (isStart && isFinish) {
      setTranscriptLable('Transcript')
      setTranslationLabel('Your writting')
    }
  }, [isFinish, isStart])

  useEffect(() => {
    if (isFinish) {
      setFmTarget(
        target
          .split('.')
          .map((item) => `${item.replaceAll('.', '').trim()}`)
          .filter((item) => item)
          .map((item, index) => `<p>(${index}) ${item}.</p>`)
          .join(''),
      )
    }
  }, [isFinish])

  useEffect(() => {
    if (isStart) {
      setFmSource(
        source
          .split('.')
          .map((item) => `${item.replaceAll('.', '').trim()}`)
          .filter((item) => item)
          .map((item, index) => `<p>(${index}) ${item}.</p>`)
          .join(''),
      )
    }
  }, [isStart])

  return (
    <Space direction='vertical' style={{ display: 'flex' }} size={[token.size, token.size]}>
      <Row gutter={[token.size, token.size]}>
        <Col xs={24}>
          {/* <div className={classNames(styles.textarea)}>
            <div className={styles.textareaItem}>
              <h3 className={styles.title}>
                {transciptLabel} {getTooltip()}
              </h3>
            </div>
            <div className={styles.textareaItem}>
              <h3 className={styles.title}>{translationLabel}</h3>
            </div>
          </div> */}

          {!isFinish && (
            <div className={classNames(styles.textarea)}>
              {!isStart && (
                <>
                  <div className={styles.textareaItem}>
                    <div
                      className={classNames(styles.innerTextarea, styles.textareaDisable)}
                      dangerouslySetInnerHTML={{ __html: source.replaceAll(/\n/g, '<br />') }}
                    />
                  </div>

                  <div className={styles.textareaItem}>
                    <div
                      className={classNames(styles.innerTextarea, styles.textareaDisable)}
                      dangerouslySetInnerHTML={{ __html: srcTran.replaceAll(/\n/g, '<br />') }}
                    />
                  </div>
                </>
              )}

              {isStart && (
                <div className={styles.textareaItem}>
                  <TextArea
                    className={styles.innerTextarea}
                    allowClear={!player}
                    rows={10}
                    value={target}
                    maxLength={maxLengthTranscript}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {isFinish && (
            <div className={classNames(styles.textarea)}>
              <div className={styles.textareaItem}>
                <div
                  className={classNames(styles.innerTextarea, isFinish ? 'show' : '')}
                  dangerouslySetInnerHTML={{ __html: fmSource }}
                />
              </div>

              <div className={classNames(styles.textareaItem)}>
                <div
                  className={classNames(styles.innerTextarea, isFinish ? 'show' : '')}
                  dangerouslySetInnerHTML={{ __html: fmTarget }}
                />
              </div>
            </div>
          )}
        </Col>
      </Row>

      <Row gutter={[token.size, token.size]}>
        <Col xs={24}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {!isStart && !isFinish && (
              <Button
                type='primary'
                htmlType='button'
                style={{ minWidth: 150 }}
                onClick={() => {
                  setIsStart(true)
                  setIsFinish(false)
                }}
              >
                Start
              </Button>
            )}

            {isStart && !isFinish && (
              <>
                <Button
                  type='primary'
                  htmlType='button'
                  style={{ minWidth: 150 }}
                  onClick={() => {
                    // setIsStart(false);
                    setIsFinish(true)
                  }}
                >
                  Finish
                </Button>
              </>
            )}

            {isFinish && (
              <Button
                htmlType='button'
                style={{ minWidth: 150 }}
                onClick={() => {
                  setIsStart(false)
                  setIsFinish(false)
                }}
              >
                Retry
              </Button>
            )}
          </div>
        </Col>
      </Row>
    </Space>
  )
}
