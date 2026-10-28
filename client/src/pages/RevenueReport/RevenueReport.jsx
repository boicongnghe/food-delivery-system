import { useCallback, useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import reportApi from '../../api/reportApi.js'
import NoRestaurantNotice from '../../components/NoRestaurantNotice/NoRestaurantNotice.jsx'
import PrintPortal from '../../components/PrintPortal/PrintPortal.jsx'
import { downloadCsv } from '../../utils/downloadCsv.js'
import { formatDateTime, formatDay, todayInVietnam } from '../../utils/formatDate.js'
import { formatPeriodLong, getPresetRange } from '../AdminAnalytics/chartUtils.js'
import { CANCELLED_BY_LABELS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, REPORT_TABS, SETTLEMENT_STATUS } from './constants.js'
import CommissionTab from './components/CommissionTab.jsx'
import OrderHistoryTab from './components/OrderHistoryTab.jsx'
import OverviewTab from './components/OverviewTab.jsx'
import PrintableSettlement from './components/PrintableSettlement.jsx'
import ReportFilterBar from './components/ReportFilterBar.jsx'
import ReviewsTab from './components/ReviewsTab.jsx'

const DEFAULT_PRESET = '30d'
const TAB_VALUES = REPORT_TABS.map((tab) => tab.value)
const EXPORT_LABELS = { overview: 'Xuất doanh thu (CSV)', orders: 'Xuất đơn hàng (CSV)', commission: 'Xuất hoa hồng (CSV)' }

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

// Revenue report of the owner's restaurant: overview, order history, reviews and weekly settlement
export default function RevenueReport() {
  const { restaurant } = useOutletContext()
  const [today] = useState(todayInVietnam)
  const [preset, setPreset] = useState(DEFAULT_PRESET)
  const [range, setRange] = useState(() => getPresetRange(DEFAULT_PRESET, todayInVietnam()))
  const [customRange, setCustomRange] = useState(range)
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [orderFilters, setOrderFilters] = useState({ status: 'all', keyword: '' })
  const [exporting, setExporting] = useState(false)
  const [printJob, setPrintJob] = useState(null) // { settlement, at }
  const [printing, setPrinting] = useState(false)

  // Active tab lives in the URL (?tab=orders): survives F5 and Back
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TAB_VALUES.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const openTab = (tab) => setSearchParams(tab === 'overview' ? {} : { tab })

  useEffect(() => {
    if (!restaurant || activeTab !== 'overview') return undefined
    let ignore = false

    reportApi
      .getOverview(range)
      .then((response) => {
        if (!ignore) setOverview(response.data)
      })
      .catch((error) => {
        if (!ignore) toast.error(getErrorMessage(error, 'Không tải được báo cáo doanh thu'))
      })
      .finally(() => {
        if (!ignore) setOverviewLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [restaurant, activeTab, range])

  // Print after the statement is rendered in the portal
  useEffect(() => {
    if (!printJob) return undefined
    const reset = () => setPrintJob(null)
    window.addEventListener('afterprint', reset, { once: true })
    const timer = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', reset)
    }
  }, [printJob])

  const changeOrderFilters = useCallback((changes) => setOrderFilters((prev) => ({ ...prev, ...changes })), [])

  if (!restaurant) {
    return <NoRestaurantNotice message="Hãy tạo hồ sơ nhà hàng trước để xem báo cáo doanh thu." />
  }

  const applyRange = (nextRange) => {
    setOverviewLoading(true)
    setRange(nextRange)
  }

  const changePreset = (value) => {
    setPreset(value)
    if (value !== 'custom') applyRange(getPresetRange(value, today))
  }

  const applyCustomRange = (event) => {
    event.preventDefault()
    if (!customRange.from || !customRange.to || customRange.from > customRange.to || customRange.to > today) {
      toast.error('Khoảng ngày không hợp lệ')
      return
    }
    applyRange({ ...customRange })
  }

  const fileSuffix = `${range.from}_${range.to}`

  const exportOverview = () => {
    downloadCsv(`doanh-thu-${fileSuffix}.csv`, [
      ['Kỳ', 'Đơn hoàn thành', 'Tiền món (đ)', 'Topping (đ)', 'Phí đóng gói (đ)', 'Doanh thu gộp (đ)', 'Phí nền tảng (đ)', 'Thực nhận (đ)'],
      ...overview.range.series.map((point) => [
        formatPeriodLong(point.key),
        point.deliveredOrders,
        point.foodRevenue,
        point.toppingRevenue,
        point.packagingFee,
        point.grossRevenue,
        point.platformFee,
        point.netRevenue,
      ]),
    ])
  }

  const exportOrders = async () => {
    const { data } = await reportApi.exportOrders({ ...range, ...orderFilters })
    if (data.truncated) toast(`Chỉ xuất ${data.limit} đơn mới nhất – hãy chọn khoảng ngày ngắn hơn`)
    downloadCsv(`don-hang-${fileSuffix}.csv`, [
      ['Mã đơn', 'Thời gian đặt', 'Khách hàng', 'Món', 'Thanh toán', 'Trạng thái', 'Doanh thu gộp (đ)', 'Tỉ lệ hoa hồng (%)', 'Phí nền tảng (đ)', 'Thực nhận (đ)'],
      ...data.items.map((order) => [
        order.orderCode,
        formatDateTime(order.createdAt),
        order.customerName,
        order.items.map((item) => `${item.quantity}x ${item.name}`).join('; '),
        PAYMENT_METHOD_LABELS[order.payment.method] || '',
        order.status === 'cancelled' ? CANCELLED_BY_LABELS[order.cancellation?.by] || 'Đã hủy' : ORDER_STATUS_LABELS[order.status],
        order.grossRevenue,
        order.commissionRate,
        order.platformFee,
        order.netRevenue,
      ]),
    ])
  }

  const exportSettlements = async () => {
    const { data } = await reportApi.getSettlements(range)
    downloadCsv(`hoa-hong-${fileSuffix}.csv`, [
      ['Ngày', 'Số đơn', 'Doanh thu gộp (đ)', 'Tỉ lệ hoa hồng (%)', 'Phí nền tảng (đ)', 'Voucher quán (đ)', 'Thực nhận (đ)', 'Ngày chuyển khoản', 'Trạng thái'],
      ...data.days.map((day) => [
        formatDay(day.day),
        day.deliveredOrders,
        day.grossRevenue,
        day.commissionRate,
        day.platformFee,
        day.restaurantVoucher,
        day.netRevenue,
        formatDay(day.cycle.payoutDate),
        SETTLEMENT_STATUS[day.status].label,
      ]),
    ])
  }

  const exporters = { overview: exportOverview, orders: exportOrders, commission: exportSettlements }
  const canExport = activeTab in exporters && (activeTab !== 'overview' || (overview && !overviewLoading))

  const runExport = async () => {
    setExporting(true)
    try {
      await exporters[activeTab]()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không xuất được báo cáo'))
    } finally {
      setExporting(false)
    }
  }

  const printStatement = async () => {
    setPrinting(true)
    try {
      const { data } = await reportApi.getSettlements(range)
      setPrintJob({ settlement: data, at: Date.now() })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không tải được sao kê để in'))
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">Báo cáo doanh thu & thống kê</h1>
        <p className="mt-1 text-sm text-slate-600">
          {restaurant.name} · từ {formatDay(range.from)} đến {formatDay(range.to)} · đơn tính theo ngày đặt, tiền chỉ tính đơn
          hoàn thành
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-brand-soft" role="tablist" aria-label="Mục báo cáo">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => openTab(tab.value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.value ? 'border-brand text-brand' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <ReportFilterBar
        preset={preset}
        customRange={customRange}
        today={today}
        onPresetChange={changePreset}
        onCustomRangeChange={(changes) => setCustomRange((prev) => ({ ...prev, ...changes }))}
        onApplyCustomRange={applyCustomRange}
        exportLabel={EXPORT_LABELS[activeTab]}
        onExport={canExport ? runExport : null}
        exporting={exporting}
        onPrint={printStatement}
        printing={printing}
      />

      {activeTab === 'overview' &&
        (overview ? (
          // Refetch keeps the previous report on screen, dimmed, instead of flashing a loader
          <div className={`transition-opacity ${overviewLoading ? 'opacity-60' : ''}`} aria-busy={overviewLoading}>
            <OverviewTab report={overview} onOpenTab={openTab} />
          </div>
        ) : (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ))}
      {activeTab === 'orders' && <OrderHistoryTab range={range} filters={orderFilters} onFiltersChange={changeOrderFilters} />}
      {activeTab === 'reviews' && <ReviewsTab range={range} />}
      {activeTab === 'commission' && <CommissionTab range={range} />}

      {printJob && (
        <PrintPortal>
          <PrintableSettlement settlement={printJob.settlement} restaurantName={restaurant.name} printedAt={printJob.at} />
        </PrintPortal>
      )}
    </div>
  )
}
