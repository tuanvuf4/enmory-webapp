import React from 'react'
import { DicTran, IDicTranProps, IDicTranQuestionRecord } from '../dicTran'

export type ITranslatorQuestionRecord = IDicTranQuestionRecord
export type ITranslationPracticeProps = Omit<IDicTranProps, 'mode'>

export const Translator: React.FC<ITranslationPracticeProps> = (props) => {
  return <DicTran mode='translator' {...props} />
}

export default Translator
