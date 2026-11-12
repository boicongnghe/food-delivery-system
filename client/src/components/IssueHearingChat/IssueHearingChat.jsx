import { useCallback, useEffect, useRef, useState } from 'react'
import { Scale, Send } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { connectSocket } from '../../services/socket.js'
import { HEARING_PARTY_LABELS } from '../../utils/deliveryIssueLabels.js'

const MESSAGE_LIMIT = 1000

// One color per side, so each party is easy to follow in the conversation
const PARTY_TONES = {
  shipper: 'text-sky-600 dark:text-sky-300',
  customer: 'text-emerald-600 dark:text-emerald-300',
  restaurant: 'text-amber-600 dark:text-amber-300',
  admin: 'text-primary',
}

const formatMessageTime = (value) =>
  new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

/**
 * Free chat of a delivery issue hearing: shipper, customer, restaurant owner and admins.
 * New messages and state changes arrive over the socket (issue_hearing_message / issue_hearing_updated).
 *
 * @param {string} issueId
 * @param {boolean} canSend - the hearing is open
 * @param {(issueId: string) => Promise<{ data: object[] }>} fetchMessages
 * @param {(issueId: string, message: string) => Promise<{ data: object }>} sendMessage
 * @param {() => void} onHearingUpdated - the hearing was opened / closed or the report handled: reload it
 * @param {string} closedHint - shown instead of the input when the hearing is not open
 */
export default function IssueHearingChat({ issueId, canSend, fetchMessages, sendMessage, onHearingUpdated, closedHint }) {
  const { token, user } = useAuth()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const currentUserId = String(user?._id || user?.id || '')

  const loadMessages = useCallback(async () => {
    try {
      const result = await fetchMessages(issueId)
      setMessages(result.data || [])
      setError('')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không tải được tin nhắn đối chất.'))
    } finally {
      setLoading(false)
    }
  }, [fetchMessages, issueId])

  useEffect(() => {
    let active = true
    fetchMessages(issueId)
      .then((result) => {
        if (active) setMessages(result.data || [])
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError, 'Không tải được tin nhắn đối chất.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetchMessages, issueId])

  useEffect(() => {
    if (!token) return undefined
    const socket = connectSocket(token)
    if (!socket) return undefined

    const handleMessage = (incoming) => {
      if (String(incoming?.issue) !== String(issueId)) return
      setMessages((current) => (current.some((item) => item._id === incoming._id) ? current : [...current, incoming]))
    }
    const handleUpdated = (payload) => {
      if (String(payload?.issueId) === String(issueId)) onHearingUpdated?.()
    }
    socket.on('issue_hearing_message', handleMessage)
    socket.on('issue_hearing_updated', handleUpdated)
    socket.on('connect', loadMessages)
    return () => {
      socket.off('issue_hearing_message', handleMessage)
      socket.off('issue_hearing_updated', handleUpdated)
      socket.off('connect', loadMessages)
    }
  }, [issueId, loadMessages, onHearingUpdated, token])

  // Keep the newest message in view, inside the list only (no page jump in a drawer)
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages])

  const submit = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending || !canSend) return

    setSending(true)
    setError('')
    try {
      const result = await sendMessage(issueId, content)
      setMessages((current) => (current.some((item) => item._id === result.data._id) ? current : [...current, result.data]))
      setDraft('')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không gửi được tin nhắn.'))
      // The hearing may just have ended
      if (requestError.response?.status === 409) onHearingUpdated?.()
    } finally {
      setSending(false)
    }
  }

  return (
    <section aria-label="Trao đổi đối chất" className="space-y-3">
      <div
        ref={listRef}
        aria-live="polite"
        className="max-h-80 min-h-32 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-3"
      >
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải tin nhắn...</p>
        ) : messages.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Scale className="h-4 w-4" aria-hidden="true" />
            Chưa có ý kiến nào. Các bên trình bày và trả lời nhau tại đây.
          </p>
        ) : (
          messages.map((item) => {
            const isOwn = String(item.sender) === currentUserId
            return (
              <div key={item._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    isOwn
                      ? 'bg-primary text-white'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-crave-surface text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {!isOwn && (
                    <p className={`text-[11px] font-bold ${PARTY_TONES[item.party]}`}>
                      {HEARING_PARTY_LABELS[item.party]}
                      {item.senderName && ` · ${item.senderName}`}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
                  <time
                    dateTime={item.createdAt}
                    className={`mt-1 block text-right text-[10px] ${isOwn ? 'text-white/75' : 'text-slate-400'}`}
                  >
                    {formatMessageTime(item.createdAt)}
                  </time>
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-2 text-sm text-red-600 dark:text-red-300">
          <span>{error}</span>
          <button type="button" onClick={loadMessages} className="shrink-0 font-semibold underline">
            Tải lại
          </button>
        </div>
      )}

      {canSend ? (
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor={`hearing-message-${issueId}`} className="sr-only">
            Ý kiến của bạn
          </label>
          <textarea
            id={`hearing-message-${issueId}`}
            rows={2}
            value={draft}
            maxLength={MESSAGE_LIMIT}
            disabled={sending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) submit(event)
            }}
            placeholder="Nhập ý kiến của bạn (Enter để gửi, Shift + Enter xuống dòng)"
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-crave-dark px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex items-center gap-1.5 self-end rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Gửi
          </button>
        </form>
      ) : (
        closedHint && <p className="text-xs text-slate-500">{closedHint}</p>
      )}
    </section>
  )
}
