import { msgErrors } from '@/constant/index'
import globalStyle from '@/style/appStyle'
import { ReloadOutlined } from '@ant-design/icons'
import { defaultSetting } from '@/config/appConfig'
import { useAppSelector } from '@/core/hooks'
import { patternValidation, hex2Rgba } from '@/core/utils'
import { getRandomArrayIndex } from '@/helpers/validate'
import { theme, Row, Col, Button, Input } from 'antd'
import { useState, useEffect } from 'react'
import styles from './style'
import clsx from 'clsx'

interface IProps {
  player: boolean
  maxLengthTranscript?: number
  transcript: string
  translation: string
}

export const Exercise: React.FC<IProps> = ({
  player = true,
  maxLengthTranscript = defaultSetting.listening.maxLengthTranscript,
  transcript,
  translation,
}) => {
  const { token } = theme.useToken()

  const classes = styles()
  const gClasses = globalStyle()

  const [isGenerate, setIsGenerate] = useState<boolean>(false)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)

  const [source, setSource] = useState<string>(transcript)
  const [srcTran, setSrcTran] = useState<string>(translation)
  const [placeholder, setPlaceholder] = useState<string>('')
  const [placeholderResult, setPlaceholderResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [result, setResult] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])

  const { user } = useAppSelector((state) => state.auth)

  const generate = () => {
    if (!error) {
      setError('')

      const tmp = source
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .split(' ')
        .map((item) => item.trim())
        .filter((item) => item)

      const randomIndex = getRandomArrayIndex(tmp, user.configuration.numberOfDictationItem)

      let current = 0
      let order = 0
      const output = tmp
        .map((item, index) => {
          if (item.includes('.') || (!item.includes('.') && tmp.length === index + 1)) {
            const response = tmp.slice(current, index + 1).map((value, mapIdx) => {
              return {
                value: value.trim(),
                index: current + mapIdx,
              }
            })
            current = index + 1
            return response
          }
        })
        .filter((item) => item)
        .map((sentence) => {
          return sentence?.map((item) => {
            const matchItem = randomIndex.find((rIndexItem) => rIndexItem === item.index)
            if (matchItem) {
              order++
              setResult((state) => [
                ...state,
                item.value.replace(patternValidation.specialCharacterPattern, ''),
              ])
              return {
                plh: `<span id="order-${order}">(${order})</span>`,
                plhr: `<span id="order-${order}">(${order}) ${item.value.replace(
                  patternValidation.specialCharacterPattern,
                  '',
                )}</span>`,
              }
            } else {
              return {
                plh: item.value,
                plhr: item.value,
              }
            }
          })
        })

      setPlaceholder(
        output
          .map((item) => item?.map((word) => word.plh).join(' '))
          .map((item, index) => `<p>(${index + 1}) ${item}</p>`)
          .join(' '),
      )

      setPlaceholderResult(
        output
          .map((item) => item?.map((word) => word.plhr).join(' '))
          .map((item, index) => `<p>(${index + 1}) ${item}</p>`)
          .join(' '),
      )
      setIsGenerate(true)
    }
  }

  const validateSrc = (e: string) => {
    // if (e.length > maxLengthTranscript) {
    //   setError(msgErrors.maxLength('transcript', maxLengthTranscript));
    // }
    if (e.split(' ').length < user.configuration.numberOfDictationItem) {
      setSource(e)
      setError(msgErrors.minLength('transcript', user.configuration.numberOfDictationItem))
    } else {
      setError('')
      setSource(e)
    }
  }

  const setFocus = () => {
    for (let id = 1; id <= user.configuration.numberOfDictationItem; id++) {
      const order = document.getElementById(`order-${id}`)
      if (order) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        order!.onclick = () => {
          const input = document.getElementById(`input-${id}`)
          if (input) {
            input?.focus()
          }
        }
      }
    }
  }

  const setScroll = () => {
    for (let id = 1; id <= user.configuration.numberOfDictationItem; id++) {
      const result = document.getElementById(`result-${id}`)
      if (result) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result!.onclick = () => {
          const order = document.getElementById(`order-${id}`)
          if (order)
            document.getElementById(`placeholder`)?.scroll({
              top: order?.offsetTop,
            })
        }
      }
    }
  }

  useEffect(() => {
    validateSrc(transcript)
    setIsGenerate(false)
    setResult([])
  }, [transcript])

  useEffect(() => {
    setSrcTran(translation)
  }, [translation])

  useEffect(() => {
    window.addEventListener('click', setFocus)
    window.addEventListener('click', setScroll)

    return () => {
      window.removeEventListener('click', setFocus)
      window.removeEventListener('click', setScroll)
    }
  }, [])

  return (
    <div className={classes.listeningExercise}>
      {!isGenerate && (
        <Row gutter={[token.size / 2, token.size]}>
          <Col xs={24}>
            {/* <div className={classNames(classes.textarea)}>
              <div className={classes.textareaItem}>
                <h3 className={classes.title}>Transcript:</h3>
              </div>
              <div className={classes.textareaItem}>
                <h3 className={classes.title}>Translation:</h3>
              </div>
            </div> */}

            <div className={clsx(classes.textarea)}>
              <div className={classes.textareaItem}>
                <div
                  id='placeholder'
                  className={classes.overviewPlaceholder}
                  dangerouslySetInnerHTML={{
                    __html: source.replaceAll(/\n/g, '<br />'),
                  }}
                />

                <span
                  style={{
                    marginBottom: token.size,
                    fontSize: token.fontSizeHeading5,
                  }}
                >
                  {player
                    ? ''
                    : `Paste the transcript here, a maximum of ${maxLengthTranscript} words`}
                </span>

                {error && <div className={clsx(gClasses.errorMsg)}>{error}</div>}
              </div>

              <div className={classes.textareaItem}>
                <div
                  id='placeholderTranscript'
                  className={classes.overviewPlaceholder}
                  dangerouslySetInnerHTML={{
                    __html: srcTran.replaceAll(/\n/g, '<br />'),
                  }}
                />
              </div>
            </div>
          </Col>

          <Col xs={24}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Button
                disabled={source && !error ? false : true}
                type='primary'
                htmlType='button'
                onClick={generate}
                style={{ minWidth: 150 }}
              >
                Start
              </Button>
            </div>
          </Col>
        </Row>
      )}

      {isGenerate && (
        <Row gutter={[token.size / 2, token.size]}>
          <Col xs={24}>
            <div
              id='placeholder'
              className={classes.placeholder}
              dangerouslySetInnerHTML={{
                __html: isSubmitted ? placeholderResult : placeholder,
              }}
            />
          </Col>

          <Col xs={24}>
            <Row className={classes.scrollSM} gutter={[token.size, token.size / 2]}>
              {result.map((res, key) => (
                <Col key={key} xs={12} sm={8} md={6} lg={4}>
                  <Row align={'middle'} gutter={(token.size / 4, token.size / 4)}>
                    <Col xs={4} style={{ textAlign: 'center' }}>
                      <span className={classes.inputPos} id={`result-${key + 1}`}>
                        ({key + 1})
                      </span>
                    </Col>

                    <Col xs={20}>
                      <Input
                        id={`input-${key + 1}`}
                        style={{
                          background: isSubmitted
                            ? res &&
                              answers[key] &&
                              res.trim().toLowerCase() === answers[key].trim().toLowerCase()
                              ? hex2Rgba(token.colorPrimary, 0.95)
                              : hex2Rgba(token.colorTextSecondary, 0.95)
                            : 'transparent',
                          color: token.colorWhite,
                          border: 'none',
                          borderBottom: `1px solid ${token.colorBgBase}`,
                        }}
                        readOnly={isSubmitted}
                        onInput={(e) => {
                          const input = e.target as HTMLInputElement
                          input.value = input.value.trim().toLowerCase()
                        }}
                        onChange={(e) => {
                          setAnswers((state) => {
                            const tmp = [...state]
                            tmp[key] = e.target.value

                            return [...tmp]
                          })
                        }}
                      ></Input>
                    </Col>
                  </Row>
                </Col>
              ))}
            </Row>
          </Col>

          <Col xs={24} style={{ marginTop: token.size * 2 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Button
                type='primary'
                htmlType='button'
                disabled={isSubmitted}
                onClick={() => setIsSubmitted(true)}
                style={{ minWidth: 150 }}
              >
                Finish
              </Button>

              <Button
                htmlType='button'
                icon={<ReloadOutlined />}
                style={{ minWidth: 150 }}
                onClick={() => {
                  setIsGenerate(false)
                  setIsSubmitted(false)
                  setAnswers([])
                  setResult([])
                }}
              >
                Retry
              </Button>
            </div>
          </Col>
        </Row>
      )}
    </div>
  )
}
