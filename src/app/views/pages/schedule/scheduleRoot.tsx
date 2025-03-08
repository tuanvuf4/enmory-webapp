import { useNavigate, useParams } from 'react-router-dom'

const ScheduleRoot = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  if (!id) navigate(`/schedule/${2}`)

  return null
}

export default ScheduleRoot
