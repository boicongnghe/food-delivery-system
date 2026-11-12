import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  MessageSquareText,
  MessageSquareWarning,
  PackageX,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import complaintApi from '../../api/complaintApi.js'
import reviewApi from '../../api/reviewApi.js'
import ComplaintFormModal from '../../components/ComplaintFormModal/ComplaintFormModal.jsx'
import ReviewOrderModal from '../../components/ReviewOrderModal/ReviewOrderModal.jsx'
import ComplainableOrderCard from './components/ComplainableOrderCard.jsx'
import FeedbackEmptyState from './components/FeedbackEmptyState.jsx'
import FeedbackTabs from './components/FeedbackTabs.jsx'
import MyComplaintCard from './components/MyComplaintCard.jsx'
import MyReviewCard from './components/MyReviewCard.jsx'
import ReviewableOrderCard from './components/ReviewableOrderCard.jsx'

const PAGE_SIZE = 10
const EMPTY_PAGE = { items: [], pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 } }

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

// Component phân trang đồng bộ cho các tab
function PaginationBar({ page, totalPages, totalItems, limit, onPageChange, unit = 'mục' }) {
  if (!totalItems || totalItems === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, totalItems)

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-4 mt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
        Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{from}</span> -{' '}
        <span className="font-bold text-slate-800 dark:text-slate-200">{to}</span> trên tổng số{' '}
        <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> {unit}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181A20] text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Trước</span>
          </button>

          {getPageNumbers().map((pageNum, idx) =>
            pageNum === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-slate-400 select-none">
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-8 h-8 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  pageNum === page
                    ? 'bg-primary text-white shadow-md shadow-orange-500/25'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181A20] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {pageNum}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181A20] text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <span>Sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// UC17 + UC18 - reviews and complaints of the customer after delivery
