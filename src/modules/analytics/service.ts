import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leads, whatsappMessages } from "@/lib/db/schema";

export async function getLeadAnalytics(orgId: string) {
  const db = await getDb();
  const [totals, statuses, temperatures, sources, services, whatsapp] = await Promise.all([
    db.select({
      total: count(),
      avgScore: sql<number>`coalesce(avg(${leads.aiScore}), 0)`,
      qualified: sql<number>`count(*) filter (where ${leads.aiTemperature} is not null)`,
      won: sql<number>`count(*) filter (where ${leads.status} = 'won')`,
      lost: sql<number>`count(*) filter (where ${leads.status} = 'lost')`,
      contacted: sql<number>`count(*) filter (where ${leads.status} in ('contacted','qualified','won','lost'))`,
    }).from(leads).where(eq(leads.orgId, orgId)),
    db.select({ status: leads.status, count: count() }).from(leads).where(eq(leads.orgId, orgId)).groupBy(leads.status).orderBy(desc(count())),
    db.select({ temperature: leads.aiTemperature, count: count() }).from(leads).where(eq(leads.orgId, orgId)).groupBy(leads.aiTemperature).orderBy(desc(count())),
    db.select({ source: leads.source, count: count() }).from(leads).where(eq(leads.orgId, orgId)).groupBy(leads.source).orderBy(desc(count())),
    db.select({ service: leads.serviceNeeded, count: count() }).from(leads).where(and(eq(leads.orgId, orgId), isNotNull(leads.serviceNeeded))).groupBy(leads.serviceNeeded).orderBy(desc(count())).limit(10),
    db.select({
      inbound: sql<number>`count(*) filter (where ${whatsappMessages.direction} = 'inbound')`,
      outbound: sql<number>`count(*) filter (where ${whatsappMessages.direction} = 'outbound')`,
      sent: sql<number>`count(*) filter (where ${whatsappMessages.direction} = 'outbound' and ${whatsappMessages.status} in ('sent','simulated'))`,
    }).from(whatsappMessages).where(eq(whatsappMessages.orgId, orgId)),
  ]);

  const t = totals[0] ?? { total: 0, avgScore: 0, qualified: 0, won: 0, lost: 0, contacted: 0 };
  const total = Number(t.total);
  const won = Number(t.won);
  const contacted = Number(t.contacted);
  const qualified = Number(t.qualified);
  const inbound = Number(whatsapp[0]?.inbound ?? 0);

  return {
    totals: {
      total,
      avgScore: Number(t.avgScore ?? 0),
      qualificationRate: total ? Math.round((qualified / total) * 100) : 0,
      contactRate: total ? Math.round((contacted / total) * 100) : 0,
      winRate: total ? Math.round((won / total) * 100) : 0,
      won,
      lost: Number(t.lost),
    },
    statuses,
    temperatures,
    sources,
    services,
    whatsapp: {
      inbound,
      outbound: Number(whatsapp[0]?.outbound ?? 0),
      sent: Number(whatsapp[0]?.sent ?? 0),
      responseRate: inbound ? Math.min(100, Math.round((Number(whatsapp[0]?.outbound ?? 0) / inbound) * 100)) : 0,
    },
  };
}
