import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CircleAlert, Headphones, Landmark, ReceiptText, Settings, Wallet, X } from 'lucide-react'
import toast from 'react-hot-toast'
import driverApi from '../../api/driverApi'
import walletApi from '../../api/walletApi.js'
import PayoutAccountsCard from '../../components/PayoutAccountsCard/PayoutAccountsCard.jsx'
import AvatarModal from '../../components/AvatarModal/AvatarModal.jsx'
import Footer from '../../components/Footer/Footer.jsx'
import Header from '../../components/Header/Header.jsx'
import ShipperHeaderBar from './components/ShipperHeaderBar.jsx'
import SectionCard from './components/SectionCard.jsx'
import StatCards from './components/StatCards'
import EarningsChart from './components/EarningsChart'
import TripLedger from './components/TripLedger'
import DailyMissions from './components/DailyMissions'
import CustomerPraise from './components/CustomerPraise'
import HotspotMap from './components/HotspotMap'
import DriverSettings from './components/DriverSettings'
import DeliveryOrders from './components/DeliveryOrders'

// Bank accounts of the shipper (same card and rules as the restaurant / customer wallets)
const USER_ACCOUNT_API = {
  add: walletApi.addMyPayoutAccount,
  setDefault: walletApi.setMyDefaultPayoutAccount,
  remove: walletApi.removeMyPayoutAccount,
}

// Sections of the shipper portal: one URL each (/shipper/<id>), same pattern as the restaurant portal
const SHIPPER_NAV_ITEMS = [
  { to: '/shipper/dashboard', label: 'Tổng Quan' },
  { to: '/shipper/orders', label: 'Đơn Giao' },
  { to: '/shipper/history', label: 'Lịch Sử Chuyến' },
  { to: '/shipper/wallet', label: 'Ví & Rút Tiền' },
  { to: '/shipper/ranking', label: 'Xếp Hạng' },
]
// Less used pages go to the account menu (keeps the header on one line)
const SHIPPER_MENU_ITEMS = [
  { to: '/shipper/wallet', label: 'Ví & rút tiền', icon: Wallet },
  { to: '/shipper/support', label: 'Hỗ trợ', icon: Headphones },
  { to: '/shipper/settings', label: 'Cài đặt tài khoản', icon: Settings },
]
const SHIPPER_TABS = ['dashboard', 'orders', 'history', 'wallet', 'ranking', 'support', 'settings']
const PERIOD_TABS = ['dashboard', 'history', 'ranking'] // screens filtered by Hôm nay / Tuần / Tháng

const DATE_TABS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
]

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Không thể tải dữ liệu tài xế.'
}

const SUPPORT_TOPICS = [
  {
    question: 'Thu nhập được cập nhật khi nào?',
    answer: 'Số liệu trên trang được tải từ hồ sơ dashboard của tài xế. Tần suất cập nhật phụ thuộc vào hệ thống ghi nhận chuyến và thu nhập.',
  },
  {
    question: 'Tôi cần làm gì nếu số dư không đúng?',
    answer: 'Đối chiếu biên lai chuyến xe với số dư ví. Hệ thống hiện chưa có chức năng gửi phiếu hỗ trợ trực tiếp; vui lòng liên hệ quản trị viên dự án.',
  },
  {
    question: 'Tôi có thể rút tiền ngay trên trang này không?',
    answer: 'Bạn có thể gửi yêu cầu rút từ ví ảo theo hạn mức hiển thị. Dự án chưa kết nối ngân hàng nên yêu cầu chưa chuyển thành giao dịch thật.',
  },
]

