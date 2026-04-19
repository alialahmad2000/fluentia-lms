import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useRenameConversation, useDeleteConversation } from '@/hooks/trainer/useNabih'
import './ConversationsSidebar.css'

function timeAgo(iso) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d === 0) return 'اليوم'
  if (d === 1) return 'أمس'
  return `منذ ${d} يوم`
}

export function ConversationsSidebar({ conversations = [], activeId, onSelect, onNew }) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const rename = useRenameConversation()
  const del = useDeleteConversation()

  const startEdit = (e, conv) => {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditValue(conv.title || '')
  }

  const commitEdit = async (id) => {
    if (editValue.trim()) {
      await rename.mutateAsync({ conversationId: id, newTitle: editValue.trim() })
    }
    setEditingId(null)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (confirm('حذف هذه المحادثة؟')) {
      await del.mutateAsync(id)
    }
  }

  return (
    <div className="nab-sidebar">
      <button className="nab-sidebar__new" onClick={onNew}>
        <Plus size={14} />
        <span>محادثة جديدة</span>
      </button>

      {conversations.length === 0 ? (
        <p className="nab-sidebar__empty">لا توجد محادثات بعد</p>
      ) : (
        <ul className="nab-sidebar__list" role="list">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={`nab-sidebar__item ${conv.id === activeId ? 'is-active' : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              {editingId === conv.id ? (
                <input
                  className="nab-sidebar__rename-input"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(conv.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="nab-sidebar__title">
                    {conv.title || 'محادثة جديدة'}
                  </div>
                  {conv.preview && (
                    <div className="nab-sidebar__preview">{conv.preview}</div>
                  )}
                  <div className="nab-sidebar__meta">
                    <span>{timeAgo(conv.last_message_at)}</span>
                    <span>{conv.message_count || 0} رسالة</span>
                  </div>
                  <div className="nab-sidebar__actions">
                    <button
                      className="nab-sidebar__action-btn"
                      onClick={(e) => startEdit(e, conv)}
                      title="تعديل العنوان"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="nab-sidebar__action-btn nab-sidebar__action-btn--danger"
                      onClick={(e) => handleDelete(e, conv.id)}
                      title="حذف"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
