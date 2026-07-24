"use client";

import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type LeadSuccessProps = {
  ref: string;
  score: number | null;
  temperature: string | null;
  businessName: string;
  leadName: string;
  onReset?: () => void;
};

export function LeadSuccess({
  ref,
  businessName,
  leadName,
  onReset,
}: LeadSuccessProps) {
  const firstName = leadName.trim().split(/\s+/)[0] || "there";
  const whatsappMessage = `Hi ${firstName} 👋 Thanks for reaching out to ${businessName}! We've received your enquiry. Our team will WhatsApp or call you within 2 hours. Reference: ${ref}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      <div className="flex flex-col items-center text-center gap-3">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
          className="size-16 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <CheckCircle2 className="size-9 text-emerald-600" strokeWidth={2.5} />
        </motion.div>
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">
          Thanks {firstName}! Your enquiry is in. 🎉
        </h3>
        <p className="text-sm text-slate-600 max-w-md">
          We&apos;ve matched you with the right team — expect a fast response!
        </p>
      </div>

      {/* WhatsApp confirmation bubble */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="mt-6 flex flex-col gap-2"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 pl-2">
          <MessageCircle className="size-3.5 text-emerald-600" />
          WhatsApp confirmation sent to you
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold">
            <Sparkles className="size-2.5" /> delivered
          </span>
        </div>

        <div className="relative ml-1 mr-6">
          {/* WhatsApp-style bubble */}
          <div className="relative rounded-2xl rounded-tl-sm bg-gradient-to-br from-[#dcfce7] to-[#bbf7d0] px-4 py-3 shadow-sm border border-emerald-200/60">
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {whatsappMessage}
            </p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] text-slate-500">
                {new Date().toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <svg viewBox="0 0 16 11" className="size-3.5 text-[#0f9d58]" fill="currentColor">
                <path d="M11.07.653a.5.5 0 0 1 .144.692l-4.6 7.2a.5.5 0 0 1-.79.099L3.6 5.55a.5.5 0 1 1 .748-.664l1.74 1.96L10.38.797a.5.5 0 0 1 .69-.144Z" />
                <path d="M15.07.653a.5.5 0 0 1 .144.692l-4.6 7.2a.5.5 0 0 1-.79.099l-.42-.474.81-1.267L14.38.797a.5.5 0 0 1 .69-.144Z" />
              </svg>
            </div>
            {/* bubble tail */}
            <span
              aria-hidden
              className="absolute -left-1.5 top-0 w-3 h-3 bg-[#dcfce7] border-l border-b border-emerald-200/60"
              style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Reference pill */}
      <div className="mt-5 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5">
          <span className="text-xs text-slate-500">Reference</span>
          <span className="text-sm font-mono font-semibold text-slate-900">{ref}</span>
        </div>
      </div>

      {onReset && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" size="sm" onClick={onReset}>
            Done
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default LeadSuccess;
