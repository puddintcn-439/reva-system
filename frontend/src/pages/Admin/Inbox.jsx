import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInboxThreads, createInboxThread, closeInboxThread, reopenInboxThread,
  deleteInboxThread, getInboxMessages, postInboxMessage, deleteInboxMessage,
} from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  MessageSquare, Plus, Send, Trash2, Lock, Unlock, X, ChevronLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_LABEL = {
  superadmin: 'Super Admin', admin: 'Admin', manager: 'Quản lý',
  staff: 'Nhân viên', cashier: 'Thu ngân', accountant: 'Kế toán',
  inventory: 'Kho', viewer: 'Chỉ xem',
}
const ROLE_CLS = {
  superadmin: 'bg-red-100 text-red-700', admin: 'bg-amber-100 text-amber-800',
  manager: 'bg-indigo-100 text-indigo-700', staff: 'bg-blue-100 text-blue-700',
  cashier: 'bg-gray-100 text-gray-600', accountant: 'bg-green-100 text-green-700',
  inventory: 'bg-orange-100 text-orange-700', viewer: 'bg-gray-100 text-gray-500',
}

function RoleBadge({ role }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_CLS[role] || 'bg-gray-100 text-gray-500'}`}>
      {ROLE_LABEL[role] || role}
    </span>
  )
}

// ── Time format ───────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  if (diffMs < 60_000) return 'Vừa xong'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} phút trước`
  if (diffMs < 86_400_000) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtFull(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Thread list item ──────────────────────────────────────────────────────────
function ThreadItem({ thread, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-hun-cream/50 transition-colors ${
        active ? 'bg-hun-cream border-l-2 border-l-hun-brown' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm font-medium leading-snug line-clamp-2 ${active ? 'text-hun-brown' : 'text-gray-800'}`}>
          {thread.title}
        </span>
        {thread.status === 'closed' && (
          <span className="shrink-0 text-[10px] bg-gray-200 text-gray-500 rounded px-1.5 py-0.5 font-medium">Đã đóng</span>
        )}
      </div>
      {thread.last_message_body && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
          <span className="font-medium">{thread.last_message_sender || 'Ai đó'}:</span>{' '}
          {thread.last_message_body}
        </p>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-gray-400">{thread.created_by_name || thread.created_by_username || 'Ẩn danh'}</span>
        <span className="text-[11px] text-gray-400">{fmtTime(thread.last_message_at || thread.created_at)}</span>
      </div>
    </button>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, canDelete, onDelete }) {
  return (
    <div className={`flex gap-2 mb-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
        isMe ? 'bg-hun-brown' : 'bg-indigo-500'
      }`}>
        {(msg.sender_name || msg.sender_username || '?')[0].toUpperCase()}
      </div>

      <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {/* Sender info */}
        <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs font-semibold text-gray-700">
            {msg.sender_name || msg.sender_username || 'Ẩn danh'}
          </span>
          {msg.sender_role && <RoleBadge role={msg.sender_role} />}
        </div>

        {/* Bubble */}
        <div className={`group relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isMe
            ? 'bg-hun-brown text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
        }`}>
          {msg.body}

          {/* Delete button — appears on hover */}
          {canDelete && (
            <button
              onClick={() => onDelete(msg.id)}
              title="Xóa tin nhắn"
              className={`absolute -top-2 ${isMe ? 'left-1' : 'right-1'} hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors`}
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Time */}
        <span className="text-[11px] text-gray-400" title={fmtFull(msg.created_at)}>
          {fmtTime(msg.created_at)}
        </span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Inbox() {
  const { user, can } = useAuth()
  const qc = useQueryClient()
  const canManage = can('inbox:manage')

  const [selectedId, setSelectedId] = useState(null)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [draft, setDraft] = useState('')
  const [lastMessageAt, setLastMessageAt] = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const [mobileShowMessages, setMobileShowMessages] = useState(false)

  // ── Fetch thread list (refresh every 10s) ─────────────────────────────────
  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ['inbox-threads'],
    queryFn: () => getInboxThreads().then(r => r.data.data),
    refetchInterval: 10_000,
  })
  const threads = threadsData || []

  const selectedThread = threads.find(t => t.id === selectedId)

  // ── Fetch messages (refresh every 5s when thread selected) ────────────────
  const { data: msgsData } = useQuery({
    queryKey: ['inbox-messages', selectedId],
    queryFn: () => getInboxMessages(selectedId).then(r => r.data.data),
    enabled: !!selectedId,
    refetchInterval: 5_000,
    onSuccess: (data) => {
      if (data.length) setLastMessageAt(data[data.length - 1].created_at)
    },
  })
  const messages = msgsData || []

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  // ── Select thread ──────────────────────────────────────────────────────────
  const handleSelectThread = useCallback((id) => {
    setSelectedId(id)
    setLastMessageAt(null)
    setDraft('')
    setMobileShowMessages(true)
  }, [])

  // ── Create thread ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => createInboxThread({ title: newTitle.trim() }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inbox-threads'] })
      setNewTitle('')
      setShowNewThread(false)
      handleSelectThread(res.data.data.id)
      toast.success('Đã tạo hội thoại mới')
    },
    onError: () => toast.error('Không thể tạo hội thoại'),
  })

  // ── Post message ──────────────────────────────────────────────────────────
  const postMutation = useMutation({
    mutationFn: (body) => postInboxMessage(selectedId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-messages', selectedId] })
      qc.invalidateQueries({ queryKey: ['inbox-threads'] })
      setDraft('')
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Không thể gửi tin nhắn'
      toast.error(msg)
    },
  })

  const handleSend = () => {
    const body = draft.trim()
    if (!body) return
    postMutation.mutate(body)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Delete message ─────────────────────────────────────────────────────────
  const deleteMsgMutation = useMutation({
    mutationFn: (id) => deleteInboxMessage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox-messages', selectedId] }),
    onError: () => toast.error('Không thể xóa tin nhắn'),
  })

  // ── Close / reopen / delete thread ────────────────────────────────────────
  const closeMutation = useMutation({
    mutationFn: () => closeInboxThread(selectedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-threads'] })
      toast.success('Đã đóng hội thoại')
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  const reopenMutation = useMutation({
    mutationFn: () => reopenInboxThread(selectedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-threads'] })
      toast.success('Đã mở lại hội thoại')
    },
    onError: () => toast.error('Thao tác thất bại'),
  })

  const deleteThreadMutation = useMutation({
    mutationFn: () => deleteInboxThread(selectedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-threads'] })
      setSelectedId(null)
      setMobileShowMessages(false)
      toast.success('Đã xóa hội thoại')
    },
    onError: () => toast.error('Không thể xóa hội thoại'),
  })

  const handleDeleteThread = () => {
    if (!window.confirm('Xóa hội thoại này và toàn bộ tin nhắn? Không thể hoàn tác.')) return
    deleteThreadMutation.mutate()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const isClosed = selectedThread?.status === 'closed'

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-hun-brown" />
          <h1 className="text-lg font-semibold text-hun-black">Hộp thư nội bộ</h1>
          {threads.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{threads.length}</span>
          )}
        </div>
        <button
          onClick={() => setShowNewThread(true)}
          className="flex items-center gap-1.5 text-sm bg-hun-brown text-white px-3 py-1.5 rounded hover:bg-hun-brown/90 transition-colors"
        >
          <Plus size={16} />
          Hội thoại mới
        </button>
      </div>

      {/* New thread modal */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-hun-black mb-4">Tạo hội thoại mới</h2>
            <input
              autoFocus
              type="text"
              placeholder="Tiêu đề hội thoại..."
              maxLength={200}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newTitle.trim() && createMutation.mutate()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hun-brown/40 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowNewThread(false); setNewTitle('') }} className="text-sm px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">
                Huỷ
              </button>
              <button
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="text-sm px-4 py-2 rounded bg-hun-brown text-white hover:bg-hun-brown/90 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Thread list (sidebar) ── */}
        <aside className={`
          w-full md:w-72 lg:w-80 border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto
          ${mobileShowMessages ? 'hidden md:flex' : 'flex'}
        `}>
          {threadsLoading && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Đang tải...</div>
          )}
          {!threadsLoading && threads.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
              <MessageSquare size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Chưa có hội thoại nào</p>
              <p className="text-xs mt-1">Nhấn "Hội thoại mới" để bắt đầu</p>
            </div>
          )}
          {threads.map(t => (
            <ThreadItem
              key={t.id}
              thread={t}
              active={t.id === selectedId}
              onClick={() => handleSelectThread(t.id)}
            />
          ))}
        </aside>

        {/* ── Message panel ── */}
        <section className={`
          flex-1 flex flex-col bg-gray-50 overflow-hidden
          ${!mobileShowMessages && selectedId ? 'hidden md:flex' : mobileShowMessages ? 'flex' : 'hidden md:flex'}
        `}>
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare size={48} className="mb-3 opacity-20" />
              <p className="text-sm">Chọn một hội thoại để xem tin nhắn</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileShowMessages(false)}
                    className="md:hidden text-gray-500 hover:text-gray-700"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-hun-black truncate">{selectedThread?.title}</h2>
                    <p className="text-xs text-gray-400">
                      {selectedThread?.message_count || 0} tin nhắn
                      {isClosed && <span className="ml-2 text-gray-400 italic">· Đã đóng</span>}
                    </p>
                  </div>
                </div>
                {/* Thread actions */}
                {canManage && (
                  <div className="flex items-center gap-2 shrink-0">
                    {isClosed ? (
                      <button
                        onClick={() => reopenMutation.mutate()}
                        disabled={reopenMutation.isPending}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Unlock size={13} /> Mở lại
                      </button>
                    ) : (
                      <button
                        onClick={() => closeMutation.mutate()}
                        disabled={closeMutation.isPending}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                      >
                        <Lock size={13} /> Đóng
                      </button>
                    )}
                    <button
                      onClick={handleDeleteThread}
                      disabled={deleteThreadMutation.isPending}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={13} /> Xóa
                    </button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                    Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!
                  </div>
                )}
                {messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={msg.sender_id === user?.id}
                    canDelete={canManage || msg.sender_id === user?.id}
                    onDelete={(id) => deleteMsgMutation.mutate(id)}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              {isClosed ? (
                <div className="px-4 py-3 bg-white border-t border-gray-200 text-center text-sm text-gray-400 italic shrink-0">
                  Hội thoại đã đóng — không thể gửi tin nhắn mới
                </div>
              ) : (
                <div className="px-4 py-3 bg-white border-t border-gray-200 shrink-0">
                  <div className="flex items-end gap-3">
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      maxLength={4000}
                      className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hun-brown/40"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!draft.trim() || postMutation.isPending}
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-hun-brown text-white hover:bg-hun-brown/90 disabled:opacity-40 transition-colors shrink-0"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{draft.length}/4000</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
