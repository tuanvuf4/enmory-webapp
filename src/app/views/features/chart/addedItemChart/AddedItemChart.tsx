import React, { useEffect, useState } from 'react'
import { Skeleton } from 'antd'
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

  useEffect(() => {
    const getChartData = async () => {
      const { isSuccess, content } = await itemApi.getNewAddedItemByPeriod(queryPeriods)
      if (isSuccess && content) {
        const datasets = content.map((value) => ({
          label: value.label,
          data: value.data,
          borderColor: getBgColorByCatId(value.id),
          backgroundColor: getBgColorByCatId(value.id, 0.7),
        }))
        setIsLoaded(true)
        setData({ labels: labelPeriods, datasets })
      } else {
        setIsLoaded(false)
      }
    }

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
