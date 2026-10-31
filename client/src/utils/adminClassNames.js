// Tailwind class strings shared by the admin pages (customer palette, light + dark mode)

export const ADMIN_CARD =
  'rounded-3xl border border-slate-100 dark:border-crave-border bg-white dark:bg-crave-surface shadow-sm dark:shadow-xl'

export const ADMIN_INPUT =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-crave-dark px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_LABEL = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON = {
  primary: `${BUTTON_BASE} bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary-hover`,
  secondary: `${BUTTON_BASE} border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-crave-border text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white`,
  success: `${BUTTON_BASE} bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500`,
  danger: `${BUTTON_BASE} bg-red-600 text-white shadow-md shadow-red-600/30 hover:bg-red-500`,
}

export const ADMIN_TABLE_HEAD = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500'
export const ADMIN_TABLE_CELL = 'px-4 py-3 align-top text-sm text-slate-700 dark:text-slate-300'
