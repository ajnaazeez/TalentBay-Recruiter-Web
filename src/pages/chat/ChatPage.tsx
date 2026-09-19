import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Send,
  ShieldCheck,
  CheckCheck,
  Lock,
  MessageSquare,
  User,
  Sparkles,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { chatService } from '@/services/chatService';
import { ChatModel, MessageModel } from '@/types/chat';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

export const ChatPage: React.FC = () => {
  const { chatId: routeChatId } = useParams<{ chatId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const recruiterId = user?.uid || '';

  const passedState = location.state as {
    activeChatId?: string;
    candidateId?: string;
    candidateName?: string;
    jobTitle?: string;
  } | undefined;

  const [chats, setChats] = useState<ChatModel[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(
    routeChatId || passedState?.activeChatId || null
  );
  const [messages, setMessages] = useState<MessageModel[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Subscribe to Recruiter's Chat List matching Flutter chat_list_screen.dart
  useEffect(() => {
    if (!recruiterId) {
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    setChatError(null);

    const unsub = chatService.subscribeToRecruiterChats(
      recruiterId,
      (liveChats) => {
        setChats(liveChats);
        setLoadingChats(false);

        // Auto-select first chat on desktop if none selected
        if (liveChats.length > 0 && !activeChatId && !routeChatId && !passedState?.activeChatId) {
          const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
          if (isDesktop) {
            setActiveChatId(liveChats[0].chatId || liveChats[0].id);
          }
        }
      },
      (err) => {
        console.error('[ChatPage] Error loading chats:', err);
        setChatError('Failed to load conversations from Firebase.');
        setLoadingChats(false);
      }
    );

    return () => unsub();
  }, [recruiterId, activeChatId, routeChatId, passedState?.activeChatId]);

  // 2. Subscribe to Active Chat Messages with WebCrypto AES-CTR Decryption & Mark As Read
  useEffect(() => {
    if (!activeChatId || !recruiterId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);

    // Mark conversation as read for the recruiter
    chatService.markAsRead(activeChatId, recruiterId);

    const unsub = chatService.subscribeToMessages(
      activeChatId,
      recruiterId,
      (liveMessages) => {
        setMessages(liveMessages);
        setLoadingMessages(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (err) => {
        console.error('[ChatPage] Error loading messages:', err);
        setLoadingMessages(false);
      }
    );

    return () => unsub();
  }, [activeChatId, recruiterId]);

  // Send Message with WebCrypto AES-CTR Encryption
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatId || !recruiterId || sending) return;

    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }

    const textToSend = inputText.trim();
    setInputText('');

    try {
      setSending(true);
      await chatService.sendMessage(activeChatId, {
        senderId: recruiterId,
        text: textToSend,
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 50);
    } catch (err: unknown) {
      console.error('[ChatPage] Failed to send encrypted message:', err);
      // Restore input text on failure
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.candidateName && c.candidateName.toLowerCase().includes(q)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  const activeChat = chats.find((c) => (c.chatId || c.id) === activeChatId) || {
    id: activeChatId || '',
    chatId: activeChatId || '',
    jobId: '',
    recruiterId,
    candidateId: passedState?.candidateId || '',
    candidateName: passedState?.candidateName || 'Candidate',
    candidateAvatarUrl: '',
    jobTitle: passedState?.jobTitle || 'Role Opening',
    lastMessage: '',
    lastMessageTime: new Date(),
    unreadCountRecruiter: 0,
    unreadCount: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Candidate Messages
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Secure, end-to-end encrypted direct messaging between recruiters and candidates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 border border-teal-200/80 dark:border-teal-500/30 px-3.5 py-1.5 rounded-xl shrink-0">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>AES-CTR Encrypted</span>
        </div>
      </div>

      {!isSubscribed && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                Active Subscription Required
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                An active subscription plan is required to send chat messages and initiate conversations.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(ROUTES.SUBSCRIPTION)}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs shrink-0"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {chatError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{chatError}</span>
        </div>
      )}

      {/* Main Chat Workspace Container */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-card overflow-hidden h-[calc(100vh-230px)] min-h-[580px] grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Conversations List (4 Cols on desktop; full width on mobile when no active chat) */}
        <div
          className={`lg:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-[#0b0f19]/50 min-w-0 ${
            activeChatId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-[#111827]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates or messages..."
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {loadingChats ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="font-bold text-slate-600 dark:text-slate-300">NO MESSAGES YET</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                  Start conversations with candidates directly from Candidate Connect or Applications.
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const chatId = chat.chatId || chat.id;
                const isActive = chatId === activeChatId;
                const unread = Number(chat.unreadCountRecruiter || chat.unreadCount || 0);

                return (
                  <button
                    key={chatId}
                    type="button"
                    onClick={() => setActiveChatId(chatId)}
                    className={`w-full p-4 text-left transition flex items-start gap-3.5 min-w-0 ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 shadow-xs border-l-4 border-teal-600 dark:border-teal-400'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Candidate Avatar */}
                    {chat.candidateAvatarUrl ? (
                      <img
                        src={chat.candidateAvatarUrl}
                        alt={chat.candidateName}
                        className="w-10 h-10 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                        {chat.candidateName ? chat.candidateName.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            unread > 0
                              ? 'font-black text-slate-900 dark:text-white'
                              : 'font-bold text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {chat.candidateName}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                          {chat.lastMessageTime ? formatDate(chat.lastMessageTime) : 'Recently'}
                        </span>
                      </div>

                      <p className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold truncate">
                        {chat.jobTitle}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            unread > 0
                              ? 'font-bold text-slate-900 dark:text-slate-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {chat.lastMessage || 'Encrypted conversation...'}
                        </p>
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Stream (8 Cols on desktop; full width on mobile when chat open) */}
        <div
          className={`lg:col-span-8 flex flex-col h-full bg-white dark:bg-[#111827] min-w-0 ${
            activeChatId ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {activeChatId ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#111827] min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button on mobile */}
                  <button
                    type="button"
                    onClick={() => setActiveChatId(null)}
                    className="p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {activeChat.candidateAvatarUrl ? (
                    <img
                      src={activeChat.candidateAvatarUrl}
                      alt={activeChat.candidateName}
                      className="w-10 h-10 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {activeChat.candidateName ? activeChat.candidateName.charAt(0).toUpperCase() : 'C'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {activeChat.candidateName}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {activeChat.jobTitle}
                    </p>
                  </div>
                </div>

                {activeChat.candidateId && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/candidates/${activeChat.candidateId}${
                          activeChat.jobId ? `?jobId=${activeChat.jobId}` : ''
                        }`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition shrink-0"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View Profile</span>
                  </button>
                )}
              </div>

              {/* Message History Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-[#0b0f19]/40 min-w-0">
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2 p-6 text-center">
                    <Sparkles className="w-6 h-6 text-teal-500" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      Encrypted Chat Channel Established
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                      Send a message below. Messages are encrypted in real time using AES-CTR matching the TalentBay mobile apps.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === recruiterId || msg.senderType === 'recruiter';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
                            isMe
                              ? 'bg-teal-700 text-white rounded-br-xs shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {msg.text || msg.content}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1 flex items-center gap-1 font-medium">
                          {msg.timestamp ? formatDate(msg.timestamp) : 'Just now'}
                          {isMe && <CheckCheck className="w-3 h-3 text-teal-500" />}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center gap-2.5 min-w-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type an encrypted message..."
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition shadow-xs disabled:opacity-50 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Select a Conversation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Choose an active candidate conversation from the list or reach out to candidate matches from Candidate Connect.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