export default function Feedback() {
  const [activeTab, setActiveTab] = useState('pending')
  const [reviewable, setReviewable] = useState({ items: [], windowDays: 7 })
  const [reviews, setReviews] = useState(EMPTY_PAGE)
  const [complainable, setComplainable] = useState({ items: [], windowDays: 7 })
  const [complaints, setComplaints] = useState(EMPTY_PAGE)
  const [loading, setLoading] = useState({ reviews: true, complaints: true })
  const [refreshKeys, setRefreshKeys] = useState({ reviews: 0, complaints: 0 })

  // Phân trang cho từng tab
  const [pendingPage, setPendingPage] = useState(1)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [complaintsPage, setComplaintsPage] = useState(1)
  const [complainablePage, setComplainablePage] = useState(1)

  // Sub-tab cho mục Khiếu nại: 'sent' (Khiếu nại đã gửi) | 'eligible' (Đơn có thể khiếu nại)
  const [complaintSubTab, setComplaintSubTab] = useState('sent')

  const [reviewOrder, setReviewOrder] = useState(null)
  const [complaintOrder, setComplaintOrder] = useState(null)

  // 1. Tải danh sách đánh giá & đơn chờ đánh giá
  useEffect(() => {
    let ignore = false
    setLoading((prev) => ({ ...prev, reviews: true }))

    Promise.all([
      reviewApi.getReviewableOrders(),
      reviewApi.getMyReviews({ page: reviewsPage, limit: PAGE_SIZE }),
    ])
      .then(([reviewableResponse, reviewsResponse]) => {
        if (ignore) return
        setReviewable(reviewableResponse.data || { items: [], windowDays: 7 })
        setReviews(reviewsResponse.data || EMPTY_PAGE)
      })
      .catch((error) => {
        if (!ignore) toast.error(getErrorMessage(error, 'Không tải được danh sách đánh giá'))
      })
      .finally(() => {
        if (!ignore) setLoading((prev) => ({ ...prev, reviews: false }))
      })

    return () => {
      ignore = true
    }
  }, [reviewsPage, refreshKeys.reviews])

  // 2. Tải danh sách khiếu nại & đơn có thể khiếu nại
  useEffect(() => {
    let ignore = false
    setLoading((prev) => ({ ...prev, complaints: true }))

    Promise.all([
      complaintApi.getEligibleOrders(),
      complaintApi.getMyComplaints({ page: complaintsPage, limit: PAGE_SIZE }),
    ])
      .then(([eligibleResponse, complaintsResponse]) => {
        if (ignore) return
        setComplainable(eligibleResponse.data || { items: [], windowDays: 7 })
        setComplaints(complaintsResponse.data || EMPTY_PAGE)
      })
      .catch((error) => {
        if (!ignore) toast.error(getErrorMessage(error, 'Không tải được danh sách khiếu nại'))
      })
      .finally(() => {
        if (!ignore) setLoading((prev) => ({ ...prev, complaints: false }))
      })

    return () => {
      ignore = true
    }
  }, [complaintsPage, refreshKeys.complaints])

  const refresh = (key) => setRefreshKeys((prev) => ({ ...prev, [key]: prev[key] + 1 }))

  // Client pagination cho đơn chờ đánh giá
  const displayedReviewable = useMemo(() => {
    const start = (pendingPage - 1) * PAGE_SIZE
    return (reviewable.items || []).slice(start, start + PAGE_SIZE)
  }, [reviewable.items, pendingPage])

  // Client pagination cho đơn có thể khiếu nại
  const displayedComplainable = useMemo(() => {
    const start = (complainablePage - 1) * PAGE_SIZE
    return (complainable.items || []).slice(start, start + PAGE_SIZE)
  }, [complainable.items, complainablePage])

  const tabs = [
    { value: 'pending', label: 'Chờ đánh giá', count: reviewable.items?.length || 0, icon: Star },
    { value: 'reviews', label: 'Đánh giá của tôi', count: reviews.pagination?.totalItems || 0, icon: MessageSquareText },
    { value: 'complaints', label: 'Khiếu nại', count: complaints.pagination?.totalItems || 0, icon: MessageSquareWarning },
  ]
  const isLoading = activeTab === 'complaints' ? loading.complaints : loading.reviews

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Đánh giá & Khiếu nại
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Chia sẻ trải nghiệm về món ăn, shipper hoặc báo cho chúng tôi khi đơn hàng có vấn đề.
        </p>
      </div>

      <FeedbackTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* TAB 1: CHỜ ĐÁNH GIÁ */}
          {activeTab === 'pending' && (
            <section className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bạn có thể đánh giá trong {reviewable.windowDays} ngày kể từ khi nhận hàng.
              </p>
              {reviewable.items.length === 0 ? (
                <FeedbackEmptyState icon={Star} title="Không có đơn nào chờ đánh giá" />
              ) : (
                <>
                  <div className="space-y-3">
                    {displayedReviewable.map((order) => (
                      <ReviewableOrderCard key={order._id} order={order} onReview={setReviewOrder} />
                    ))}
                  </div>
                  <PaginationBar
                    page={pendingPage}
                    limit={PAGE_SIZE}
                    totalItems={reviewable.items.length}
                    totalPages={Math.ceil(reviewable.items.length / PAGE_SIZE)}
                    onPageChange={(p) => {
                      setPendingPage(p)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    unit="đơn chờ đánh giá"
                  />
                </>
              )}
            </section>
          )}

          {/* TAB 2: ĐÁNH GIÁ CỦA TÔI */}
          {activeTab === 'reviews' && (
            <section className="space-y-4">
              {reviews.items.length === 0 ? (
                <FeedbackEmptyState icon={MessageSquareText} title="Bạn chưa có đánh giá nào" />
              ) : (
                <>
                  <div className="space-y-3">
                    {reviews.items.map((review) => (
                      <MyReviewCard key={review._id} review={review} />
                    ))}
                  </div>
                  <PaginationBar
                    page={reviews.pagination.page}
                    limit={reviews.pagination.limit}
                    totalItems={reviews.pagination.totalItems}
                    totalPages={reviews.pagination.totalPages}
                    onPageChange={(p) => {
                      setReviewsPage(p)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    unit="đánh giá"
                  />
                </>
              )}
            </section>
          )}

          {/* TAB 3: KHIẾU NẠI */}
          {activeTab === 'complaints' && (
            <div className="space-y-6">
              {/* Sub-tabs điều hướng: Khiếu nại đã gửi vs Đơn có thể khiếu nại */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setComplaintSubTab('sent')
                      setComplaintsPage(1)
                    }}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      complaintSubTab === 'sent'
                        ? 'bg-white dark:bg-[#181A20] text-primary shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <MessageSquareWarning className="w-4 h-4" />
                    <span>Khiếu nại đã gửi ({complaints.pagination.totalItems})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setComplaintSubTab('eligible')
                      setComplainablePage(1)
                    }}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      complaintSubTab === 'eligible'
                        ? 'bg-white dark:bg-[#181A20] text-primary shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <PackageX className="w-4 h-4" />
                    <span>Đơn có thể khiếu nại ({complainable.items.length})</span>
                  </button>
                </div>

                {complaintSubTab === 'sent' && complainable.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setComplaintSubTab('eligible')
                      setComplainablePage(1)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gửi khiếu nại mới</span>
                  </button>
                )}
              </div>

              {/* Sub-view 1: Khiếu nại đã gửi (Mặc định - hiển thị đúng số khiếu nại trên badge) */}
              {complaintSubTab === 'sent' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Danh sách khiếu nại của bạn
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Theo dõi phản hồi và tiến trình giải quyết bồi thường / hoàn tiền từ quản trị viên.
                      </p>
                    </div>
                  </div>

                  {complaints.items.length === 0 ? (
                    <FeedbackEmptyState icon={MessageSquareWarning} title="Bạn chưa gửi khiếu nại nào" />
                  ) : (
                    <>
                      <div className="space-y-3">
                        {complaints.items.map((complaint) => (
                          <MyComplaintCard key={complaint._id} complaint={complaint} />
                        ))}
                      </div>
                      <PaginationBar
                        page={complaints.pagination.page}
                        limit={complaints.pagination.limit}
                        totalItems={complaints.pagination.totalItems}
                        totalPages={complaints.pagination.totalPages}
                        onPageChange={(p) => {
                          setComplaintsPage(p)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        unit="khiếu nại"
                      />
                    </>
                  )}
                </section>
              )}

              {/* Sub-view 2: Đơn có thể khiếu nại */}
              {complaintSubTab === 'eligible' && (
                <section className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Đơn hàng có thể khiếu nại
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Đơn đã giao hoặc đã hủy trong {complainable.windowDays} ngày gần đây, mỗi đơn khiếu nại một lần.
                    </p>
                  </div>

                  {complainable.items.length === 0 ? (
                    <FeedbackEmptyState icon={PackageX} title="Không có đơn hàng nào có thể khiếu nại" />
                  ) : (
                    <>
                      <div className="space-y-3">
                        {displayedComplainable.map((order) => (
                          <ComplainableOrderCard key={order._id} order={order} onComplain={setComplaintOrder} />
                        ))}
                      </div>
                      <PaginationBar
                        page={complainablePage}
                        limit={PAGE_SIZE}
                        totalItems={complainable.items.length}
                        totalPages={Math.ceil(complainable.items.length / PAGE_SIZE)}
                        onPageChange={(p) => {
                          setComplainablePage(p)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        unit="đơn có thể khiếu nại"
                      />
                    </>
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {reviewOrder && (
        <ReviewOrderModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmitted={() => {
            setReviewOrder(null)
            setPendingPage(1)
            setReviewsPage(1)
            refresh('reviews')
          }}
        />
      )}
      {complaintOrder && (
        <ComplaintFormModal
          order={complaintOrder}
          onClose={() => setComplaintOrder(null)}
          onSubmitted={() => {
            setComplaintOrder(null)
            setComplaintSubTab('sent')
            setComplaintsPage(1)
            refresh('complaints')
          }}
        />
      )}
    </div>
  )
}
