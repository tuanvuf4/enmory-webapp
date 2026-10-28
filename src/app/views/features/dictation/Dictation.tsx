import React from 'react'
import { DicTran, IDicTranProps } from '../dicTran'

export type IDictationProps = Omit<IDicTranProps, 'mode'>

export const Dictation: React.FC<IDictationProps> = (props) => {
  return <DicTran mode='dictation' {...props} />
}

export default Dictation
