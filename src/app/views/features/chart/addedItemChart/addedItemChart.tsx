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
import { getBgColorByCatId, labelPeriods, queryPeriods } from '..'

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
  const { token } = theme.useToken()
  const classes = styles(token)

  const [data, setData] = useState<any>()
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const getChartData = () => {
    chartApi.getNewAddedItemByPeriod(queryPeriods).then(({ isSuccess, content }) => {
      if (isSuccess) {
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
    })
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
