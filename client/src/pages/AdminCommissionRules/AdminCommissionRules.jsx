import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bike, Info, Percent, Plus, Store } from 'lucide-react'
import commissionRuleApi from '../../api/commissionRuleApi.js'
import AdminEmptyState from '../../components/AdminEmptyState/AdminEmptyState.jsx'
import AdminFilterTabs from '../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import { ADMIN_BUTTON, ADMIN_CARD } from '../../utils/adminClassNames.js'
import { todayInVietnam } from '../../utils/formatDate.js'
import { RULE_STATES } from './constants.js'
import CommissionRuleFormModal from './components/CommissionRuleFormModal.jsx'
import CommissionRuleTable from './components/CommissionRuleTable.jsx'
import CurrentRateCard from './components/CurrentRateCard.jsx'

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

// UC40 - Manage commission rules
export default function AdminCommissionRules() {
  const [data, setData] = useState({ items: [], currentDefaults: {}, today: todayInVietnam() })
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [formRule, setFormRule] = useState(null) // { rule } - rule is null when creating
  const [deletingRule, setDeletingRule] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let ignore = false

    commissionRuleApi
      .getRules()
      .then((response) => {
        if (!ignore) setData(response.data)
      })
      .catch((error) => {
        if (!ignore) toast.error(getErrorMessage(error, 'Không tải được quy tắc hoa hồng'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [refreshKey])

  const refresh = () => setRefreshKey((key) => key + 1)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await commissionRuleApi.deleteRule(deletingRule._id)
      toast.success(response.message)
      refresh()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không xóa được quy tắc'))
    } finally {
      setDeleting(false)
      setDeletingRule(null)
    }
  }

  // The rule list is short: filter by state on the client
  const countOf = (state) => data.items.filter((rule) => rule.state === state).length
  const tabs = [
    { value: 'all', label: 'Tất cả', count: data.items.length },
    ...Object.entries(RULE_STATES).map(([value, state]) => ({ value, label: state.label, count: countOf(value) })),
  ]
  const rules = stateFilter === 'all' ? data.items : data.items.filter((rule) => rule.state === stateFilter)

  return (
    // gap instead of space-y: the ConfirmDialog below is a fixed overlay and must not get a margin
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <AdminPageHeader
        icon={Percent}
        title="Quy tắc hoa hồng"
        description="Tỷ lệ nền tảng thu từ nhà hàng (trên tiền món) và shipper (trên phí giao hàng)"
        actions={
          <button type="button" onClick={() => setFormRule({ rule: null })} className={ADMIN_BUTTON.primary}>
            <Plus className="h-3.5 w-3.5" /> Thêm quy tắc
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CurrentRateCard
          icon={Store}
          title="Hoa hồng nhà hàng hôm nay (mặc định)"
          base="tiền món"
          rule={data.currentDefaults.restaurant}
        />
        <CurrentRateCard
          icon={Bike}
          title="Phí nền tảng shipper hôm nay"
          base="phí giao hàng"
          rule={data.currentDefaults.shipper}
        />
      </div>

      <div className={ADMIN_CARD}>
        <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-crave-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <AdminFilterTabs options={tabs} value={stateFilter} onChange={setStateFilter} />
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Quy tắc riêng của một nhà hàng được ưu tiên hơn quy tắc mặc định trong cùng thời gian.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : rules.length === 0 ? (
          <AdminEmptyState>Chưa có quy tắc hoa hồng nào.</AdminEmptyState>
        ) : (
          <CommissionRuleTable rules={rules} onEdit={(rule) => setFormRule({ rule })} onDelete={setDeletingRule} />
        )}
      </div>

      {formRule && (
        <CommissionRuleFormModal
          rule={formRule.rule}
          today={data.today}
          onClose={() => setFormRule(null)}
          onSaved={() => {
            setFormRule(null)
            refresh()
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingRule)}
        title="Xóa quy tắc hoa hồng?"
        message={`Quy tắc "${deletingRule?.name}" chưa được áp dụng và sẽ bị xóa vĩnh viễn.`}
        confirmLabel="Xóa quy tắc"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingRule(null)}
      />
    </div>
  )
}
