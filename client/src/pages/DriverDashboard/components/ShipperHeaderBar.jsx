import { Camera } from 'lucide-react'

/**
 * Sub header under the shared Header (same role as BoardHeaderBar of the restaurant portal):
 * who is driving, the on-duty switch, and the period filter of the earnings screens.
 * @param {{ id: string, label: string }[]} periods - shown only when onPeriodChange is given
 */
export default function ShipperHeaderBar({
  profile,
  isOnline,
  statusUpdating,
  onToggleOnline,
  onEditAvatar,
  periods = [],
  period,
  onPeriodChange,
  lastUpdate,
}) {
  const vehicle = [profile?.vehicle, profile?.licensePlate].filter(Boolean).join(' · ')

  return (
    <div className="border-b border-brand-soft/60 bg-brand-light/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 lg:px-8">
        {profile && (
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onEditAvatar}
              className="group relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label="Đổi ảnh đại diện tài xế"
              title="Đổi ảnh đại diện"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {(profile.name || 'T').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 text-brand shadow group-hover:text-brand-hover">
                <Camera className="h-3 w-3" aria-hidden="true" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {profile.name}
                {profile.driverCode && <span className="ml-1 font-medium text-slate-500">({profile.driverCode})</span>}
              </p>
              <p className="truncate text-xs text-slate-600">
                {profile.tier || 'Đối tác tài xế'}
                {vehicle && ` · ${vehicle}`}
              </p>
            </div>
          </div>
        )}

        {/* On duty = visible to the order pool; same switch style as the restaurant's "Nhận đơn mới" */}
        <label
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-brand-soft bg-white px-3 py-1.5 text-xs font-bold uppercase text-slate-700"
          title="Bật để nhận đơn giao hàng mới"
        >
          Nhận đơn
          <button
            type="button"
            role="switch"
            aria-checked={isOnline}
            onClick={() => onToggleOnline(!isOnline)}
            disabled={statusUpdating}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
              isOnline ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                isOnline ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className={isOnline ? 'text-emerald-700' : 'text-slate-500'}>{isOnline ? 'Đang trực' : 'Ngoại tuyến'}</span>
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          {onPeriodChange && (
            <div className="flex rounded-md border border-brand-soft bg-white p-0.5" role="group" aria-label="Kỳ thống kê">
              {periods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={period === item.id}
                  onClick={() => onPeriodChange(item.id)}
                  className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                    period === item.id ? 'bg-brand text-white' : 'text-slate-600 hover:bg-brand-light'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {lastUpdate && <span className="text-xs text-slate-500">Cập nhật {lastUpdate}</span>}
        </div>
      </div>
    </div>
  )
}
