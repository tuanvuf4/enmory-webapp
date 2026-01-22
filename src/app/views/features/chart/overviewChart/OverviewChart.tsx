import React, { useEffect, useMemo, useState } from 'react'
import { Skeleton, theme } from 'antd'
import styles from '../style'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { ECategory } from '@/models/item.model'
import { getBgColorByCatId } from '../data'
import { itemApi } from '@/services/firebase'

ChartJS.register(ArcElement, Tooltip, Legend)

interface IProps {
  title?: string
}

export const OverviewChart: React.FC<IProps> = ({ title = 'Overview' }) => {
  const { token } = theme.useToken()
  const classes = styles(token)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>()
  const [total, setTotal] = useState<number>(0)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const settingUI = useMemo(() => {
    return {
      backgroundColor: [
        getBgColorByCatId(ECategory.WORD, 0.8),
        getBgColorByCatId(ECategory.PHRASE, 0.8),
        getBgColorByCatId(ECategory.IDIOM, 0.8),
        getBgColorByCatId(ECategory.SLANG, 0.8),
        getBgColorByCatId(ECategory.COLLOCATION, 0.8),
        getBgColorByCatId(ECategory.SENTENCE, 0.8),
      ],
      borderColor: [
        getBgColorByCatId(ECategory.WORD),
        getBgColorByCatId(ECategory.PHRASE),
        getBgColorByCatId(ECategory.IDIOM),
        getBgColorByCatId(ECategory.SLANG),
        getBgColorByCatId(ECategory.COLLOCATION),
        getBgColorByCatId(ECategory.SENTENCE),
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
  }, [settingUI])

  return (
    <div className={classes.chartItem}>
      {isLoaded && (
        <h3 className={classes.chartTitle}>
          {title} : {total} items
        </h3>
      )}

      {!isLoaded && <Skeleton />}

      {isLoaded && <Pie data={data} />}
    </div>
  )
}
