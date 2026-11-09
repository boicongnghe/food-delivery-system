/**
 * White card with a serif title, optional icon and badge: the section block of the partner portals
 * (same look as the restaurant report sections).
 * @param {Component} icon - lucide icon
 * @param {'h1'|'h2'} as - heading level of the title
 */
export default function SectionCard({ id, title, icon: Icon, badge, as: Heading = 'h2', className = '', bodyClassName = 'p-5', children }) {
  return (
    <section id={id} className={`rounded-xl border border-brand-soft/70 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <Heading className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-900">
          {Icon && <Icon className="h-4 w-4 text-brand" aria-hidden="true" />}
          {title}
        </Heading>
        {badge && <span className="rounded-md bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">{badge}</span>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
