import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Scale } from 'lucide-react'
import deliveryIssueApi from '../../api/deliveryIssueApi.js'
import useAuth from '../../hooks/useAuth.js'
import useNow from '../../hooks/useNow.js'
import { connectSocket } from '../../services/socket.js'
import { getHearingState } from '../../utils/hearingState.js'
import HearingCaseDetail from './components/HearingCaseDetail.jsx'
import HearingCaseList from './components/HearingCaseList.jsx'

const LIST_LIMIT = 50
const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

/**
 * Delivery issue hearings (UC45) of the shipper, customer or restaurant owner: an admin invites the three parties
 * of the order to talk a reported issue over before deciding on a penalty. `?id=` selects a hearing
 * (link of the invitation notification).
 *
 * Routes: /delivery-issues (customer), /restaurant/delivery-issues (owner), /shipper/issues (shipper).
 * @param {boolean} embedded - inside a portal that already pads its content (shipper dashboard)
 */
export default function IssueHearing({ embedded = false }) {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [list, setList] = useState({ items: [], loading: true, error: '' })
  const [detail, setDetail] = useState({ id: null, data: null, error: '' })
  const [listKey, setListKey] = useState(0)
  const [detailKey, setDetailKey] = useState(0)
  const now = useNow(30 * 1000)

  const selectedId = searchParams.get('id') || list.items[0]?._id || null

  useEffect(() => {
    let ignore = false
    deliveryIssueApi
      .getMyHearings({ page: 1, limit: LIST_LIMIT })
      .then((response) => {
        if (!ignore) setList({ items: response.data.items, loading: false, error: '' })
      })
      .catch((error) => {
        if (!ignore) setList({ items: [], loading: false, error: getErrorMessage(error, 'Không tải được danh sách đối chất') })
      })
    return () => {
      ignore = true
    }
  }, [listKey])

  useEffect(() => {
    if (!selectedId) return undefined
    let ignore = false
    deliveryIssueApi
      .getHearing(selectedId)
      .then((response) => {
        if (!ignore) setDetail({ id: selectedId, data: response.data, error: '' })
      })
      .catch((error) => {
        if (!ignore) setDetail({ id: selectedId, data: null, error: getErrorMessage(error, 'Không tải được phiên đối chất') })
      })
    return () => {
      ignore = true
    }
  }, [selectedId, detailKey])

  // A new invitation, or a hearing opened / closed / handled: refresh the list (the chat reloads the detail)
  useEffect(() => {
    if (!token) return undefined
    const socket = connectSocket(token)
    if (!socket) return undefined
    const handleUpdated = () => setListKey((key) => key + 1)
    socket.on('issue_hearing_updated', handleUpdated)
    return () => socket.off('issue_hearing_updated', handleUpdated)
  }, [token])

  const reloadDetail = useCallback(() => {
    setDetailKey((key) => key + 1)
    setListKey((key) => key + 1)
  }, [])

  const selectHearing = (issueId) => setSearchParams({ id: issueId })
  const shownDetail = detail.id === selectedId ? detail.data : null

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:py-8'}>
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
          Đối chất sự cố giao hàng
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Khi shipper báo sự cố, quản trị viên có thể mời shipper, khách hàng và nhà hàng của đơn cùng trao đổi (tối đa 24 giờ)
          trước khi kết luận và xử phạt.
        </p>
      </header>

      {list.loading ? (
        <p className="text-sm text-slate-500">Đang tải...</p>
      ) : list.error ? (
        <p role="alert" className="text-sm text-red-600">
          {list.error}
        </p>
      ) : list.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
          Bạn chưa được mời tham gia phiên đối chất nào.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
          <HearingCaseList items={list.items} selectedId={selectedId} onSelect={selectHearing} />
          {detail.id === selectedId && detail.error ? (
            <p role="alert" className="text-sm text-red-600">
              {detail.error}
            </p>
          ) : shownDetail ? (
            <HearingCaseDetail
              key={shownDetail._id}
              hearing={shownDetail}
              hearingState={getHearingState(shownDetail, now)}
              now={now}
              onReload={reloadDetail}
            />
          ) : (
            <p className="text-sm text-slate-500">Đang tải phiên đối chất...</p>
          )}
        </div>
      )}
    </div>
  )
}
