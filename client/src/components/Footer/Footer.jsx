import { UtensilsCrossed } from 'lucide-react'

/**
 * Shared footer for partner portals (restaurant owner, kitchen...).
 *
 * @param {string} subtitle - text next to the logo, e.g. "Kênh Quán Ăn"
 * @param {string} hotline - support phone number
 */
const CURRENT_YEAR = new Date().getFullYear()

export default function Footer({ subtitle = 'Kênh Quán Ăn', hotline = '1900 6868' }) {
  return (
    <footer className="bg-orange-50/50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white shadow-sm">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-800">
            Food<span className="text-primary">Delivery</span>
          </span>
          {subtitle && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-l border-slate-300 pl-2 ml-1">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 text-xs text-slate-600 md:flex-row md:gap-8">
          <span>Hỗ Trợ Kỹ Thuật: {hotline} (24/7)</span>
          <span>© {CURRENT_YEAR} FoodDelivery Partner Portal. Bản quyền đã được bảo hộ.</span>
        </div>
      </div>
    </footer>
  )
}
