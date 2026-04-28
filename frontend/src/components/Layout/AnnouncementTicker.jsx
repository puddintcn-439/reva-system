import { useQuery } from '@tanstack/react-query'
import { getAnnouncements } from '../../services/api'

export default function AnnouncementTicker() {
  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => getAnnouncements().then((r) => r.data.data),
    staleTime: 1000 * 60 * 10,
  })

  if (!data?.length) return null

  // Duplicate for seamless loop
  const items = [...data, ...data]

  return (
    <div className="bg-hun-black text-white overflow-hidden py-2 text-xs tracking-widest">
      <div className="ticker-track">
        {items.map((item, i) => (
          <span key={i} className="mx-8">{item.content}</span>
        ))}
      </div>
    </div>
  )
}
