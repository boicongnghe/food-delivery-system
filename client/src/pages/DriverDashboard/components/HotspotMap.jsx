import { MapPinned } from 'lucide-react'
import SectionCard from './SectionCard.jsx'

// Demand level -> colours of its dot, bar, label and heat zone
const LEVEL_CONFIG = {
  hot: { label: 'Cực cao', dot: 'bg-red-600', bar: 'bg-red-600', text: 'text-red-700', zone: 'bg-red-500/25' },
  med: { label: 'Trung bình', dot: 'bg-amber-600', bar: 'bg-amber-600', text: 'text-amber-700', zone: 'bg-orange-400/25' },
  low: { label: 'Thấp', dot: 'bg-sky-700', bar: 'bg-sky-700', text: 'text-sky-700', zone: 'bg-yellow-300/30' },
}

function HotspotMap({ hotspots }) {
  const pins = hotspots.filter(spot => spot.pin?.top && spot.pin?.left)
  const areaLabel = [...new Set(hotspots.map(spot => spot.district).filter(Boolean))].join(' · ')

  return (
    <SectionCard id="hotspot-map-section" title="Bản đồ điểm nhu cầu" icon={MapPinned} badge={areaLabel || 'Khu vực hoạt động'} bodyClassName="">
      {/* Mini map */}
      <div
        className="relative h-44 overflow-hidden border-b border-slate-100 bg-[#f4f1ea] bg-[linear-gradient(#e7e1d6_1px,transparent_1px),linear-gradient(90deg,#e7e1d6_1px,transparent_1px)] bg-[size:24px_24px]"
        role="img"
        aria-label={`Bản đồ điểm nhu cầu${areaLabel ? `: ${areaLabel}` : ''}`}
      >
        <div className="absolute inset-0" aria-hidden="true">
          {/* Heat zones */}
          {hotspots.map(s => (
            <div
              key={`zone-${s.id}`}
              className={`absolute rounded-full blur-md ${LEVEL_CONFIG[s.level]?.zone || ''}`}
              style={{ top: s.zone.top, left: s.zone.left, width: `${s.zone.width}px`, height: `${s.zone.height}px` }}
            />
          ))}

          {/* Pins */}
          {pins.map(s => (
            <div
              key={`pin-${s.id}`}
              className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ top: s.pin.top, left: s.pin.left }}
              title={`${s.name}: ${s.orders}`}
            >
              <div className="whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">{s.name}</div>
              <div className="mt-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand shadow" />
            </div>
          ))}
        </div>
      </div>

      {/* Area list */}
      <div className="divide-y divide-slate-100" role="list" aria-label="High demand areas">
        {hotspots.map(s => {
          const cfg = LEVEL_CONFIG[s.level] || LEVEL_CONFIG.low
          return (
            <div key={s.id} id={s.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm" role="listitem">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">
                    {s.name} <span className="font-normal text-slate-500">· {s.district}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{s.orders}</div>
                </div>
              </div>
              <div className="flex w-36 shrink-0 items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${s.demand}%` }} />
                </div>
                <span className={`w-16 text-right text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {hotspots.length === 0 && (
        <p className="px-5 py-6 text-center text-sm text-slate-500" role="status">
          Chưa có dữ liệu khu vực được cập nhật.
        </p>
      )}
    </SectionCard>
  )
}

export default HotspotMap
