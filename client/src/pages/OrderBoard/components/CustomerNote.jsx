import { Pin } from 'lucide-react'

export default function CustomerNote({ note, label = 'Ghi chú khách' }) {
  if (!note) return null
  return (
    <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
      <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">{label}</p>
        <p className="text-sm text-slate-800">“{note}”</p>
      </div>
    </div>
  )
}