function SupportCenter() {
  return (
    <SectionCard title="Trung tâm hỗ trợ" icon={Headphones} badge="Câu hỏi thường gặp" as="h1" className="mx-auto max-w-3xl">
      <p className="text-sm text-slate-600">Tìm câu trả lời nhanh cho các vấn đề về thu nhập, số dư và tài khoản.</p>
      <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-brand-soft/70">
        {SUPPORT_TOPICS.map(topic => (
          <details className="group px-4 py-3" key={topic.question}>
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
              <span className="mr-2 inline-block text-brand transition-transform group-open:rotate-90">›</span>
              {topic.question}
            </summary>
            <p className="mt-2 pl-4 text-sm text-slate-600">{topic.answer}</p>
          </details>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Chưa có kênh chat hoặc gửi yêu cầu hỗ trợ được cấu hình cho dự án.</p>
    </SectionCard>
  )
}

function DriverDashboard() {
  // The open section comes from the URL (/shipper/orders): survives F5, Back works, header links highlight it
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = SHIPPER_TABS.includes(tab) ? tab : 'dashboard'
  const setActiveTab = (nextTab) => navigate(`/shipper/${nextTab}`)
  const [mobilePreview, setMobilePreview] = useState(false)
  const [period, setPeriod] = useState('today')
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadCount, setReloadCount] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [showPayoutNotice, setShowPayoutNotice] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalError, setWithdrawalError] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [payoutAccounts, setPayoutAccounts] = useState(null) // { accounts, maxAccounts } once loaded

  const loadPayoutAccounts = useCallback(() => {
    walletApi
      .getMyPayoutAccounts()
      .then(response => setPayoutAccounts(response.data))
      .catch(() => setPayoutAccounts(current => current || { accounts: [], maxAccounts: 5 }))
  }, [])
  const defaultPayoutAccount = payoutAccounts?.accounts?.find(account => account.isDefault) || null
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const fetchDashboard = async () => {
      try {
        const data = await driverApi.getDashboard(period, controller.signal)
        setDashboard(data)
        setLoadError('')
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setLoadError(getErrorMessage(error))
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }
    fetchDashboard()
    return () => controller.abort()
  }, [period, reloadCount])

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      setReloadCount(count => count + 1)
    }, 5 * 60 * 1000)
    return () => window.clearInterval(refreshTimer)
  }, [])

  const handleOnlineToggle = async (isOnline) => {
    setStatusUpdating(true)
    setActionError('')

    try {
      const status = await driverApi.updateOnlineStatus(isOnline)
      setDashboard(current => current ? { ...current, isOnline: status.isOnline } : current)
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleProfileUpdated = (updated) => {
    setDashboard(current => current
      ? { ...current, profile: updated.profile, payoutBank: updated.payoutBank }
      : current)
  }

  const openWithdrawalDialog = () => {
    loadPayoutAccounts() // the dialog shows where the money goes
    setWithdrawalAmount('')
    setWithdrawalError('')
    setShowPayoutNotice(true)
  }

  const handleWithdrawal = async (event) => {
    event.preventDefault()
    setWithdrawing(true)
    setWithdrawalError('')
    try {
      const result = await driverApi.requestWithdrawal(Number(withdrawalAmount))
      toast.success(result.message)
      setShowPayoutNotice(false)
      setWithdrawalAmount('')
      setReloadCount(count => count + 1)
    } catch (error) {
      setWithdrawalError(getErrorMessage(error))
    } finally {
      setWithdrawing(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'wallet') loadPayoutAccounts()
  }, [activeTab, reloadCount, loadPayoutAccounts])

  const periodLabel = DATE_TABS.find(tab => tab.id === period)?.label || DATE_TABS[0].label
  const profile = dashboard?.profile
  const summary = dashboard || {}
  const latestUpdate = dashboard?.updatedAt
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dashboard.updatedAt))
    : ''

  return (
    <div
      className={`flex min-h-screen flex-col bg-cream ${
        mobilePreview ? 'mx-auto max-w-[430px] border-x border-brand-soft shadow-2xl' : ''
      }`}
    >
      {mobilePreview && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
          <span>Đang xem trước giao diện mobile</span>
          <button type="button" onClick={() => setMobilePreview(false)} className="rounded bg-white/15 px-2 py-1 hover:bg-white/25">
            Thoát xem trước
          </button>
        </div>
      )}
      <Header
        subtitle="Kênh Tài Xế"
        navItems={SHIPPER_NAV_ITEMS}
        status={dashboard ? { label: dashboard.isOnline ? 'Đang trực' : 'Ngoại tuyến', isOpen: Boolean(dashboard.isOnline) } : null}
        accountImage={profile?.avatarUrl}
        accountName={profile?.name}
        accountCaption={profile ? `Tài xế${profile.driverCode ? ` · ${profile.driverCode}` : ''}` : ''}
        menuItems={SHIPPER_MENU_ITEMS}
      />
      <ShipperHeaderBar
        profile={profile}
        isOnline={Boolean(dashboard?.isOnline)}
        statusUpdating={statusUpdating || isLoading || !dashboard}
        onToggleOnline={handleOnlineToggle}
        onEditAvatar={() => setAvatarModalOpen(true)}
        periods={DATE_TABS}
        period={period}
        onPeriodChange={PERIOD_TABS.includes(activeTab) ? (nextPeriod) => {
          if (nextPeriod !== period) {
            setIsLoading(true)
            setLoadError('')
            setPeriod(nextPeriod)
          }
        } : null}
        lastUpdate={latestUpdate}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 lg:px-8">
        {actionError && <p className="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{actionError}</p>}

        {isLoading && (
          <div className="flex justify-center py-24" role="status" aria-label="Đang tải dữ liệu bảng điều khiển">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        )}

        {!isLoading && loadError && (
          <div className="rounded-xl border border-red-200 bg-white px-6 py-12 text-center" role="alert">
            <p className="text-sm text-red-700">{loadError}</p>
            <button className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover" type="button" onClick={() => {
              setIsLoading(true)
              setLoadError('')
              setReloadCount(count => count + 1)
            }}>
              Thử lại
            </button>
          </div>
        )}

        {!isLoading && !loadError && dashboard && (
          <>
            {activeTab === 'dashboard' && (
              <>
                <StatCards
                  summary={{ ...summary, tier: profile?.tier }}
                  onWithdraw={openWithdrawalDialog}
                />
                <div className="flex items-center gap-3 rounded-xl border border-brand-soft/70 bg-brand-light/60 px-4 py-3">
                  <ReceiptText className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Phiếu thu nhập · {periodLabel}</p>
                    <p className="text-sm text-slate-600">
                      {summary.completedTrips} chuyến hoàn tất · {Number(summary.totalEarnings || 0).toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                </div>
                <div className="grid items-start gap-6 xl:grid-cols-3">
                  <div className="space-y-6 xl:col-span-2">
                    <EarningsChart
                      earningsByHour={summary.earningsByHour || []}
                      forecast={summary.forecast || []}
                      periodLabel={periodLabel}
                    />
                    <TripLedger trips={summary.trips || []} periodLabel={periodLabel} />
                  </div>
                  <div className="space-y-6">
                    <DailyMissions missions={summary.missions || []} />
                    <CustomerPraise
                      reviews={summary.reviews || []}
                      badges={summary.badges || []}
                      rating={summary.rating}
                    />
                    <HotspotMap hotspots={summary.hotspots || []} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <TripLedger trips={summary.trips || []} periodLabel={periodLabel} />
            )}

            {activeTab === 'wallet' && (
              <div className="grid items-start gap-5 lg:grid-cols-2">
              <SectionCard title="Ví tài xế" icon={Wallet} badge="Số dư khả dụng" as="h1">
                <p className="text-4xl font-extrabold tabular-nums text-slate-900">
                  {Number(summary.walletBalance || 0).toLocaleString('vi-VN')}đ
                </p>
                <div className="mt-4 divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between gap-3 py-2">
                    <span className="text-slate-500">Hạn mức rút còn hôm nay</span>
                    <strong className="tabular-nums text-slate-900">{Number(summary.withdrawalLimits?.dailyRemaining || 0).toLocaleString('vi-VN')}đ</strong>
                  </div>
                  <div className="flex justify-between gap-3 py-2">
                    <span className="text-slate-500">Thu nhập tuần này</span>
                    <strong className="tabular-nums text-slate-900">{Number(summary.weeklyEarnings || 0).toLocaleString('vi-VN')}đ</strong>
                  </div>
                  <div className="flex justify-between gap-3 py-2">
                    <span className="text-slate-500">Tài khoản nhận tiền (mặc định)</span>
                    <strong className="text-right text-slate-900">{summary.payoutBank || 'Chưa thiết lập'}</strong>
                  </div>
                </div>
                <button
                  className="mt-4 w-full rounded-md bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover"
                  onClick={openWithdrawalDialog}
                  type="button"
                >
                  Yêu cầu rút tiền
                </button>
                <p className="mt-2 text-xs text-slate-500">
                  Yêu cầu rút sẽ trừ ví ảo; hiện chưa thực hiện chuyển khoản ngân hàng thật.
                </p>
              </SectionCard>
              <PayoutAccountsCard
                accounts={payoutAccounts?.accounts || []}
                maxAccounts={payoutAccounts?.maxAccounts}
                api={USER_ACCOUNT_API}
                onChanged={() => setReloadCount(count => count + 1)}
              />
              </div>
            )}

            {activeTab === 'ranking' && (
              <div className="grid items-start gap-6 lg:grid-cols-2">
                <DailyMissions missions={summary.missions || []} />
                <CustomerPraise
                  reviews={summary.reviews || []}
                  badges={summary.badges || []}
                  rating={summary.rating}
                />
              </div>
            )}

            {activeTab === 'support' && <SupportCenter />}

            {activeTab === 'orders' && (
              <DeliveryOrders onOrderChanged={() => setReloadCount(count => count + 1)} />
            )}

            {activeTab === 'settings' && (
              <DriverSettings
                onProfileUpdated={handleProfileUpdated}
                onOpenWallet={() => setActiveTab('wallet')}
                mobilePreview={mobilePreview}
                onMobilePreviewChange={setMobilePreview}
              />
            )}
          </>
        )}
      </main>

      <Footer subtitle="Cổng đối tác tài xế giao hàng" />

      {showPayoutNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !withdrawing && setShowPayoutNotice(false)}
          role="presentation"
        >
          <section
            aria-labelledby="payout-dialog-title"
            aria-modal="true"
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-brand-soft/60 px-5 py-4">
              <h2 id="payout-dialog-title" className="flex items-center gap-2 font-serif text-xl font-semibold text-slate-900">
                <Landmark className="h-5 w-5 text-brand" aria-hidden="true" />
                Yêu cầu rút tiền
              </h2>
              <button
                aria-label="Đóng thông báo"
                className="rounded p-1 text-slate-500 hover:bg-brand-light"
                onClick={() => !withdrawing && setShowPayoutNotice(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 px-5 pt-4 text-sm text-slate-600">
              <p>
                Số dư ví hiện tại là{' '}
                <strong className="text-slate-900">{Number(summary.walletBalance || 0).toLocaleString('vi-VN')}đ</strong>.
              </p>
              <p>
                Mỗi lần rút {Number(summary.withdrawalLimits?.minimum || 0).toLocaleString('vi-VN')}–
                {Number(summary.withdrawalLimits?.perWithdrawal || 0).toLocaleString('vi-VN')}đ.
                Hạn mức còn hôm nay:{' '}
                <strong className="text-slate-900">{Number(summary.withdrawalLimits?.dailyRemaining || 0).toLocaleString('vi-VN')}đ</strong>.
              </p>
            </div>
            <form className="space-y-3 px-5 pb-5 pt-3" onSubmit={handleWithdrawal}>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-700" htmlFor="withdrawal-amount">
                Số tiền muốn rút (VND)
              </label>
              <input
                autoFocus
                className="w-full rounded-md border border-transparent bg-brand-light px-4 py-2.5 text-lg font-bold tabular-nums text-slate-900 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
                id="withdrawal-amount"
                max={Math.min(
                  summary.walletBalance || 0,
                  summary.withdrawalLimits?.perWithdrawal || 0,
                  summary.withdrawalLimits?.dailyRemaining || 0,
                )}
                min={summary.withdrawalLimits?.minimum || 1}
                onChange={event => setWithdrawalAmount(event.target.value)}
                placeholder="Nhập số tiền"
                required
                step="1"
                type="number"
                value={withdrawalAmount}
              />
              {defaultPayoutAccount ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Tiền chuyển về tài khoản mặc định:{' '}
                  <strong>
                    {defaultPayoutAccount.bankName} {defaultPayoutAccount.accountNumber} – {defaultPayoutAccount.accountHolder}
                  </strong>
                </p>
              ) : (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Chưa có tài khoản nhận tiền. Hãy thêm tài khoản ngân hàng trong tab Ví trước khi rút.
                </p>
              )}
              {withdrawalError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{withdrawalError}</p>}
              <p className="text-xs text-slate-500">
                Yêu cầu được ghi nhận và trừ vào ví ảo; hiện chưa thực hiện chuyển khoản ngân hàng thật.
              </p>
              <button
                className="w-full rounded-md bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
                disabled={
                  withdrawing
                  || !defaultPayoutAccount
                  || !summary.walletBalance
                  || !summary.withdrawalLimits?.dailyRemaining
                  || summary.walletBalance < (summary.withdrawalLimits?.minimum || Infinity)
                }
                type="submit"
              >
                {withdrawing ? 'Đang gửi yêu cầu…' : 'Xác nhận rút'}
              </button>
            </form>
          </section>
        </div>
      )}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => {
          setAvatarModalOpen(false)
          setReloadCount(count => count + 1)
        }}
      />
    </div>
  )
}

export default DriverDashboard
