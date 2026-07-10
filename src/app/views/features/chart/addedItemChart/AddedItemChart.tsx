import React, { useEffect, useState } from 'react'
import { Skeleton, theme } from 'antd'
import styles from '../chart.module.scss'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { getBgColorByCatId, labelPeriods, queryPeriods } from '..'
import { itemApi } from '@/services/firebase'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface IProps {
  title?: string
}

const options = {
  plugins: {
    title: {
      display: true,
      text: '(Enabled items Only)',
    },
  },
  responsive: true,
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
    },
  },
}

export const AddedItemChart: React.FC<IProps> = ({ title = 'Added Items' }) => {
  const [data, setData] = useState<any>()
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const { token } = theme.useToken()

  const getChartData = async () => {
    const colors = [
      token.palette?.lime?.[7] || '',
      token.palette?.gold?.[3] || '',
      token.palette?.cyan?.[2] || '',
      token.palette?.blue?.[3] || '',
      token.palette?.gray?.[4] || '',
      token.palette?.red?.[2] || '',
    ]
    const { isSuccess, content } = await itemApi.getNewAddedItemByPeriod(queryPeriods)
    if (isSuccess && content) {
      const datasets = content.map((value) => ({
        label: value.label,
        data: value.data,
        borderColor: getBgColorByCatId(value.id, colors),
        backgroundColor: getBgColorByCatId(value.id, colors, 0.7),
      }))
      setIsLoaded(true)
      setData({ labels: labelPeriods, datasets })
    } else {
      setIsLoaded(false)
    }
  }

  useEffect(() => {
    getChartData()
  }, [])

  return (
    <div className={styles.chartItem}>
      {isLoaded && <h3 className={styles.chartTitle}>{title}</h3>}

      {!isLoaded && <Skeleton />}

      {isLoaded && <Bar options={options} data={data} />}
    </div>
  )
}
