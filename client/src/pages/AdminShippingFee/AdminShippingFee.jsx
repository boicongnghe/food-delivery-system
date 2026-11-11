import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Bike,
  Save,
  RotateCcw,
  Info,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Sliders,
} from 'lucide-react'
import shippingFeeApi from '../../api/shippingFeeApi.js'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import { ADMIN_BUTTON, ADMIN_CARD, ADMIN_INPUT, ADMIN_LABEL } from '../../utils/adminClassNames.js'
import { formatDateTime } from '../../utils/formatDate.js'

export default function AdminShippingFee() {
  const [settings, setSettings] = useState(null) // { values, defaults, updatedAt, updatedBy }
  const [form, setForm] = useState({
    baseDistanceKm: 2,
    baseFee: 15000,
    perKmFee: 5000,
    maxDistanceKm: 10,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Simulator test distance (km)
  const [testDistance, setTestDistance] = useState(4.5)

  useEffect(() => {
    let ignore = false
    setLoading(true)

    shippingFeeApi
      .getShippingFeeSettings()
      .then((res) => {
        if (ignore) return
        const data = res.data
        setSettings(data)
        if (data?.values) {
          setForm(data.values)
        }
      })
      .catch((err) => {
        if (!ignore) toast.error(err.response?.data?.message || 'Không tải được cấu hình giá cước')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleResetDefaults = () => {
    if (settings?.defaults) {
      setForm(settings.defaults)
      setErrors({})
      toast.success('Đã tải lại thông số mặc định (bấm "Lưu cấu hình" để áp dụng)')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()

    // Client-side quick check
    const newErrors = {}
    if (form.baseDistanceKm < 0) newErrors.baseDistanceKm = 'Khoảng cách cơ bản không được âm'
    if (form.baseFee < 0) newErrors.baseFee = 'Cước phí cơ bản không được âm'
    if (form.perKmFee < 0) newErrors.perKmFee = 'Cước phí mỗi km không được âm'
    if (form.maxDistanceKm <= form.baseDistanceKm) {
      newErrors.maxDistanceKm = `Bán kính tối đa phải lớn hơn khoảng cách cơ bản (${form.baseDistanceKm} km)`
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Vui lòng kiểm tra lại các thông số nhập liệu')
      return
    }

    setSaving(true)
    try {
      const res = await shippingFeeApi.updateShippingFeeSettings(form)
      setSettings(res.data)
      setForm(res.data.values)
      setErrors({})
      toast.success(res.message || 'Cập nhật cấu hình giá cước shipper thành công!')
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể lưu cấu hình'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // Interactive calculation preview based on current form values & testDistance
  const simulated = useMemo(() => {
    const dist = Number(testDistance) || 0
    const baseDist = Number(form.baseDistanceKm) || 0
    const baseFee = Number(form.baseFee) || 0
    const perKm = Number(form.perKmFee) || 0
    const maxDist = Number(form.maxDistanceKm) || 0

    const isExceeded = dist > maxDist

    if (isExceeded) {
      return {
        isExceeded: true,
        extraKm: 0,
        extraFee: 0,
        totalFee: 0,
        message: `Vượt quá bán kính giao hàng tối đa (${maxDist} km). Hệ thống sẽ chặn không cho đặt đơn.`,
      }
    }

    let extraKm = 0
    let extraFee = 0

    if (dist > baseDist) {
      extraKm = Math.ceil(dist - baseDist)
      extraFee = extraKm * perKm
    }

    const totalFee = baseFee + extraFee

    return {
      isExceeded: false,
      extraKm,
      extraFee,
      totalFee,
    }
  }, [testDistance, form])

  const isDirty = settings && JSON.stringify(form) !== JSON.stringify(settings.values)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Header */}
      <AdminPageHeader
        icon={Bike}
        title="Cấu hình giá cước giao hàng & Shipper"
        description="Định giá linh hoạt: khoảng cách cơ bản, cước phí 2km đầu, giá mỗi km tiếp theo và bán kính phục vụ tối đa."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={loading || saving}
              className={ADMIN_BUTTON.secondary}
              title="Đặt lại về mặc định ban đầu"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Khôi phục mặc định
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || !isDirty}
              className={ADMIN_BUTTON.primary}
            >
              <Save className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        }
      />

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={ADMIN_CARD + ' p-5'}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Cước phí cơ bản</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Bike className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {Number(form.baseFee).toLocaleString('vi-VN')}đ
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Áp dụng cho {form.baseDistanceKm} km đầu tiên
          </p>
        </div>

        <div className={ADMIN_CARD + ' p-5'}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Giá mỗi km tiếp</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            +{Number(form.perKmFee).toLocaleString('vi-VN')}đ/km
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Làm tròn lên theo từng km
          </p>
        </div>

        <div className={ADMIN_CARD + ' p-5'}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Bán kính tối đa</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {form.maxDistanceKm} km
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Chặn đơn nếu xa hơn khoảng cách này
          </p>
        </div>

        <div className={ADMIN_CARD + ' p-5'}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Thu nhập tài xế</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            100% cước ship
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Cộng trực tiếp vào ví khi hoàn thành đơn
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Configuration (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSave} className={ADMIN_CARD + ' p-6'}>
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Bảng thông số giá cước vận chuyển
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Các thay đổi sẽ được lưu vào cơ sở dữ liệu MongoDB và áp dụng ngay lập tức cho các đơn hàng tiếp theo.
              </p>
            </div>

            <div className="mt-5 space-y-5">
              {/* 1. Khoảng cách cơ bản */}
              <div>
                <label htmlFor="baseDistanceKm" className={ADMIN_LABEL}>
                  1. Khoảng cách cơ bản (km)
                </label>
                <div className="relative">
                  <input
                    id="baseDistanceKm"
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={form.baseDistanceKm}
                    onChange={(e) => handleChange('baseDistanceKm', e.target.value === '' ? '' : Number(e.target.value))}
                    className={ADMIN_INPUT + ' pr-12'}
                    placeholder="Ví dụ: 2"
                    required
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                    km
                  </span>
                </div>
                {errors.baseDistanceKm && (
                  <p className="mt-1 text-xs text-red-500">{errors.baseDistanceKm}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Quãng đường khởi điểm áp dụng mức giá cơ bản (mặc định 2 km).
                </p>
              </div>

              {/* 2. Cước phí cơ bản */}
              <div>
                <label htmlFor="baseFee" className={ADMIN_LABEL}>
                  2. Cước phí cơ bản (VNĐ)
                </label>
                <div className="relative">
                  <input
                    id="baseFee"
                    type="number"
                    step="500"
                    min="0"
                    max="1000000"
                    value={form.baseFee}
                    onChange={(e) => handleChange('baseFee', e.target.value === '' ? '' : Number(e.target.value))}
                    className={ADMIN_INPUT + ' pr-12 font-bold text-orange-600 dark:text-orange-400'}
                    placeholder="Ví dụ: 15000"
                    required
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                    VNĐ
                  </span>
                </div>
                {errors.baseFee && (
                  <p className="mt-1 text-xs text-red-500">{errors.baseFee}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Phí giao hàng trọn gói cho chặng cơ bản: {Number(form.baseFee || 0).toLocaleString('vi-VN')} VNĐ.
                </p>
              </div>

              {/* 3. Phí mỗi km tiếp theo */}
              <div>
                <label htmlFor="perKmFee" className={ADMIN_LABEL}>
                  3. Cước phí mỗi km tiếp theo (VNĐ / km)
                </label>
                <div className="relative">
                  <input
                    id="perKmFee"
                    type="number"
                    step="500"
                    min="0"
                    max="500000"
                    value={form.perKmFee}
                    onChange={(e) => handleChange('perKmFee', e.target.value === '' ? '' : Number(e.target.value))}
                    className={ADMIN_INPUT + ' pr-16 font-bold text-emerald-600 dark:text-emerald-400'}
                    placeholder="Ví dụ: 5000"
                    required
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                    VNĐ/km
                  </span>
                </div>
                {errors.perKmFee && (
                  <p className="mt-1 text-xs text-red-500">{errors.perKmFee}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Cộng thêm cho mỗi km phát sinh sau khoảng cách cơ bản ({Number(form.perKmFee || 0).toLocaleString('vi-VN')} VNĐ/km).
                </p>
              </div>

              {/* 4. Bán kính giao hàng tối đa */}
              <div>
                <label htmlFor="maxDistanceKm" className={ADMIN_LABEL}>
                  4. Bán kính giao hàng tối đa toàn sàn (km)
                </label>
                <div className="relative">
                  <input
                    id="maxDistanceKm"
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    value={form.maxDistanceKm}
                    onChange={(e) => handleChange('maxDistanceKm', e.target.value === '' ? '' : Number(e.target.value))}
                    className={ADMIN_INPUT + ' pr-12 font-bold'}
                    placeholder="Ví dụ: 10"
                    required
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                    km
                  </span>
                </div>
                {errors.maxDistanceKm && (
                  <p className="mt-1 text-xs text-red-500">{errors.maxDistanceKm}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Nếu khoảng cách thực tế giữa Quán và Khách lớn hơn {form.maxDistanceKm} km, hệ thống từ chối đặt đơn.
                </p>
              </div>
            </div>

            {/* Bottom Meta & Save Action */}
            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                {settings?.updatedBy ? (
                  <span>
                    Chỉnh sửa lần cuối bởi <strong>{settings.updatedBy}</strong> lúc {formatDateTime(settings.updatedAt)}
                  </span>
                ) : (
                  <span>Đang sử dụng cấu hình mặc định của hệ thống</span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || saving || !isDirty}
                className={ADMIN_BUTTON.primary}
              >
                <Save className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Simulator & Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className={ADMIN_CARD + ' p-6'}>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Calculator className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Mô phỏng tính cước thời gian thực
              </h3>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Kéo thanh trượt khoảng cách để xem trước chính xác số tiền Khách hàng phải thanh toán và Shipper nhận được:
            </p>

            {/* Slider */}
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Khoảng cách thử nghiệm:
                </span>
                <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-black text-primary">
                  {testDistance} km
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max={Math.max(15, (Number(form.maxDistanceKm) || 10) + 5)}
                step="0.5"
                value={testDistance}
                onChange={(e) => setTestDistance(Number(e.target.value))}
                className="mt-3 w-full accent-primary cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>0.5 km</span>
                <span>{form.baseDistanceKm} km (Cơ bản)</span>
                <span>{form.maxDistanceKm} km (Tối đa)</span>
                <span>{Math.max(15, (Number(form.maxDistanceKm) || 10) + 5)} km</span>
              </div>
            </div>

            {/* Step-by-step formula */}
            <div className="mt-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chi tiết công thức tính:
              </h4>

              {simulated.isExceeded ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900/50 dark:bg-red-950/40">
                  <AlertTriangle className="mx-auto h-7 w-7 text-red-500" />
                  <p className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
                    Không thể giao hàng ({testDistance} km)
                  </p>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                    {simulated.message}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/30">
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/60">
                    <span className="text-slate-500">
                      Chặng cơ bản (≤ {form.baseDistanceKm} km):
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {Number(form.baseFee).toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/60">
                    <span className="text-slate-500">
                      Chặng phát sinh (+{simulated.extraKm} km):
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{Number(simulated.extraFee).toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      Tổng tiền cước giao hàng:
                    </span>
                    <span className="text-lg font-black text-primary">
                      {Number(simulated.totalFee).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Note on Shipper payout */}
            <div className="mt-5 rounded-2xl bg-orange-50 p-3.5 text-xs text-orange-800 dark:bg-orange-950/30 dark:text-orange-300 border border-orange-100 dark:border-orange-900/50 flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-orange-500 mt-0.5" />
              <span>
                <strong>Ghi chú tài xế:</strong> Shipper nhận toàn bộ số tiền cước <strong>{Number(simulated.totalFee).toLocaleString('vi-VN')}đ</strong> vào ví cá nhân ngay khi giao thành công đơn hàng.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

