// Titled block inside an admin drawer
export default function AdminSection({ title, aside, children }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
