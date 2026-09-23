"use client";

import * as React from "react";
import { TrendingUp, Users, Target, MessageCircle, Trophy, Activity } from "lucide-react";
import { apiClient, useAsync } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsTab() {
  const { data, loading, error } = useAsync(() => apiClient.getAnalytics(), []);

  if (loading) {
    return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;
  }

  if (error || !data) {
    return <Card><CardContent className="p-6 text-sm text-rose-600">{error ?? "Analytics unavailable"}</CardContent></Card>;
  }

  const t = data.totals;
  const cards = [
    { label: "Total leads", value: t.total, icon: Users },
    { label: "Qualified", value: `${t.qualificationRate}%`, icon: Target },
    { label: "Won", value: t.won, icon: Trophy },
    { label: "Win rate", value: `${t.winRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Analytics</h2>
        <p className="text-sm text-muted-foreground">See where leads come from, how they move, and what converts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return <Card key={c.label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{c.label}</p><p className="mt-1 text-2xl font-semibold">{c.value}</p></div><div className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Icon className="size-5" /></div></CardContent></Card>;
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.statuses.map((x: any) => <div key={x.status} className="flex items-center justify-between text-sm"><span className="capitalize">{x.status}</span><Badge variant="secondary">{x.count}</Badge></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lead temperature</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.temperatures.filter((x: any) => x.temperature).map((x: any) => <div key={x.temperature} className="flex items-center justify-between text-sm"><span className="capitalize">{x.temperature}</span><Badge variant="secondary">{x.count}</Badge></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">WhatsApp</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm"><MessageCircle className="size-4 text-emerald-600" /> {data.whatsapp.inbound} inbound</div>
            <div className="flex items-center gap-2 text-sm"><Activity className="size-4 text-sky-600" /> {data.whatsapp.outbound} outbound</div>
            <p className="text-xs text-muted-foreground">Response activity: {data.whatsapp.responseRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Lead sources</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.sources.length === 0 ? <p className="text-sm text-muted-foreground">No source data yet.</p> : data.sources.map((x: any) => <div key={x.source} className="flex items-center justify-between text-sm"><span>{x.source}</span><span className="font-semibold">{x.count}</span></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top requested services</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.services.length === 0 ? <p className="text-sm text-muted-foreground">No service data yet.</p> : data.services.map((x: any) => <div key={x.service} className="flex items-center justify-between text-sm"><span className="truncate pr-4">{x.service}</span><span className="font-semibold">{x.count}</span></div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
