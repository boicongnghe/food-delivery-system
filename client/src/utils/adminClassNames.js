// Tailwind class strings shared by the admin pages (dark theme of AdminLayout)

export const ADMIN_CARD = 'rounded-3xl border border-slate-800 bg-slate-950 shadow-xl'

export const ADMIN_INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_LABEL = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON = {
  primary: `${BUTTON_BASE} bg-purple-600 text-white shadow-md shadow-purple-600/30 hover:bg-purple-500`,
  secondary: `${BUTTON_BASE} border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white`,
  success: `${BUTTON_BASE} bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500`,
  danger: `${BUTTON_BASE} bg-red-600 text-white shadow-md shadow-red-600/30 hover:bg-red-500`,
}

export const ADMIN_TABLE_HEAD = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500'
export const ADMIN_TABLE_CELL = 'px-4 py-3 align-top text-sm text-slate-300'
