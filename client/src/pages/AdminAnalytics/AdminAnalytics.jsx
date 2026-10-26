import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChartColumn, HandCoins, Info, Receipt, ShoppingBag, Star, Undo2, Wallet } from 'lucide-react'
import analyticsApi from '../../api/analyticsApi.js'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import { downloadCsv } from '../../utils/downloadCsv.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatDay, todayInVietnam } from '../../utils/formatDate.js'
import { formatCompact, formatPeriodLong, formatPeriodShort, getPresetRange } from './chartUtils.js'
import { ORDER_SERIES, REVENUE_SERIES } from './constants.js'
import AnalyticsFilterBar from './components/AnalyticsFilterBar.jsx'
import ChartCard from './components/ChartCard.jsx'
import ColumnChart from './components/ColumnChart.jsx'
import KpiTile from './components/KpiTile.jsx'
import OperationsSummary from './components/OperationsSummary.jsx'
import RatingDistribution from './components/RatingDistribution.jsx'
import SeriesTable from './components/SeriesTable.jsx'
import TopRestaurantTable from './components/TopRestaurantTable.jsx'

const DEFAULT_PRESET = '30d'
const ORDER_TABLE_COLUMNS = [
  { key: 'period', header: 'Kỳ' },
  { key: 'orders', header: 'Tổng đơn', align: 'right' },
  { key: 'delivered', header: 'Giao thành công', align: 'right' },
  { key: 'cancelled', header: 'Đã hủy', align: 'right' },
]
const REVENUE_TABLE_COLUMNS = [
  { key: 'period', header: 'Kỳ' },
  { key: 'gmv', header: 'Doanh thu (GMV)', align: 'right' },
  { key: 'commission', header: 'Hoa hồng nền tảng', align: 'right' },
]

const formatCount = (value) => String(value)

