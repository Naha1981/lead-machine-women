"use client";

import * as React from "react";
import {
  Building2,
  Save,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Smartphone,
  Link2,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { INDUSTRIES } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const COLOR_SWATCHES = [
  "#059669",
  "#0d9488",
  "#0891b2",
  "#0f766e",
  "#db2777",
  "#ea580c",
  "#9333ea",
  "#ca8a04",
];

// ---------- Fake QR (SVG) ----------
function FakeQR() {
  // 21x21 grid with three corner finder patterns (like a real QR)
  const N = 21;
  const cells: boolean[] = [];
  // deterministic pseudo-random
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 8) & 1;
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // finder patterns at (0,0), (0,N-7), (N-7,0)
      const inFinder = (ox: number, oy: number) => {
        const dx = x - ox;
        const dy = y - oy;
        if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return null;
        if ((dx === 0 || dx === 6 || dy === 0 || dy === 6)) return true;
        if (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) return true;
        return false;
      };
      let v: boolean | null = inFinder(0, 0);
      if (v === null) v = inFinder(N - 7, 0);
      if (v === null) v = inFinder(0, N - 7);
      if (v === null) v = rand() === 1;
      cells.push(v);
    }
  }
  const cell = 10;
  const size = N * cell;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="size-56 rounded-lg bg-white p-2 shadow-sm"
      role="img"
      aria-label="QR code to scan with WhatsApp Business"
    >
      <rect width={size} height={size} fill="white" />
      {cells.map((on, i) => {
        if (!on) return null;
        const x = (i % N) * cell;
        const y = Math.floor(i / N) * cell;
        return <rect key={i} x={x} y={y} width={cell} height={cell} fill="#0f172a" />;
      })}
    </svg>
  );
}

