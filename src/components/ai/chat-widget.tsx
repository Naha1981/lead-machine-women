"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiClient } from "@/lib/api-client";

type ChatWidgetProps = {
  slug: string;
  businessName: string;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const QUICK_REPLIES = [
  "What services do you offer?",
  "How much does it cost?",
  "How do I get started?",
];

export function ChatWidget({ slug, businessName }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const welcomeMessage: ChatMessage = {
    role: "assistant",
    content: `Hi! I'm the ${businessName} assistant. Ask me anything about our services, or fill the form and we'll WhatsApp you back. 👋`,
  };

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([welcomeMessage]);
    }
  }, [open, messages.length, welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    setShowQuickReplies(false);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const history = nextMessages
        .slice(-7, -1)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await apiClient.chat({ slug, message: trimmed, history });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      toast.error(err?.message ?? "Chat unavailable. Please try the form instead.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't respond right now. Please leave your details in the form and our team will WhatsApp you back shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Mobile: full-screen drawer
  if (isMobile) {
    return (
      <>
        {/* Floating button */}
        <AnimatePresence>
          {!open && (
            <motion.button
              key="fab"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={() => setOpen(true)}
              aria-label="Open chat"
              className="fixed bottom-5 right-5 z-50 size-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-700 transition-colors"
            >
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
              <MessageCircle className="size-6 relative" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.div
              key="mobile-panel"
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-0 z-50 bg-white flex flex-col"
            >
              <ChatHeader
                businessName={businessName}
                onClose={() => setOpen(false)}
              />
              <ChatBody
                ref={scrollRef}
                messages={messages}
                loading={loading}
                showQuickReplies={showQuickReplies}
                onQuickReply={sendMessage}
              />
              <ChatInput
                ref={inputRef}
                value={input}
                onChange={setInput}
                onSend={() => sendMessage(input)}
                disabled={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop: floating panel
  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setOpen(true)}
            aria-label="Open chat"
            className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-700 transition-colors"
          >
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
            <MessageCircle className="size-6 relative" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="desktop-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <ChatHeader businessName={businessName} onClose={() => setOpen(false)} />
            <ChatBody
              ref={scrollRef}
              messages={messages}
              loading={loading}
              showQuickReplies={showQuickReplies}
              onQuickReply={sendMessage}
            />
            <ChatInput
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSend={() => sendMessage(input)}
              disabled={loading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- subcomponents (internal) ---------- */

function ChatHeader({ businessName, onClose }: { businessName: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white">
      <div className="size-9 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
        <Bot className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{businessName}</p>
        <p className="text-[11px] text-emerald-50/90 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-200 inline-block" />
          AI Assistant • typically replies instantly
        </p>
      </div>
      <button
        onClick={onClose}
        aria-label="Close chat"
        className="size-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

const ChatBody = ({
  ref,
  messages,
  loading,
  showQuickReplies,
  onQuickReply,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  loading: boolean;
  showQuickReplies: boolean;
  onQuickReply: (msg: string) => void;
}) => {
  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto px-3 py-4 bg-[#e5ddd5]/40 bg-gradient-to-b from-slate-50 to-slate-100/60"
      style={{ scrollbarWidth: "thin" }}
    >
      <div className="flex flex-col gap-2.5">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && <TypingBubble />}
        {showQuickReplies && messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 mt-2 px-1">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => onQuickReply(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-3 py-2 text-sm shadow-sm whitespace-pre-wrap break-words ${
          isUser
            ? "bg-emerald-600 text-white rounded-2xl rounded-br-sm"
            : "bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-100"
        }`}
      >
        {content}
        <span
          className={`block text-[9px] mt-0.5 ${
            isUser ? "text-emerald-50/80 text-right" : "text-slate-400"
          }`}
        >
          {new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-100 px-3 py-2.5 shadow-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-slate-400"
              animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const ChatInput = ({
  ref,
  value,
  onChange,
  onSend,
  disabled,
}: {
  ref: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) => {
  return (
    <div className="px-3 py-3 border-t border-slate-200 bg-white">
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={disabled}
          placeholder="Type a message..."
          className="flex-1 h-10 px-3.5 rounded-full bg-slate-100 border border-transparent focus:border-emerald-400 focus:bg-white focus:outline-none text-sm transition-colors"
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="size-10 shrink-0 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;
