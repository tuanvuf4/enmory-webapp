import React, { useEffect, useState } from 'react'
import { Skeleton, theme } from 'antd'
import styles from '../style'
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
import { getBgColorByCatId } from '..'
import { itemApi } from '@/services/firebase'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface IProps {
  title?: string
}

export const ProgressChart: React.FC<IProps> = ({ title = 'Progress' }) => {
  const { token } = theme.useToken()
  const classes = styles(token)

  const [data, setData] = useState<any>()
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

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
      const datasets = content.map((value) => ({
        label: value.label,
        data: value.data,
        borderColor: getBgColorByCatId(value.id),
        backgroundColor: getBgColorByCatId(value.id, 0.7),
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
    <div className={classes.chartItem}>
      {isLoaded && <h3 className={classes.chartTitle}>{title}</h3>}

      {!isLoaded && <Skeleton />}

      {isLoaded && <Bar options={options} data={data} />}
    </div>
  )
}
