import { useState, useRef, useEffect } from 'react'
import {
  MessageSquareText,
  X,
  Send,
  Sparkles,
  RotateCcw,
  Bot,
  User,
  ShoppingBag,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import chatApi from '../../api/chatApi.js'
import DishCardInChat from './DishCardInChat.jsx'
import { useCart } from '../../context/CartContext.jsx'
import useAuth from '../../hooks/useAuth.js'

const STORAGE_KEY = 'foodbot_chat_history'

const INITIAL_MESSAGE = {
  id: 'welcome',
  sender: 'bot',
  text: 'Chào bạn! Mình là **FoodBot** - Trợ lý ẩm thực AI của FoodDelivery 🍽️✨.\n\nHôm nay bạn muốn thưởng thức món gì? Bạn có thể hỏi mình gợi ý món ngon, tìm quán hot, hoặc món ăn theo khẩu vị nhé!',
  dishes: [],
  quickReplies: [
    '🔥 Món bán chạy nhất',
    '🍚 Cơm trưa dưới 50k',
    '🥤 Trà sữa trân châu',
    '🍔 Burger & Gà rán',
  ],
  timestamp: new Date().toISOString(),
}

export default function ChatBox() {
  const { user } = useAuth()
  const { itemCount = 0 } = useCart() || {}

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // If saved contains outdated branding, reset to fresh initial
        if (
          Array.isArray(parsed) &&
          parsed.some((p) => p.text?.includes('CraveDash') || p.text?.includes('đăng nhập'))
        ) {
          sessionStorage.removeItem(STORAGE_KEY)
          return [INITIAL_MESSAGE]
        }
        return parsed
      }
      return [INITIAL_MESSAGE]
    } catch {
      return [INITIAL_MESSAGE]
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Save conversation to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch (err) {
      console.warn('Could not save chat history to sessionStorage', err)
    }
  }, [messages])

  // Scroll to bottom whenever messages change or loading state toggles
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false)
      inputRef.current?.focus()
      setHasUnread(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true)
    }
  }, [messages, loading])

  // Clear chat conversation
  const handleClearHistory = () => {
    setMessages([
      {
        ...INITIAL_MESSAGE,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    ])
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  // Send message
  const handleSendMessage = async (textToSend) => {
    const content = (textToSend || input).trim()
    if (!content || loading) return

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: content,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Build conversation history for context (exclude any temporary error messages)
      const historyPayload = messages
        .filter((m) => !m.id?.startsWith('bot-err'))
        .slice(-6)
        .map((m) => ({
          sender: m.sender,
          text: m.text,
        }))

      const response = await chatApi.sendMessage({
        message: content,
        history: historyPayload,
      })

      const botData = response?.data || {}
      const rawQuickReplies = botData.quickReplies || [
        '🔥 Món bán chạy',
        '🍚 Cơm tấm sườn',
        '🥤 Trà sữa',
        '🍔 Burger bò',
      ]
      const cleanQuickReplies = rawQuickReplies.filter(
        (r) =>
          !r.toLowerCase().includes('đăng nhập') &&
          !r.toLowerCase().includes('login') &&
          !r.toLowerCase().includes('tài khoản')
      )

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botData.reply || 'Cảm ơn bạn! Hãy cho mình biết thêm chi tiết món bạn thích nhé!',
        dishes: botData.dishes || [],
        quickReplies: cleanQuickReplies.length > 0 ? cleanQuickReplies : [
          '🔥 Món bán chạy',
          '🍚 Cơm tấm sườn',
          '🥤 Trà sữa',
          '🍔 Burger bò',
        ],
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, botMsg])
      if (!isOpen) {
        setHasUnread(true)
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errorMsg = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: 'Xin lỗi bạn, mạng kết nối của FoodBot đang hơi chậm một chút. Bạn thử gửi lại hoặc chọn gợi ý bên dưới nhé!',
        dishes: [],
        quickReplies: ['🔥 Món bán chạy nhất', '🍚 Cơm trưa dưới 50k', '🥤 Trà sữa'],
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  // Handle Form submit
  const handleSubmit = (e) => {
    e.preventDefault()
    handleSendMessage()
  }

  // Render markdown-like text (bold, italic, breaks)
  const renderFormattedText = (text) => {
    if (!text) return null
    // Split by newlines
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      // Parse bold (**text**) and italic (*text*)
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g)
      return (
        <span key={idx} className="block leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              return (
                <strong key={pIdx} className="font-extrabold text-slate-900 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              )
            }
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return (
                <em key={pIdx} className="italic text-slate-600 dark:text-slate-300">
                  {part.slice(1, -1)}
                </em>
              )
            }
            return part
          })}
        </span>
      )
    })
  }

  return (
    <>
      {/* ====================================================================
          1. FLOATING LAUNCHER BUTTON
          ==================================================================== */}
      <div
        className={`fixed right-4 sm:right-6 z-40 transition-all duration-300 ${
          itemCount > 0 ? 'bottom-20 lg:bottom-6' : 'bottom-6'
        }`}
      >
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 sm:px-4.5 sm:py-3.5 rounded-full bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FF4B2B] text-white shadow-xl shadow-orange-500/35 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Mở Trợ lý ẩm thực FoodBot"
          >
            {/* Glow Aura */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-400 to-red-500 opacity-30 blur-sm group-hover:opacity-75 animate-pulse" />

            <div className="relative flex items-center justify-center">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
              <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1" />
            </div>

            <div className="relative text-left hidden sm:block">
              <p className="text-[11px] font-bold uppercase tracking-wider text-orange-100 leading-none">
                Trợ lý AI
              </p>
              <p className="text-xs font-black tracking-tight text-white mt-0.5">
                FoodBot
              </p>
            </div>

            {/* Unread badge dot */}
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white" />
              </span>
            )}
          </button>
        )}
      </div>

      {/* ====================================================================
          2. CHAT DRAWER / WINDOW
          ==================================================================== */}
      {isOpen && (
        <div
          className={`fixed right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[410px] h-[550px] max-h-[82vh] bg-white dark:bg-[#16181F] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-200 ${
            itemCount > 0 ? 'bottom-20 lg:bottom-6' : 'bottom-6'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#C83214] text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                <Bot className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#FF416C]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black tracking-tight leading-none">
                    FoodBot Assistant
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[9px] font-extrabold text-amber-200 uppercase tracking-wider">
                    Gemini AI
                  </span>
                </div>
                <p className="text-[11px] text-white/85 font-medium mt-0.5">
                  Trực tuyến • Tư vấn món ngon 24/7
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Làm mới cuộc trò chuyện"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Thu nhỏ chat"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/70 dark:bg-[#121318] scrollbar-thin">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user'

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
                >
                  <div
                    className={`flex items-end gap-2 max-w-[86%] ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#FF4B2B] to-[#FF416C] text-white flex items-center justify-center shrink-0 mb-0.5 shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white rounded-br-xs font-medium'
                          : 'bg-white dark:bg-[#1E2028] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {renderFormattedText(msg.text)}
                    </div>
                  </div>

                  {/* Suggested Dishes Grid (if any) */}
                  {!isUser && msg.dishes && msg.dishes.length > 0 && (
                    <div className="w-full pl-9 pr-1 space-y-2 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-primary" /> Món ăn gợi ý cho bạn:
                      </p>
                      <div className="space-y-2">
                        {msg.dishes.map((dish) => (
                          <DishCardInChat key={dish._id || dish.id} dish={dish} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Replies (only on the last bot message) */}
                  {!isUser &&
                    msg.quickReplies &&
                    msg.quickReplies.length > 0 &&
                    msg.id === messages[messages.length - 1]?.id &&
                    !loading && (
                      <div className="w-full pl-9 flex flex-wrap gap-1.5 pt-1">
                        {msg.quickReplies.map((replyText, rIdx) => (
                          <button
                            key={rIdx}
                            type="button"
                            onClick={() => handleSendMessage(replyText)}
                            className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#1E2028] hover:bg-orange-50 dark:hover:bg-primary/10 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold transition-all shadow-2xs hover:scale-102 active:scale-98 cursor-pointer"
                          >
                            {replyText}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#FF4B2B] to-[#FF416C] text-white flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-bl-xs bg-white dark:bg-[#1E2028] border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-150" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-300" />
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">
                    FoodBot đang tìm món ngon...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white dark:bg-[#16181F] border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi FoodBot: 'Trưa nay ăn gì?', 'Món dưới 50k'..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1F222B] text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40 border border-transparent dark:border-slate-800 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`p-2.5 rounded-2xl text-white transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${
                input.trim() && !loading
                  ? 'bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] hover:opacity-95 hover:scale-105 active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
              title="Gửi tin nhắn"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  )
}

