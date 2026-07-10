import React, { useEffect, useMemo, useState } from 'react'
import { Skeleton, theme } from 'antd'
import styles from '../chart.module.scss'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { ECategory } from '@/models/item.model'
import { itemApi } from '@/services/firebase'
import { getBgColorByCatId } from '../data'

ChartJS.register(ArcElement, Tooltip, Legend)

interface IProps {
  title?: string
}

export const OverviewChart: React.FC<IProps> = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>()
  const [total, setTotal] = useState<number>(0)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const { token } = theme.useToken()

  const settingUI = useMemo(() => {
    const colors = [
      token.palette?.lime?.[7] || '',
      token.palette?.gold?.[3] || '',
      token.palette?.cyan?.[2] || '',
      token.palette?.blue?.[3] || '',
      token.palette?.gray?.[4] || '',
      token.palette?.red?.[2] || '',
    ]
    return {
      backgroundColor: [
        getBgColorByCatId(ECategory.WORD, colors, 0.8),
        getBgColorByCatId(ECategory.PHRASE, colors, 0.8),
        getBgColorByCatId(ECategory.IDIOM, colors, 0.8),
        getBgColorByCatId(ECategory.SLANG, colors, 0.8),
        getBgColorByCatId(ECategory.COLLOCATION, colors, 0.8),
        getBgColorByCatId(ECategory.SENTENCE, colors, 0.8),
      ],
      borderColor: [
        getBgColorByCatId(ECategory.WORD, colors),
        getBgColorByCatId(ECategory.PHRASE, colors),
        getBgColorByCatId(ECategory.IDIOM, colors),
        getBgColorByCatId(ECategory.SLANG, colors),
        getBgColorByCatId(ECategory.COLLOCATION, colors),
        getBgColorByCatId(ECategory.SENTENCE, colors),
      ],
      borderWidth: 1,
    }
  }, [])

  useEffect(() => {
    itemApi.getOverviewItems().then(({ content, isSuccess }) => {
      if (isSuccess && content) {
        setData({
          labels: content.map((item) => item.label),
          datasets: [
            {
              ...settingUI,
              label: ' ',
              data: content.map((item) => item.total),
            },
          ],
        })
        setIsLoaded(true)
        let mergeTotal = 0
        content.map((item) => (mergeTotal = mergeTotal + item.total))
        setTotal(mergeTotal)
      }
    })
  }, [])

  return (
    <div className={styles.chartItem}>
      {isLoaded && <h3 className={styles.chartTitle}>{total} items</h3>}

      {!isLoaded && <Skeleton />}

      {isLoaded && <Pie data={data} />}
    </div>
  )
}
