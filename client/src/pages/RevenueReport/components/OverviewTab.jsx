import { CalendarClock, CircleCheckBig, HandCoins, Info, Receipt, Wallet } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDay } from '../../../utils/formatDate.js'
import KpiCard from './KpiCard.jsx'
import PayoutAccountInfo from './PayoutAccountInfo.jsx'
import PeakHours from './PeakHours.jsx'
import RatingSummary from './RatingSummary.jsx'
import RecentOrders from './RecentOrders.jsx'
import RevenueChart from './RevenueChart.jsx'
import TopDishes from './TopDishes.jsx'

// "Tổng quan" tab: KPIs vs the previous period, revenue chart, peak hours, best sellers, latest orders, ratings
export default function OverviewTab({ report, onOpenTab }) {
  const { summary, previous, currentCycle } = report

  return (
    <div className="space-y-6">
      {!report.hasCommissionRules && (
        <p className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          Nền tảng chưa áp dụng mức hoa hồng nào nên phí nền tảng đang là 0đ.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Doanh thu gộp"
          value={formatCurrency(summary.grossRevenue)}
          current={summary.grossRevenue}
          previous={previous.grossRevenue}
          detail={`Tiền món + topping + đóng gói`}
        />
        <KpiCard
          icon={HandCoins}
          label="Thực nhận"
          value={formatCurrency(summary.netRevenue)}
          current={summary.netRevenue}
          previous={previous.netRevenue}
          detail={`Đã trừ phí nền tảng ${formatCurrency(summary.platformFee)} (${summary.commissionRate}%)`}
        />
        <KpiCard
          icon={CircleCheckBig}
          label="Đơn hoàn thành"
          value={summary.deliveredOrders}
          current={summary.deliveredOrders}
          previous={previous.deliveredOrders}
          detail={`${summary.completionRate}% / ${summary.totalOrders} đơn · quán từ chối ${summary.rejectedOrders} (${summary.rejectRate}%)`}
        />
        <KpiCard
          icon={Receipt}
          label="Giá trị TB / đơn"
          value={formatCurrency(summary.averageOrderValue)}
          current={summary.averageOrderValue}
          previous={previous.averageOrderValue}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-soft/70 bg-brand-light/60 px-4 py-3">
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-slate-700">
          <CalendarClock className="h-4 w-4 text-brand" aria-hidden="true" />
          Chu kỳ tuần này ({formatDay(currentCycle.from)} – {formatDay(currentCycle.to)}):
          <b className="tabular-nums text-slate-900">{formatCurrency(currentCycle.netRevenue)}</b>
          từ {currentCycle.deliveredOrders} đơn · chuyển khoản ngày {formatDay(currentCycle.payoutDate)}
        </p>
        <PayoutAccountInfo account={report.payoutAccount} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart series={report.range.series} groupBy={report.range.groupBy} />
        </div>
        <PeakHours peakHours={report.peakHours} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <TopDishes dishes={report.topDishes} />
        <RecentOrders orders={report.recentOrders} onShowAll={() => onOpenTab('orders')} />
        <RatingSummary reviews={report.reviews} onShowAll={() => onOpenTab('reviews')} />
      </div>

      {report.complaints.total > 0 && (
        <p className="text-xs text-slate-500">
          Trong kỳ có {report.complaints.total} khiếu nại ({report.complaints.open} đang xử lý). Tiền bồi thường cho khách{' '}
          {formatCurrency(report.complaints.refundAmount)} do nền tảng chi trả, không trừ vào tiền quyết toán của quán.
        </p>
      )}
    </div>
  )
}
