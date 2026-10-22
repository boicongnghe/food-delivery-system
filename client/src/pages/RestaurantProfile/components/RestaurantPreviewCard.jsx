import { BadgeCheck, Clock, ImageIcon, MapPin, Smartphone, Star } from 'lucide-react'
import { isOpenNow } from '../../../utils/openingHours.js'

// Distance, fee and times depend on each customer's location/order.
// These sample values only show how the card looks in the customer app.
const SAMPLE_DELIVERY = { eta: '15 - 20 phút', distance: '1.2 km', fee: '16.000đ', prepTime: '~10 phút' }

export default function RestaurantPreviewCard({ form, coverUrl, isVerified, rating, ratingCount }) {
  const isOpen = isOpenNow(form.openingHours)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Smartphone className="w-4 h-4 text-brand" />
          Xem trước hiển thị
        </h2>
        <span className="rounded bg-emerald-800 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
          Trực tiếp
        </span>
      </div>

      <div className="bg-white rounded-xl border border-brand-soft/60 shadow-md overflow-hidden">
        {/* Cover */}
        <div className="relative h-48 bg-brand-light">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <ImageIcon className="w-10 h-10" />
            </div>
          )}
          <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
          </span>
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Clock className="w-3 h-3" />
            {SAMPLE_DELIVERY.eta}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-slate-900">
                <span className="truncate">{form.name || 'Tên quán của bạn'}</span>
                {isVerified && <BadgeCheck className="w-4 h-4 shrink-0 text-emerald-600" />}
              </h3>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-brand" />
                <span className="truncate">{form.address || 'Địa chỉ quán'}</span>
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-brand-soft px-2 py-1 text-sm font-bold text-slate-800">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              {ratingCount > 0 ? (
                <>
                  {rating.toFixed(1)}
                  <span className="text-xs font-normal text-slate-500">({ratingCount}+)</span>
                </>
              ) : (
                <span className="text-xs">Mới</span>
              )}
            </span>
          </div>

          {form.description && (
            <p className="border-t border-brand-soft/60 pt-3 text-xs italic text-slate-600">
              “{form.description}”
            </p>
          )}

          {/* Delivery stats */}
          <div className="grid grid-cols-3 divide-x divide-brand-soft rounded-md bg-brand-light py-2 text-center">
            <div>
              <p className="text-[11px] text-slate-500">Khoảng cách</p>
              <p className="text-sm font-bold text-slate-800">{SAMPLE_DELIVERY.distance}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Phí giao</p>
              <p className="text-sm font-bold text-brand">{SAMPLE_DELIVERY.fee}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Chuẩn bị</p>
              <p className="text-sm font-bold text-slate-800">{SAMPLE_DELIVERY.prepTime}</p>
            </div>
          </div>

          {form.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.categories.map((category) => (
                <span key={category} className="rounded bg-brand-light px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                  {category}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            className="w-full rounded-md bg-brand py-2 text-sm font-bold text-white cursor-default"
          >
            Xem Thực Đơn &amp; Chọn Món
          </button>
        </div>
      </div>
    </div>
  )
}
