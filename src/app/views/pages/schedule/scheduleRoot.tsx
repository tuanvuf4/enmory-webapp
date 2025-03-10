import { Route, useNavigate, useParams } from 'react-router-dom'
import Schedule from './schedule'

const ScheduleRoot = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  if (!id) return <Route path={`/schedule/${2}`} element={<Schedule />} />
  //  navigate(`/schedule/${2}`)

  return <Schedule />
}

export default ScheduleRoot
