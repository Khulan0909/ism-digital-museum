import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui'

export default function NotFound() {
  return (
    <div className="container section">
      <EmptyState
        title="Хуудас олдсонгүй"
        text="Хаягаа шалгаад дахин оролдоно уу."
        action={<Link to="/" className="btn btn-primary">Нүүр хуудас руу</Link>}
      />
    </div>
  )
}