// UC44 - View analytics and reports
export default function AdminAnalytics() {
  const [today] = useState(todayInVietnam)
  const [preset, setPreset] = useState(DEFAULT_PRESET)
  const [range, setRange] = useState(() => getPresetRange(DEFAULT_PRESET, todayInVietnam()))
  const [customRange, setCustomRange] = useState(range)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tableViews, setTableViews] = useState({ orders: false, revenue: false })

  useEffect(() => {
    let ignore = false

    analyticsApi
      .getAnalytics(range)
      .then((response) => {
        if (!ignore) setReport(response.data)
      })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || 'Không tải được báo cáo thống kê')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [range])

  const changePreset = (value) => {
    setPreset(value)
    if (value === 'custom') return
    setLoading(true)
    setRange(getPresetRange(value, today))
  }

  const applyCustomRange = (event) => {
    event.preventDefault()
    if (!customRange.from || !customRange.to || customRange.from > customRange.to) {
      toast.error('Khoảng ngày không hợp lệ')
      return
    }
    setLoading(true)
    setRange({ ...customRange })
  }

  const toggleTable = (chart) => setTableViews((prev) => ({ ...prev, [chart]: !prev[chart] }))

  const periods = report?.series || []
  const unitLabel = report?.range.groupBy === 'month' ? 'tháng' : 'ngày'
  const orderPoints = periods.map((period) => ({
    key: period.key,
    label: formatPeriodShort(period.key),
    title: formatPeriodLong(period.key),
    values: {
      delivered: period.delivered,
      cancelled: period.cancelled,
      inProgress: period.orders - period.delivered - period.cancelled,
    },
  }))
  const revenuePoints = periods.map((period) => ({
    key: period.key,
    label: formatPeriodShort(period.key),
    title: formatPeriodLong(period.key),
    values: { gmv: period.gmv },
    extraRows: [{ label: 'Hoa hồng nền tảng', value: formatCurrency(period.commission) }],
  }))
  const tableRows = periods.map((period) => ({
    key: period.key,
    period: formatPeriodLong(period.key),
    orders: period.orders,
    delivered: period.delivered,
    cancelled: period.cancelled,
    gmv: formatCurrency(period.gmv),
    commission: formatCurrency(period.commission),
  }))
  const orderLegend = ORDER_SERIES.map((item) => ({
    ...item,
    total: orderPoints.reduce((sum, point) => sum + point.values[item.id], 0),
  }))

  const exportCsv = () => {
    downloadCsv(`bao-cao-${report.range.from}_${report.range.to}.csv`, [
      ['Kỳ', 'Tổng đơn', 'Giao thành công', 'Đã hủy', 'Doanh thu GMV (đ)', 'Hoa hồng nền tảng (đ)'],
      ...periods.map((period) => [
        formatPeriodLong(period.key),
        period.orders,
        period.delivered,
        period.cancelled,
        period.gmv,
        period.commission,
      ]),
    ])
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={ChartColumn}
        title="Thống kê & báo cáo"
        description={`Từ ${formatDay(range.from)} đến ${formatDay(range.to)} · đơn tính theo ngày đặt, doanh thu và hoa hồng chỉ gồm đơn giao thành công`}
      />

      <AnalyticsFilterBar
        preset={preset}
        customRange={customRange}
        today={today}
        canExport={Boolean(report) && !loading}
        onPresetChange={changePreset}
        onCustomRangeChange={(changes) => setCustomRange((prev) => ({ ...prev, ...changes }))}
        onApplyCustomRange={applyCustomRange}
        onExport={exportCsv}
      />

      {!report ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        // Refetch keeps the previous report on screen, dimmed, instead of flashing a loader
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {!report.hasCommissionRules && (
            <p className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <Info className="h-4 w-4 shrink-0" />
              Chưa có quy tắc hoa hồng nào nên hoa hồng đang được tính là 0đ.
              <Link to="/admin/commission-rules" className="font-bold underline">
                Thiết lập quy tắc
              </Link>
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiTile
              icon={Wallet}
              label="Doanh thu (GMV)"
              value={formatCurrency(report.summary.gmv)}
              detail={`${report.summary.deliveredOrders} đơn giao thành công · tiền món ${formatCurrency(report.summary.foodRevenue)}`}
            />
            <KpiTile
              icon={HandCoins}
              label="Hoa hồng nền tảng"
              value={formatCurrency(report.summary.commission)}
              detail={`Nhà hàng ${formatCurrency(report.summary.restaurantCommission)} · shipper ${formatCurrency(report.summary.shipperCommission)}`}
            />
            <KpiTile
              icon={ShoppingBag}
              label="Đơn hàng"
              value={report.summary.totalOrders}
              detail={`Hủy ${report.summary.cancelledOrders} (${report.summary.cancelRate}%) · đang xử lý ${report.summary.inProgressOrders}`}
            />
            <KpiTile
              icon={Receipt}
              label="Giá trị trung bình / đơn"
              value={formatCurrency(report.summary.averageOrderValue)}
              detail={`Phí giao ${formatCurrency(report.summary.shippingFees)} · giảm giá ${formatCurrency(report.summary.discounts)}`}
            />
            <KpiTile
              icon={Star}
              label="Đánh giá trung bình"
              value={`${report.reviews.restaurantAverage} ★`}
              detail={`${report.reviews.total} lượt đánh giá · shipper ${report.reviews.shipperAverage} ★`}
            />
            <KpiTile
              icon={Undo2}
              label="Hoàn tiền cho khách"
              value={formatCurrency(report.summary.cancellationRefunds + report.summary.complaintRefunds)}
              detail={`Hủy đơn ${formatCurrency(report.summary.cancellationRefunds)} · khiếu nại ${formatCurrency(report.summary.complaintRefunds)}`}
            />
          </div>

          <ChartCard
            title={`Đơn hàng theo ${unitLabel}`}
            legend={orderLegend}
            showTable={tableViews.orders}
            onToggleTable={() => toggleTable('orders')}
          >
            {tableViews.orders ? (
              <SeriesTable columns={ORDER_TABLE_COLUMNS} rows={tableRows} />
            ) : (
              <ColumnChart
                points={orderPoints}
                series={ORDER_SERIES}
                integer
                formatValue={formatCount}
                formatTick={formatCompact}
                ariaLabel={`Biểu đồ cột chồng số đơn hàng theo ${unitLabel}`}
              />
            )}
          </ChartCard>

          <ChartCard
            title={`Doanh thu (GMV) theo ${unitLabel}`}
            description="Di chuột hoặc dùng phím mũi tên trên biểu đồ để xem hoa hồng nền tảng từng kỳ"
            showTable={tableViews.revenue}
            onToggleTable={() => toggleTable('revenue')}
          >
            {tableViews.revenue ? (
              <SeriesTable columns={REVENUE_TABLE_COLUMNS} rows={tableRows} />
            ) : (
              <ColumnChart
                points={revenuePoints}
                series={REVENUE_SERIES}
                formatValue={formatCurrency}
                formatTick={formatCompact}
                ariaLabel={`Biểu đồ cột doanh thu theo ${unitLabel}`}
              />
            )}
          </ChartCard>

          {/* grid-cols-1 = minmax(0, 1fr): the wide restaurant table scrolls inside its card on phones */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopRestaurantTable restaurants={report.topRestaurants} />
            <RatingDistribution reviews={report.reviews} />
          </div>

          <OperationsSummary complaints={report.complaints} deliveryIssues={report.deliveryIssues} />
        </div>
      )}
    </div>
  )
}
