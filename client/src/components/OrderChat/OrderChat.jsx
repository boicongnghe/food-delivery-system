import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import chatApi from '../../api/chatApi.js'
import useAuth from '../../hooks/useAuth.js'
import { connectSocket } from '../../services/socket.js'

const MESSAGE_LIMIT = 1000
const formatMessageTime = value => new Date(value).toLocaleString('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export default function OrderChat({ orderId, status, otherPartyLabel }) {
  const { token, user } = useAuth()
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const canSend = ['preparing', 'ready_for_pickup', 'delivering'].includes(status)
  const currentUserId = user?._id || user?.id

  const loadMessages = useCallback(async () => {
    try {
      const result = await chatApi.getOrderMessages(orderId)
      setMessages(result.data || [])
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải tin nhắn.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    let active = true
    chatApi.getOrderMessages(orderId)
      .then(result => {
        if (active) {
          setMessages(result.data || [])
          setError('')
        }
      })
      .catch(requestError => {
        if (active) setError(requestError.response?.data?.message || 'Không thể tải tin nhắn.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [orderId])

  useEffect(() => {
    if (!token) return undefined

    const socket = connectSocket(token)
    if (!socket) return undefined
    const handleOrderMessage = incoming => {
      if (incoming?.order !== orderId && incoming?.order?._id !== orderId) return
      setMessages(current => current.some(item => item._id === incoming._id) ? current : [...current, incoming])
    }
    socket.on('order_chat_message', handleOrderMessage)
    socket.on('connect', loadMessages)

    return () => {
      socket.off('order_chat_message', handleOrderMessage)
      socket.off('connect', loadMessages)
    }
  }, [loadMessages, orderId, token])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submitMessage = async event => {
    event.preventDefault()
    const content = message.trim()
    if (!content || sending || !canSend) return

    setSending(true)
    setError('')
    try {
      const result = await chatApi.sendOrderMessage(orderId, content)
      setMessages(current => current.some(item => item._id === result.data._id)
        ? current
        : [...current, result.data])
      setMessage('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không gửi được tin nhắn.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Trao đổi theo đơn hàng">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle size={18} className="text-brand" aria-hidden="true" />
        <div>
          <h3 className="font-semibold text-slate-900">Trao đổi với {otherPartyLabel}</h3>
          <p className="text-xs text-slate-500">Tin nhắn chỉ hiển thị với khách và shipper của đơn này.</p>
        </div>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3" aria-live="polite">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải tin nhắn…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có tin nhắn. Hãy bắt đầu trao đổi.</p>
        ) : messages.map(item => {
          const senderId = item.sender?._id || item.sender
          const isOwnMessage = String(senderId) === String(currentUserId)
          return (
            <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`} key={item._id}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                isOwnMessage ? 'bg-brand text-white' : 'border border-slate-200 bg-white text-slate-800'
              }`}>
                <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
                <time className={`mt-1 block text-right text-[10px] ${
                  isOwnMessage ? 'text-white/75' : 'text-slate-400'
                }`} dateTime={item.createdAt}>
                  {formatMessageTime(item.createdAt)}
                </time>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-red-600" role="alert">
          <span>{error}</span>
          <button type="button" className="shrink-0 font-semibold underline" onClick={loadMessages}>Thử lại</button>
        </div>
      )}

      {canSend ? (
        <form className="mt-3 flex gap-2" onSubmit={submitMessage}>
          <label className="sr-only" htmlFor={`order-chat-${orderId}`}>Tin nhắn</label>
          <input
            id={`order-chat-${orderId}`}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            value={message}
            maxLength={MESSAGE_LIMIT}
            onChange={event => setMessage(event.target.value)}
            placeholder="Nhập tin nhắn…"
            disabled={sending}
          />
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            type="submit"
            disabled={sending || !message.trim()}
          >
            <Send size={14} aria-hidden="true" />
            Gửi
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Đơn đã kết thúc; lịch sử trao đổi chỉ xem được.</p>
      )}
    </section>
  )
}
