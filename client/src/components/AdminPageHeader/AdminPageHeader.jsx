// Title row of an admin page: icon + title + description, actions on the right
export default function AdminPageHeader({ icon: Icon, title, description, actions }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          <Icon className="h-7 w-7 shrink-0 text-primary" />
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