// ---------- Business Profile ----------
function BusinessProfileCard() {
  const org = useAppStore((s) => s.org);
  const user = useAppStore((s) => s.user);
  const setSession = useAppStore((s) => s.setSession);

  const [name, setName] = React.useState(org?.name ?? "");
  const [industry, setIndustry] = React.useState(org?.industry ?? "other");
  const [services, setServices] = React.useState(org?.services ?? "");
  const [ownerPhone, setOwnerPhone] = React.useState(org?.ownerPhone ?? "");
  const [primaryColor, setPrimaryColor] = React.useState(
    org?.primaryColor ?? "#059669"
  );
  const [saving, setSaving] = React.useState(false);

  // sync if org loads late
  React.useEffect(() => {
    if (org) {
      setName(org.name);
      setIndustry(org.industry);
      setServices(org.services ?? "");
      setOwnerPhone(org.ownerPhone ?? "");
      setPrimaryColor(org.primaryColor ?? "#059669");
    }
  }, [org]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Business name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.updateOrg({
        name: name.trim(),
        industry,
        services,
        ownerPhone,
        primaryColor,
      });
      setSession(user, res.org);
      toast.success("Business profile saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-emerald-100 text-emerald-700">
            <Building2 className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base">Business Profile</CardTitle>
            <CardDescription className="text-xs">
              This info powers your website and AI lead qualification.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="biz-name" className="text-xs font-medium">
              Business Name
            </Label>
            <Input
              id="biz-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mthethwa Attorneys"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="biz-industry" className="text-xs font-medium">
              Industry
            </Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="biz-industry" className="w-full">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="biz-services" className="text-xs font-medium">
              Services (one per line)
            </Label>
            <Textarea
              id="biz-services"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              placeholder={"Consulting\nContract review\nLitigation"}
              className="min-h-24"
            />
            <p className="text-[11px] text-muted-foreground">
              Used by the AI to qualify leads and answer chats on your site.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="biz-phone" className="text-xs font-medium">
              Owner Phone (WhatsApp notifications)
            </Label>
            <Input
              id="biz-phone"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="+27 82 123 4567"
              inputMode="tel"
            />
            <p className="text-[11px] text-muted-foreground">
              Hot lead alerts are sent here. Format with country code.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Palette className="size-3.5" />
              Primary Color
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPrimaryColor(c)}
                  aria-label={`Choose color ${c}`}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    primaryColor.toLowerCase() === c.toLowerCase()
                      ? "border-slate-900 ring-2 ring-slate-200"
                      : "border-white ring-1 ring-slate-200 hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="ml-1 flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs">
                <span className="text-muted-foreground">Custom</span>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label="Custom primary color"
                />
                <span className="font-mono uppercase text-slate-600">
                  {primaryColor}
                </span>
              </label>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Save className="size-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------- WhatsApp Connection ----------
function WhatsAppConnectionCard() {
  const org = useAppStore((s) => s.org);
  const user = useAppStore((s) => s.user);
  const setSession = useAppStore((s) => s.setSession);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [whatsappNumber, setWhatsappNumber] = React.useState(org?.whatsappNumber ?? "");
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [pairingCode, setPairingCode] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [pairing, setPairing] = React.useState(false);

  React.useEffect(() => {
    if (org?.whatsappNumber) setWhatsappNumber(org.whatsappNumber);
  }, [org?.whatsappNumber]);

  React.useEffect(() => {
    if (!dialogOpen) return;
    let stopped = false;

    const poll = async () => {
      try {
        const [qr, status] = await Promise.all([
          apiClient.getWhatsappQr().catch(() => null),
          apiClient.getWhatsappStatus().catch(() => null),
        ]);
        if (stopped) return;
        if (status?.org) setSession(user, status.org);
        if (status?.status?.isConnected) {
          setDialogOpen(false);
          toast.success("WhatsApp connected");
          return;
        }
        if (qr?.qrCode) {
          setQrCode(qr.qrCode);
          setExpiresAt(qr.qrExpiresAt ?? null);
        }
      } catch {
        // transient polling failures are expected while the Operator reconnects
      }
    };

    void poll();
    const timer = window.setInterval(poll, 3000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [dialogOpen, setSession, user]);

  async function handleConnect() {
    setLoading(true);
    try {
      const result = await apiClient.startWhatsappConnection();
      setQrCode(null);
      setPairingCode(null);
      setExpiresAt(null);
      setDialogOpen(true);
      toast.success(result.status === "connected" ? "WhatsApp already connected" : "Waiting for WhatsApp QR");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start WhatsApp connection");
    } finally {
      setLoading(false);
    }
  }

  async function handlePairingCode() {
    if (!whatsappNumber.trim()) {
      toast.error("Enter the WhatsApp number in international format first");
      return;
    }
    setPairing(true);
    try {
      const result = await apiClient.requestWhatsappPairingCode(whatsappNumber.trim());
      setPairingCode(result.pairingCodeDisplay ?? result.pairingCode ?? null);
      setExpiresAt(result.expiresAt ?? null);
      setQrCode(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create pairing code");
    } finally {
      setPairing(false);
    }
  }

  async function handleDisconnect() {
    try {
      const res = await apiClient.disconnectWhatsapp();
      setSession(user, res.org);
      toast.success("WhatsApp disconnected");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to disconnect");
    }
  }

  const connected = !!org?.whatsappConnected;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-md bg-emerald-100 text-emerald-700">
              <MessageCircle className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp Connection</CardTitle>
              <CardDescription className="text-xs">
                Connect the business&apos;s own WhatsApp number for lead alerts, confirmations and follow-up.
              </CardDescription>
            </div>
          </div>
          {connected ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-amber-500" />
              Not connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <div className="rounded-md bg-emerald-50 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <Smartphone className="size-4" />
              Connected to <span className="font-mono">{org?.whatsappNumber || "your number"}</span>
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Lead alerts and approved follow-up messages can now use this number.
            </p>
          </div>
        ) : (
          <div className="rounded-md bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">WhatsApp is not connected yet</p>
            <p className="mt-1 text-xs text-amber-700">
              Connect the business number by scanning a real WhatsApp Linked Devices QR or using WhatsApp&apos;s phone-number pairing code.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="wa-number" className="text-xs font-medium">WhatsApp Business Number</Label>
          <Input
            id="wa-number"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+27 82 123 4567"
            inputMode="tel"
            disabled={connected}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleConnect}
            disabled={connected || loading}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <QrCode className="size-4" />
            {loading ? "Starting..." : "Connect with QR"}
          </Button>

          <Button
            variant="outline"
            onClick={() => { setDialogOpen(true); setPairingCode(null); void handlePairingCode(); }}
            disabled={connected || pairing}
          >
            <Smartphone className="size-4" />
            {pairing ? "Creating code..." : "Use phone number"}
          </Button>

          {connected && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              Disconnect
            </Button>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="size-5 text-emerald-600" />
                Connect WhatsApp
              </DialogTitle>
              <DialogDescription>
                Link the business owner&apos;s own WhatsApp account. Lead Machine never asks for the WhatsApp password.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-2">
              {qrCode ? (
                <img
                  src={qrCode}
                  alt="WhatsApp pairing QR code"
                  className="size-64 rounded-lg border bg-white p-2"
                />
              ) : pairingCode ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-8 py-6 text-center">
                  <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">Pairing code</p>
                  <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-slate-900">{pairingCode}</p>
                </div>
              ) : (
                <div className="flex size-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-muted-foreground">
                  Waiting for a fresh QR…
                </div>
              )}

              {expiresAt && (
                <p className="text-center text-xs text-muted-foreground">
                  Expires {new Date(expiresAt).toLocaleTimeString("en-ZA")}
                </p>
              )}

              {qrCode && (
                <p className="text-center text-xs text-muted-foreground">
                  WhatsApp → Linked Devices → Link a device → scan this code.
                </p>
              )}

              {pairingCode && (
                <p className="text-center text-xs text-muted-foreground">
                  WhatsApp → Linked Devices → Link with phone number instead → enter this code.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex items-start gap-2 rounded-md bg-slate-50 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p>
            WhatsApp transport is provided by the NahaLabs shared Operator. It uses WhatsApp Linked Devices and is not the official Meta Cloud API. POPIA consent is still captured for website leads.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Public Link ----------
function PublicLinkCard() {
  const org = useAppStore((s) => s.org);
  const openPublicSite = useAppStore((s) => s.openPublicSite);
  const [copied, setCopied] = React.useState(false);

  if (!org) return null;
  const url = `leadmachine.app/s/${org.slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`https://${url}`);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-emerald-100 text-emerald-700">
            <Link2 className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base">Public Website Link</CardTitle>
            <CardDescription className="text-xs">
              Share this link to start receiving leads.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="truncate font-mono text-sm text-slate-700">
            {url}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => openPublicSite(org.slug)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <ExternalLink className="size-4" />
            Open
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="size-4 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Main ----------
export function SettingsTab() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your business profile, WhatsApp connection, and public link.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BusinessProfileCard />
        <div className="space-y-5">
          <WhatsAppConnectionCard />
          <PublicLinkCard />
        </div>
      </div>
    </div>
  );
}
