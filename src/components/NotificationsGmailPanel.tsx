import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  Mail,
  Send,
  RefreshCw,
  CheckCheck,
  X,
  Plus,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { NotificationItem } from '../types/island';
import type { GmailMessagePreview } from '../utils/workspaceAuth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface NotificationsGmailPanelProps {
  notifications: NotificationItem[];
  dnd: boolean;
  onToggleDnd: () => void;
  onMarkAllRead: () => void;
  onDismissNotification: (id: string) => void;
  onSimulateIncoming: () => void;
  workspaceUser: User | null;
  isSigningIn: boolean;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  gmailMessages: GmailMessagePreview[];
  gmailLoading: boolean;
  gmailError: string | null;
  onRefreshGmail: () => void;
  onRequestSendEmail: (to: string, subject: string, body: string) => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

export const NotificationsGmailPanel: React.FC<NotificationsGmailPanelProps> = ({
  notifications,
  dnd,
  onToggleDnd,
  onMarkAllRead,
  onDismissNotification,
  onSimulateIncoming,
  workspaceUser,
  isSigningIn,
  onSignInGoogle,
  onSignOutGoogle,
  gmailMessages,
  gmailLoading,
  gmailError,
  onRefreshGmail,
  onRequestSendEmail,
  onHaptic,
}) => {
  const [subTab, setSubTab] = useState<'alerts' | 'gmail'>('alerts');
  const [replyTo, setReplyTo] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTo.trim() || !replySubject.trim() || !replyBody.trim()) return;
    onHaptic('tap');
    onRequestSendEmail(replyTo.trim(), replySubject.trim(), replyBody.trim());
    setComposeOpen(false);
    setReplyBody('');
  };

  return (
    <div className="space-y-3.5">
      {/* Header switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#14161b] border border-white/[0.05]">
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setSubTab('alerts');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              subTab === 'alerts' ? 'bg-[#232734] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>System Alerts ({notifications.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              setSubTab('gmail');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              subTab === 'gmail' ? 'bg-[#232734] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail Inbox</span>
          </button>
        </div>

        {subTab === 'alerts' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDnd}
              aria-pressed={dnd}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                dnd
                  ? 'bg-[#0e241e] text-emerald-300 border border-emerald-400/25'
                  : 'bg-[#14161b] text-zinc-300 hover:text-white border border-white/[0.06]'
              }`}
            >
              {dnd ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              <span>{dnd ? 'DND On' : 'DND Off'}</span>
            </button>
            <button
              type="button"
              onClick={onSimulateIncoming}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#14161b] hover:bg-[#1e222b] text-zinc-200 text-xs font-medium border border-white/[0.06]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Test Alert</span>
            </button>
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#14161b] hover:bg-[#1e222b] text-zinc-300 text-xs"
              aria-label="Mark all notifications read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {workspaceUser && (
              <>
                <button
                  type="button"
                  onClick={() => setComposeOpen((o) => !o)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#8ba3ff] hover:bg-[#9eb2ff] text-[#080a10] text-xs font-semibold"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Compose</span>
                </button>
                <button
                  type="button"
                  onClick={onRefreshGmail}
                  disabled={gmailLoading}
                  className="p-2 rounded-lg bg-[#14161b] hover:bg-[#1e222b] text-zinc-300"
                  aria-label="Refresh Gmail inbox"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${gmailLoading ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
            <GoogleSignInButton
              user={workspaceUser}
              isSigningIn={isSigningIn}
              onSignIn={onSignInGoogle}
              onSignOut={onSignOutGoogle}
              compact
            />
          </div>
        )}
      </div>

      {subTab === 'alerts' ? (
        <div className="h-[255px] overflow-y-auto island-scroll space-y-2 pr-0.5">
          {notifications.length === 0 ? (
            <div className="h-full rounded-2xl bg-[#111319] border border-white/[0.05] flex flex-col items-center justify-center text-center p-4">
              <Bell className="w-5 h-5 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400">No active notifications.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl p-3 border flex items-start justify-between gap-3 transition-colors ${
                  n.unread
                    ? 'bg-[#171b24] border-[#8ba3ff]/25'
                    : 'bg-[#12141a] border-white/[0.05]'
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span className="font-medium text-zinc-300">{n.app}</span>
                    <span aria-hidden="true">·</span>
                    <span>{n.timeLabel}</span>
                    {n.unread && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#8ba3ff] font-medium">Unread</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white">{n.title}</p>
                  <p className="text-xs text-zinc-400 leading-snug">{n.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onHaptic('tap');
                    onDismissNotification(n.id);
                  }}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                  aria-label={`Dismiss notification "${n.title}"`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      ) : !workspaceUser ? (
        <div className="h-[255px] rounded-2xl bg-[#111319] border border-white/[0.06] p-6 flex flex-col items-center justify-center text-center space-y-3">
          <Mail className="w-7 h-7 text-[#8ba3ff]" />
          <div className="max-w-sm space-y-1">
            <p className="text-sm font-semibold text-white">Connect Gmail to WinLand</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sign in with Google to stream unread inbox notifications directly into your Dynamic Island and send quick confirmed replies.
            </p>
          </div>
          <GoogleSignInButton
            user={workspaceUser}
            isSigningIn={isSigningIn}
            onSignIn={onSignInGoogle}
            onSignOut={onSignOutGoogle}
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {gmailError && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {gmailError}
            </p>
          )}

          {composeOpen && (
            <form
              onSubmit={handleComposeSubmit}
              className="rounded-2xl bg-[#14161b] border border-white/10 p-3 space-y-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  required
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="Recipient email…"
                  aria-label="Email recipient"
                  className="px-3 py-1.5 rounded-lg bg-[#0d0f14] border border-white/10 text-xs text-zinc-100"
                />
                <input
                  type="text"
                  required
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Subject…"
                  aria-label="Email subject"
                  className="px-3 py-1.5 rounded-lg bg-[#0d0f14] border border-white/10 text-xs text-zinc-100"
                />
              </div>
              <textarea
                rows={2}
                required
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write your reply (you will review and confirm before sending)…"
                aria-label="Email body"
                className="w-full px-3 py-1.5 rounded-lg bg-[#0d0f14] border border-white/10 text-xs text-zinc-100 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#8ba3ff] text-[#080a10] text-xs font-semibold"
                >
                  Review &amp; Send
                </button>
              </div>
            </form>
          )}

          <div className="h-[225px] overflow-y-auto island-scroll space-y-2 pr-0.5">
            {gmailMessages.length === 0 ? (
              <div className="h-full rounded-2xl bg-[#111319] border border-white/[0.05] flex items-center justify-center text-xs text-zinc-400">
                {gmailLoading ? 'Loading recent Gmail threads…' : 'No inbox messages loaded yet.'}
              </div>
            ) : (
              gmailMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl bg-[#13151b] border border-white/[0.05] p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span className="truncate max-w-[200px] text-zinc-300 font-medium">
                        {msg.from}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{msg.date}</span>
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{msg.subject}</p>
                    <p className="text-xs text-zinc-400 line-clamp-2">{msg.snippet}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const match = msg.from.match(/<([^>]+)>/);
                      setReplyTo(match ? match[1] : msg.from);
                      setReplySubject(
                        msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`
                      );
                      setComposeOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 whitespace-nowrap shrink-0"
                  >
                    Reply
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
