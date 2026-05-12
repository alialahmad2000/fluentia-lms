import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { useGroupChannels } from '../queries/useGroupChannels'
import ChannelSidebar from '../components/ChannelSidebar'
import ChatHeader from '../components/ChatHeader'
import MessageList from '../components/MessageList'
import MessageComposer from '../components/MessageComposer'
import PinnedMessagesStrip from '../components/PinnedMessagesStrip'

export default function GroupChatPage() {
  const { groupId, channelSlug = 'general', messageId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)

  const { data: channels = [] } = useGroupChannels(groupId)
  const activeChannel = channels.find((c) => c.slug === channelSlug) ?? null

  // Group name from profile or student data
  const groupName = profile?.role === 'student' ? null : null

  function handleChannelSelect(ch) {
    navigate(`/chat/${groupId}/${ch.slug}`, { replace: true })
    setSidebarOpen(false)
  }

  const isAnnouncement = activeChannel?.is_announcement ?? false

  // Trainers/admins can post in announcements; students cannot
  const canCompose = !isAnnouncement || ['trainer', 'admin'].includes(profile?.role)

  return (
    <div
      className="flex h-[calc(100dvh-60px)] bg-[var(--bg-page)] overflow-hidden"
      style={{ direction: 'rtl' }}
    >
      {/* Desktop channel sidebar */}
      <ChannelSidebar
        groupId={groupId}
        activeSlug={channelSlug}
        onSelect={handleChannelSelect}
        className="hidden md:flex"
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex" style={{ direction: 'rtl' }}>
          <ChannelSidebar
            groupId={groupId}
            activeSlug={channelSlug}
            onSelect={handleChannelSelect}
            className="flex shadow-2xl"
          />
          <button
            className="flex-1 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile sidebar toggle + header */}
        <div className="flex items-center">
          <button
            className="md:hidden p-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <ChatHeader
              channel={activeChannel}
              groupName={groupName}
              onSearchOpen={() => {/* Phase K */}}
            />
          </div>
        </div>

        {/* Pinned strip */}
        {activeChannel && <PinnedMessagesStrip channelId={activeChannel.id} />}

        {/* Messages */}
        {activeChannel ? (
          <MessageList
            channelId={activeChannel.id}
            groupId={groupId}
            deepLinkMessageId={messageId}
            onReply={setReplyTo}
            onEdit={setEditingMsg}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
            <p style={{ fontFamily: 'Tajawal, sans-serif' }}>اختر قناة من القائمة</p>
          </div>
        )}

        {/* Composer */}
        {activeChannel && canCompose && (
          <MessageComposer
            channelId={activeChannel.id}
            groupId={groupId}
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            isAnnouncement={isAnnouncement}
          />
        )}

        {!canCompose && (
          <div
            className="px-4 py-3 text-center text-sm text-amber-400 border-t border-[var(--border)] bg-amber-500/5"
            style={{ fontFamily: 'Tajawal, sans-serif' }}
          >
            هذه القناة للإعلانات فقط من المدرب
          </div>
        )}
      </div>
    </div>
  )
}
