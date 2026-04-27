"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { mockGoldenRules, mockFeedbackPatterns } from "@/mock/data";
import { timeAgo } from "@/lib/utils/format";

export default function RulesPage() {
  const [rules, setRules] = useState(mockGoldenRules);

  function toggle(id: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    toast.success("Rule toggled");
  }

  return (
    <>
      <PageHeader
        title="Golden rules"
        description={`${rules.filter((r) => r.active).length} active · ${rules.length} total`}
        actions={
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> New rule
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {rules.map((r) => (
            <Card key={r.id} className="border-slate-800 bg-slate-900/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          r.ruleType === "block"
                            ? "destructive"
                            : r.ruleType === "boost"
                            ? "success"
                            : r.ruleType === "penalize"
                            ? "warning"
                            : "info"
                        }
                      >
                        {r.ruleType}
                      </Badge>
                      <span className="text-sm font-medium">{r.label}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        w {r.weight}
                      </Badge>
                      {r.niche ? (
                        <Badge variant="outline" className="text-[10px]">
                          {r.niche.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{r.description}</div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                      {r.keywords.map((k) => (
                        <code key={k} className="rounded bg-slate-800 px-1 py-0.5 font-mono text-slate-300">
                          {k}
                        </code>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500">created {timeAgo(r.createdAt)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch checked={r.active} onCheckedChange={() => toggle(r.id)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-violet-400" /> Suggested rules
              </CardTitle>
              <CardDescription>Derived from your votes/saves/builds.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockFeedbackPatterns.map((p) => (
                <div key={p.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{p.label}</span>
                    <Badge variant="violet" className="text-[10px] font-mono">
                      {(p.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="mt-1 text-slate-500">{p.description}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase text-slate-500">{p.derivedFrom}</span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs">
                      Promote to rule
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base">Test a new rule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Label…" className="h-8 border-slate-800 bg-slate-950" />
              <Input placeholder="Keywords (comma)…" className="h-8 border-slate-800 bg-slate-950" />
              <Button size="sm" className="w-full" onClick={() => toast.info("Rule preview not wired yet")}>
                Preview impact
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
