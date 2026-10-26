import { Search } from 'lucide-react'
import { ADMIN_INPUT } from '../../utils/adminClassNames.js'

export default function AdminSearchInput({ value, onChange, placeholder }) {
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${ADMIN_INPUT} pl-9`}
      />
    </label>
  )
}
