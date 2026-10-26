/**
 * Shared footer for partner portals.
 *
 * @param {string} subtitle - text next to the logo, e.g. "Cổng đối tác nhà hàng & quán ăn"
 * @param {string} hotline - support phone number
 */
const CURRENT_YEAR = new Date().getFullYear()

export default function Footer({ subtitle, hotline = '1900 6868' }) {
  return (
    <footer className="bg-brand-light border-t border-brand-soft/60">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-bold text-brand">GiaoNhanh</span>
          {subtitle && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 text-xs text-slate-600 md:flex-row md:gap-8">
          <span>Hỗ Trợ Kỹ Thuật: {hotline} (24/7)</span>
          <span>© {CURRENT_YEAR} GiaoNhanh Bếp &amp; Phố. Bản quyền đã được bảo hộ.</span>
        </div>
      </div>
    </footer>
  )
}
