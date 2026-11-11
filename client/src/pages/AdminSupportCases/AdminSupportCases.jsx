import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LifeBuoy, MessageSquareWarning, Siren } from 'lucide-react'
import complaintApi from '../../api/complaintApi.js'
import deliveryIssueApi from '../../api/deliveryIssueApi.js'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import ComplaintsPanel from '../AdminComplaints/ComplaintsPanel.jsx'
import DeliveryIssuesPanel from '../AdminDeliveryIssues/DeliveryIssuesPanel.jsx'

// ?tab=<value>; the old pages /admin/complaints and /admin/delivery-issues redirect to their tab
const TABS = [
  {
    value: 'complaints',
    label: 'Khiếu nại',
    hint: 'Khiếu nại của khách hàng sau khi đơn kết thúc: phản hồi và hoàn tiền khi cần',
    icon: MessageSquareWarning,
  },
  {
    value: 'delivery-issues',
    label: 'Sự cố giao hàng',
    hint: 'Báo cáo của shipper khi đang giao: xử lý đơn hàng, xử phạt bên vi phạm',
    icon: Siren,
  },
]
const DEFAULT_TAB = TABS[0].value

// UC42 + UC45 - complaints and delivery issue reports, one tab each. Backend, drawers and forms stay separate.
export default function AdminSupportCases() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = TABS.some(({ value }) => value === requestedTab) ? requestedTab : DEFAULT_TAB
  // Cases waiting for an admin, shown on both tabs
  const [openCounts, setOpenCounts] = useState({})

  // The active panel keeps its own count fresh; load both once so the other tab shows its count too
  useEffect(() => {
    let ignore = false
    const loaders = {
      complaints: complaintApi.getComplaints,
      'delivery-issues': deliveryIssueApi.getDeliveryIssues,
    }
    Object.entries(loaders).forEach(([value, load]) => {
      load({ status: 'open', page: 1, limit: 1 })
        .then((response) => {
          if (!ignore) setOpenCounts((prev) => ({ ...prev, [value]: response.data.counts?.open ?? 0 }))
        })
        .catch(() => {}) // the panel shows the error of its own list
    })
    return () => {
      ignore = true
    }
  }, [])

  const handleComplaintCounts = useCallback(
    (counts) => setOpenCounts((prev) => ({ ...prev, complaints: counts?.open ?? 0 })),
    [],
  )
  const handleIssueCounts = useCallback(
    (counts) => setOpenCounts((prev) => ({ ...prev, 'delivery-issues': counts?.open ?? 0 })),
    [],
  )

  const activeTab = TABS.find(({ value }) => value === tab)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={LifeBuoy}
        title="Khiếu nại & sự cố"
        description="Tiếp nhận khiếu nại của khách hàng và báo cáo sự cố của shipper"
      />

      <div>
        <div role="tablist" aria-label="Loại yêu cầu" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 dark:border-crave-border">
          {TABS.map(({ value, label, icon: Icon }) => {
            const selected = value === tab
            const count = openCounts[value]
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSearchParams(value === DEFAULT_TAB ? {} : { tab: value }, { replace: true })}
                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                  selected
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {count > 0 && (
                  <span
                    title={`${count} đang chờ xử lý`}
                    className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-black leading-none text-white"
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{activeTab.hint}</p>
      </div>

      <div role="tabpanel">
        {tab === 'complaints' ? (
          <ComplaintsPanel onCountsChange={handleComplaintCounts} />
        ) : (
          <DeliveryIssuesPanel onCountsChange={handleIssueCounts} />
        )}
      </div>
    </div>
  )
}
