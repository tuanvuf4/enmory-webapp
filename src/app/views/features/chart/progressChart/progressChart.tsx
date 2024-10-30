import React, { useEffect, useState } from 'react'
import { Skeleton, theme } from 'antd'
import styles from '../style'
import { chartApi } from 'src/app/services/api/chart.api'
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
import { ECategory } from 'src/app/models/item.model'
import { getBgColorByCatId } from '..'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export const options = {
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

interface IProps {
  title?: string
}

export const ProgressChart: React.FC<IProps> = ({ title = 'Progress' }) => {
  const { token } = theme.useToken()
  const classes = styles(token)

  const [data, setData] = useState<any>()
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const levelToSum = (levels: ECategory[]) => {
    const tmp: number[] = []
    for (let index = 0; index <= 5; index++) {
      let sum = 0
      levels.forEach((level) => {
        if (level === index) sum++
      })
      tmp.push(sum)
    }
    return tmp
  }

  const labels = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']

  const getApiChart = async () => {
    const { isSuccess, content } = await chartApi.getProgressChart()
    if (isSuccess) {
      setIsLoaded(true)
      setData({
        labels,
        datasets: content.map((value) => ({
          label: value.label,
          data: levelToSum(value.data.map((item) => item.level)),
          backgroundColor: getBgColorByCatId(value.id, 0.8),
        })),
      })
    }
  }

  useEffect(() => {
    getApiChart()
  }, [])

  return (
    <div className={classes.chartItem}>
      {isLoaded && <h3 className={classes.chartTitle}>{title}</h3>}

      {!isLoaded && <Skeleton />}

      {isLoaded && <Bar options={options} data={data} />}
    </div>
  )
}
