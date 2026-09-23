"use client";

import * as React from "react";

export default function DentistDemoPage() {
  const [sent, setSent] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const body = {
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      email: String(form.get("email") || ""),
      serviceNeeded: String(form.get("serviceNeeded") || ""),
      message: String(form.get("message") || ""),
      consentGiven: true,
    };
    try {
      const res = await fetch("/api/demo/dentist/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Demo failed");
      setSent(true);
      setStatus(`Demo lead captured. Lead ID: ${data.leadId}`);
      formElement.reset();
    } catch (error: any) {
      setStatus(error?.message ?? "Demo failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Demo environment</p>
            <h1 className="text-xl font-bold">Sandton Smile Dental</h1>
          </div>
          <a href="https://wa.me/27820000000" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white">WhatsApp us</a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-7">
          <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Dental implants in Sandton</div>
          <h2 className="max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">Replace a missing tooth with confidence.</h2>
          <p className="max-w-xl text-lg text-slate-600">Book a consultation with our implant team and get a clear treatment plan for your smile.</p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-full border bg-white px-3 py-2">Implant consultation</span>
            <span className="rounded-full border bg-white px-3 py-2">Cosmetic dentistry</span>
            <span className="rounded-full border bg-white px-3 py-2">Emergency appointments</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Book a consultation</p>
          <h3 className="mt-2 text-2xl font-semibold">Tell us what you need</h3>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input name="name" required placeholder="Your name" className="w-full rounded-lg border px-3 py-3" />
            <input name="phone" required placeholder="+27 82 123 4567" className="w-full rounded-lg border px-3 py-3" />
            <input name="email" type="email" placeholder="Email address" className="w-full rounded-lg border px-3 py-3" />
            <select name="serviceNeeded" className="w-full rounded-lg border px-3 py-3">
              <option>Dental implants</option>
              <option>General dentistry</option>
              <option>Cosmetic dentistry</option>
              <option>Emergency dental care</option>
            </select>
            <textarea name="message" placeholder="Tell us briefly what you would like help with" className="min-h-28 w-full rounded-lg border px-3 py-3" />
            <button disabled={loading} className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white">
              {loading ? "Sending..." : "Request consultation"}
            </button>
          </form>
          {status && <p className={`mt-4 rounded-lg p-3 text-sm ${sent ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{status}</p>}
          <p className="mt-3 text-[11px] text-slate-500">Demo only — no real patient information or appointment is created.</p>
        </div>
      </section>
    </main>
  );
}
