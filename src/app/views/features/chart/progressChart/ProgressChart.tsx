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
import { itemApi } from '@/services/firebase'
import { getBgColorByCatId } from '../data'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface IProps {
  title?: string
}

export const ProgressChart: React.FC<IProps> = ({ title = 'Progress' }) => {
  const [data, setData] = useState<any>()
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const { token } = theme.useToken()

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '(Enabled items Only)',
      },
    },
  }

  const labels = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']

  const getChartData = async () => {
    const { isSuccess, content } = await itemApi.getItemsByLevel()
    if (isSuccess && content) {
      const colors = [
        token.palette?.lime?.[7] || '',
        token.palette?.gold?.[3] || '',
        token.palette?.cyan?.[2] || '',
        token.palette?.blue?.[3] || '',
        token.palette?.gray?.[4] || '',
        token.palette?.red?.[2] || '',
      ]

      const datasets = content.map((value) => ({
        label: value.label,
        data: value.data,
        borderColor: getBgColorByCatId(value.id, colors),
        backgroundColor: getBgColorByCatId(value.id, colors, 0.7),
      }))
      setIsLoaded(true)
      setData({ labels, datasets })
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
