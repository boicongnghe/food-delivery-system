import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MessageSquareText, MessageSquareWarning, PackageX, Star } from 'lucide-react'
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

const PAGE_SIZE = 5
const EMPTY_PAGE = { items: [], pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 } }

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

// UC17 + UC18 - reviews and complaints of the customer after delivery
export default function Feedback() {
  const [activeTab, setActiveTab] = useState('pending')
  const [reviewable, setReviewable] = useState({ items: [], windowDays: 7 })
  const [reviews, setReviews] = useState(EMPTY_PAGE)
  const [complainable, setComplainable] = useState({ items: [], windowDays: 7 })
  const [complaints, setComplaints] = useState(EMPTY_PAGE)
  const [loading, setLoading] = useState({ reviews: true, complaints: true })
  // Increase to reload one side after a review / complaint is sent
  const [refreshKeys, setRefreshKeys] = useState({ reviews: 0, complaints: 0 })
  const [loadingMore, setLoadingMore] = useState(false)
  const [reviewOrder, setReviewOrder] = useState(null)
  const [complaintOrder, setComplaintOrder] = useState(null)

  useEffect(() => {
    let ignore = false

    Promise.all([reviewApi.getReviewableOrders(), reviewApi.getMyReviews({ page: 1, limit: PAGE_SIZE })])
      .then(([reviewableResponse, reviewsResponse]) => {
        if (ignore) return
        setReviewable(reviewableResponse.data)
        setReviews(reviewsResponse.data)
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
  }, [refreshKeys.reviews])

  useEffect(() => {
    let ignore = false

    Promise.all([complaintApi.getEligibleOrders(), complaintApi.getMyComplaints({ page: 1, limit: PAGE_SIZE })])
      .then(([eligibleResponse, complaintsResponse]) => {
        if (ignore) return
        setComplainable(eligibleResponse.data)
        setComplaints(complaintsResponse.data)
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
  }, [refreshKeys.complaints])

  const refresh = (key) => setRefreshKeys((prev) => ({ ...prev, [key]: prev[key] + 1 }))

  // "Xem thêm": append the next page of my reviews / complaints
  const loadMore = async (list, request, setList) => {
    setLoadingMore(true)
    try {
      const response = await request({ page: list.pagination.page + 1, limit: PAGE_SIZE })
      setList((prev) => ({ items: [...prev.items, ...response.data.items], pagination: response.data.pagination }))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không tải thêm được dữ liệu'))
    } finally {
      setLoadingMore(false)
    }
  }

  const renderLoadMore = (list, request, setList) =>
    list.pagination.page < list.pagination.totalPages && (
      <button
        type="button"
        onClick={() => loadMore(list, request, setList)}
        disabled={loadingMore}
        className="mx-auto block rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:border-primary/40 disabled:opacity-50"
      >
        {loadingMore ? 'Đang tải...' : 'Xem thêm'}
      </button>
    )

  const tabs = [
    { value: 'pending', label: 'Chờ đánh giá', count: reviewable.items.length, icon: Star },
    { value: 'reviews', label: 'Đánh giá của tôi', count: reviews.pagination.totalItems, icon: MessageSquareText },
    { value: 'complaints', label: 'Khiếu nại', count: complaints.pagination.totalItems, icon: MessageSquareWarning },
  ]
  const isLoading = activeTab === 'complaints' ? loading.complaints : loading.reviews

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Đánh giá & Khiếu nại</h1>
        <p className="mt-1 text-sm text-slate-500">
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
          {activeTab === 'pending' && (
            <section className="space-y-3">
              <p className="text-xs text-slate-500">
                Bạn có thể đánh giá trong {reviewable.windowDays} ngày kể từ khi nhận hàng.
              </p>
              {reviewable.items.length === 0 ? (
                <FeedbackEmptyState icon={Star} title="Không có đơn nào chờ đánh giá" />
              ) : (
                reviewable.items.map((order) => (
                  <ReviewableOrderCard key={order._id} order={order} onReview={setReviewOrder} />
                ))
              )}
            </section>
          )}

          {activeTab === 'reviews' && (
            <section className="space-y-3">
              {reviews.items.length === 0 ? (
                <FeedbackEmptyState icon={MessageSquareText} title="Bạn chưa có đánh giá nào" />
              ) : (
                reviews.items.map((review) => <MyReviewCard key={review._id} review={review} />)
              )}
              {renderLoadMore(reviews, reviewApi.getMyReviews, setReviews)}
            </section>
          )}

          {activeTab === 'complaints' && (
            <div className="space-y-8">
              <section className="space-y-3">
                <h2 className="text-base font-bold text-slate-900">Đơn hàng có thể khiếu nại</h2>
                <p className="text-xs text-slate-500">
                  Đơn đã giao hoặc đã hủy trong {complainable.windowDays} ngày gần đây, mỗi đơn khiếu nại một lần.
                </p>
                {complainable.items.length === 0 ? (
                  <FeedbackEmptyState icon={PackageX} title="Không có đơn hàng nào có thể khiếu nại" />
                ) : (
                  complainable.items.map((order) => (
                    <ComplainableOrderCard key={order._id} order={order} onComplain={setComplaintOrder} />
                  ))
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-bold text-slate-900">Khiếu nại đã gửi</h2>
                {complaints.items.length === 0 ? (
                  <FeedbackEmptyState icon={MessageSquareWarning} title="Bạn chưa gửi khiếu nại nào" />
                ) : (
                  complaints.items.map((complaint) => <MyComplaintCard key={complaint._id} complaint={complaint} />)
                )}
                {renderLoadMore(complaints, complaintApi.getMyComplaints, setComplaints)}
              </section>
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
            refresh('complaints')
          }}
        />
      )}
    </div>
  )
}
