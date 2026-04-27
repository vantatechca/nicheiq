"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data } = useSession();
  const user = data?.user;

  return (
    <>
      <PageHeader title="Settings" description="Profile, AI preferences, notifications, data export." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Linked to your NextAuth session.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input defaultValue={user?.name ?? ""} className="border-slate-800 bg-slate-950" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input defaultValue={user?.email ?? ""} disabled className="border-slate-800 bg-slate-950" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Role</Label>
                <Badge variant="outline">{user?.role ?? "viewer"}</Badge>
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => toast.success("Profile saved (mock)")}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>AI tier preferences</CardTitle>
              <CardDescription>Pick a model per task tier. Tier 3 spending is capped daily.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { tier: "Tier 1 (bulk classify)", default: "openrouter/qwen-2.5", note: "≤ $0.10 / 1M tokens" },
                { tier: "Tier 2 (analysis)", default: "anthropic/claude-haiku-4.5", note: "Per-product enrichment" },
                { tier: "Tier 3 (strategic)", default: "anthropic/claude-sonnet-4", note: "Brain chat + digests · capped at $5/day" },
              ].map((t) => (
                <div key={t.tier} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 p-3">
                  <div>
                    <div className="text-sm font-medium">{t.tier}</div>
                    <div className="text-xs text-slate-500">{t.note}</div>
                  </div>
                  <code className="rounded bg-slate-800 px-2 py-1 text-xs">{t.default}</code>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <div>
                  <div className="text-sm font-medium">Daily AI spend cap</div>
                  <div className="text-xs text-slate-500">Refuses tier-3 calls above this amount.</div>
                </div>
                <Input type="number" defaultValue={5} className="w-28 border-slate-800 bg-slate-900" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Daily digest email",
                "Weekly digest email",
                "New opportunity ≥ score 80",
                "Score change ±10 points",
                "Crawl error",
                "PLR license needs review",
              ].map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle>Data export</CardTitle>
              <CardDescription>JSON snapshot of opportunities, products, signals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" onClick={() => toast.success("Export queued (mock)")}>
                Export everything (.json)
              </Button>
              <Button variant="outline" onClick={() => toast.success("CSV export queued (mock)")}>
                Export opportunities (.csv)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
