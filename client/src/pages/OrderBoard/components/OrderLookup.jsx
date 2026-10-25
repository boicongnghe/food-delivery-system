import { useState } from 'react'
import { Search } from 'lucide-react'

// "Tra mã đơn" box: GN-0042 -> opens the order detail (any status)
export default function OrderLookup({ onLookup }) {
  const [code, setCode] = useState('')
  const [searching, setSearching] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!code.trim() || searching) return
    setSearching(true)
    const found = await onLookup(code.trim().toUpperCase())
    setSearching(false)
    if (found) setCode('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Tra mã đơn (GN-0042)"
        aria-label="Tra cứu mã đơn"
        className="w-44 rounded-md border border-brand-soft bg-white py-1.5 pl-8 pr-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </form>
  )
}
