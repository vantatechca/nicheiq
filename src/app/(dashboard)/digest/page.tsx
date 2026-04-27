"use client";

import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { mockDigests } from "@/mock/data";
import { formatDate, formatUsd, timeAgo } from "@/lib/utils/format";

export default function DigestPage() {
  const daily = mockDigests.filter((d) => d.cadence === "daily");
  const weekly = mockDigests.filter((d) => d.cadence === "weekly");
  return (
    <>
      <PageHeader
        title="Digest"
        description="Daily and weekly synthesis from the Brain."
        actions={
          <Button size="sm">
            <Sparkles className="mr-1 h-4 w-4" /> Generate now
          </Button>
        }
      />

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily ({daily.length})</TabsTrigger>
          <TabsTrigger value="weekly">Weekly ({weekly.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="grid gap-3 lg:grid-cols-2">
          {daily.map((d) => (
            <DigestCard key={d.id} digest={d} />
          ))}
        </TabsContent>
        <TabsContent value="weekly" className="grid gap-3 lg:grid-cols-2">
          {weekly.map((d) => (
            <DigestCard key={d.id} digest={d} />
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}

function DigestCard({ digest }: { digest: (typeof mockDigests)[number] }) {
  return (
    <Card className="border-slate-800 bg-slate-900/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {formatDate(digest.periodStart, "MMM d")} – {formatDate(digest.periodEnd, "MMM d")}
          </CardTitle>
          <Badge variant="info" className="capitalize">
            {digest.cadence}
          </Badge>
        </div>
        <CardDescription>{timeAgo(digest.createdAt)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-slate-300">{digest.aiSummary}</p>
        <div>
          <div className="text-xs uppercase text-slate-500">Top opportunities</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {digest.topOpportunityIds.map((id) => (
              <Link
                key={id}
                href={`/opportunities/${id}`}
                className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono hover:bg-slate-700"
              >
                {id}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500">Rising niches</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {digest.risingNiches.map((n) => (
              <Badge key={n} variant="outline" className="text-[10px]">
                {n.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500">Top products</div>
          <ul className="mt-1 space-y-1">
            {digest.topProducts.map((p) => (
              <li key={p.id} className="flex justify-between rounded-md bg-slate-950/40 px-2 py-1 text-xs">
                <span className="line-clamp-1">{p.title}</span>
                <span className="text-emerald-400">{formatUsd(p.revenue, { compact: true })}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            <Mail className="mr-1 inline h-3 w-3" /> sent to {digest.sentTo.length} {digest.sentTo.length === 1 ? "recipient" : "recipients"}
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs">
            Resend
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
