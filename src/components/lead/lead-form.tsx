"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Phone, Mail, User, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/api-client";
import { LeadSuccess } from "./lead-success";

type LeadFormProps = {
  slug: string;
  businessName: string;
  ctaText?: string;
  source?: "website" | "standalone";
};

type SubmitResult = {
  ok: boolean;
  leadId: string;
  score: number | null;
  temperature: string | null;
  ref: string;
};

export function LeadForm({ slug, businessName, ctaText = "Get a Free Consultation", source = "website" }: LeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceNeeded, setServiceNeeded] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [touched, setTouched] = useState(false);

  const phoneDigits = phone.replace(/\D/g, "");
  const nameValid = name.trim().length >= 2;
  const phoneValid = phoneDigits.length >= 5;
  const canSubmit = nameValid && phoneValid && consent && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nameValid) return toast.error("Please enter your name.");
    if (!phoneValid) return toast.error("Please enter a valid phone number (5+ digits).");
    if (!consent) return toast.error("Please accept the POPIA consent to continue.");

    setSubmitting(true);
    try {
      const res = await apiClient.submitLead({
        slug,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        serviceNeeded: serviceNeeded.trim() || undefined,
        message: message.trim() || undefined,
        source,
        consentGiven: true,
      });
      setResult(res);
      toast.success("Enquiry submitted! We'll be in touch soon.");
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setResult(null);
    setName("");
    setPhone("");
    setEmail("");
    setServiceNeeded("");
    setMessage("");
    setConsent(false);
    setTouched(false);
  }

  if (result) {
    return (
      <LeadSuccess
        refCode={result.ref}
        score={result.score}
        temperature={result.temperature}
        businessName={businessName}
        leadName={name}
        onReset={handleReset}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lf-name" className="text-sm font-medium text-slate-700">
            Name <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              id="lf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Mokoena"
              className="pl-9"
              autoComplete="name"
            />
          </div>
          {touched && !nameValid && (
            <p className="text-xs text-rose-500">Please enter your name (2+ chars).</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lf-phone" className="text-sm font-medium text-slate-700">
            Phone <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              id="lf-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 82 123 4567"
              className="pl-9"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          {touched && !phoneValid && (
            <p className="text-xs text-rose-500">Please enter a valid phone number (5+ digits).</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lf-email" className="text-sm font-medium text-slate-700">
          Email <span className="text-slate-400 font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <Input
            id="lf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="pl-9"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lf-service" className="text-sm font-medium text-slate-700">
          What do you need help with? <span className="text-slate-400 font-normal">(optional)</span>
        </Label>
        <Input
          id="lf-service"
          value={serviceNeeded}
          onChange={(e) => setServiceNeeded(e.target.value)}
          placeholder="e.g. Business consulting for a retail startup"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lf-message" className="text-sm font-medium text-slate-700">
          Message <span className="text-slate-400 font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 size-4 text-slate-400 pointer-events-none" />
          <Textarea
            id="lf-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us a bit more about what you're looking for..."
            className="pl-9 min-h-[110px] resize-y"
          />
        </div>
      </div>

      <label
        htmlFor="lf-consent"
        className="flex items-start gap-3 cursor-pointer rounded-lg border border-slate-200 bg-slate-50/60 p-3 hover:bg-slate-50 transition-colors"
      >
        <Checkbox
          id="lf-consent"
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
        />
        <span className="text-xs text-slate-600 leading-relaxed">
          I consent to {businessName} processing my personal information in line with{" "}
          <span className="font-semibold text-slate-800">POPIA</span> for the purpose of responding
          to this enquiry. I may withdraw consent at any time.{" "}
          <span className="text-emerald-700 underline underline-offset-2">Privacy policy</span>.
        </span>
      </label>

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="size-4" />
            {ctaText}
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="size-3.5 text-emerald-500" />
        Your info is secure &amp; POPIA-compliant
      </p>
    </form>
  );
}

export default LeadForm;
