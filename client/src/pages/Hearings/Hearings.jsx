import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Scale } from 'lucide-react'
import hearingApi, { HEARING_SEGMENTS } from '../../api/hearingApi.js'
import useAuth from '../../hooks/useAuth.js'
import useNow from '../../hooks/useNow.js'
import { connectSocket } from '../../services/socket.js'
import { HEARING_MAX_HOURS } from '../../utils/deliveryIssueLabels.js'
import { getHearingState } from '../../utils/hearingState.js'
import HearingCaseDetail from './components/HearingCaseDetail.jsx'
import HearingCaseList from './components/HearingCaseList.jsx'

const LIST_LIMIT = 50
const SEGMENT_CASE_TYPES = Object.fromEntries(Object.entries(HEARING_SEGMENTS).map(([caseType, segment]) => [segment, caseType]))
const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

/**
 * Hearings of the shipper, customer or restaurant owner: before penalizing anyone over a delivery issue (UC45) or
 * a complaint (UC42), an admin invites the parties of the order to talk it over. `?type=<delivery-issues|complaints>&id=`
 * selects a hearing (link of the invitation notification).
 *
 * Routes: /hearings (customer), /restaurant/hearings (owner), /shipper/hearings (shipper).
 * @param {boolean} embedded - inside a portal that already pads its content (shipper dashboard)
 */
export default function Hearings({ embedded = false }) {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [list, setList] = useState({ items: [], loading: true, error: '' })
  const [detail, setDetail] = useState({ key: null, data: null, error: '' })
  const [listKey, setListKey] = useState(0)
  const [detailKey, setDetailKey] = useState(0)
  const now = useNow(30 * 1000)

  const requested = searchParams.get('id')
    ? { caseType: SEGMENT_CASE_TYPES[searchParams.get('type')] || 'delivery_issue', id: searchParams.get('id') }
    : null
  const selected = requested || (list.items[0] && { caseType: list.items[0].caseType, id: list.items[0]._id })
  const selectedKey = selected ? `${selected.caseType}:${selected.id}` : null

  useEffect(() => {
    let ignore = false
    hearingApi
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
    if (!selectedKey) return undefined
    const [caseType, id] = selectedKey.split(':')
    let ignore = false
    hearingApi
      .getHearing(caseType, id)
      .then((response) => {
        if (!ignore) setDetail({ key: selectedKey, data: response.data, error: '' })
      })
      .catch((error) => {
        if (!ignore) setDetail({ key: selectedKey, data: null, error: getErrorMessage(error, 'Không tải được phiên đối chất') })
      })
    return () => {
      ignore = true
    }
  }, [selectedKey, detailKey])

  // A new invitation, or a hearing opened / closed / handled: refresh the list (the chat reloads the detail)
  useEffect(() => {
    if (!token) return undefined
    const socket = connectSocket(token)
    if (!socket) return undefined
    const handleUpdated = () => setListKey((key) => key + 1)
    socket.on('hearing_updated', handleUpdated)
    return () => socket.off('hearing_updated', handleUpdated)
  }, [token])

  const reloadDetail = useCallback(() => {
    setDetailKey((key) => key + 1)
    setListKey((key) => key + 1)
  }, [])

  const selectHearing = (item) => setSearchParams({ type: HEARING_SEGMENTS[item.caseType], id: item._id })
  const shownDetail = detail.key === selectedKey ? detail.data : null

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:py-8'}>
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
          Đối chất sự cố & khiếu nại
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Khi có sự cố giao hàng hoặc khiếu nại về đơn, quản trị viên có thể mời các bên của đơn cùng trao đổi (tối đa {HEARING_MAX_HOURS} giờ)
          trước khi kết luận và xử phạt.
        </p>
      </header>

      {list.loading ? (
        <p className="text-sm text-slate-500">Đang tải...</p>
      ) : list.error ? (
        <p role="alert" className="text-sm text-red-600">
          {list.error}
        </p>
      ) : list.items.length === 0 && !requested ? (
        <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
          Bạn chưa được mời tham gia phiên đối chất nào.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
          <HearingCaseList items={list.items} selectedId={selected?.id || null} onSelect={selectHearing} />
          {detail.key === selectedKey && detail.error ? (
            <p role="alert" className="text-sm text-red-600">
              {detail.error}
            </p>
          ) : shownDetail ? (
            <HearingCaseDetail
              key={selectedKey}
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
