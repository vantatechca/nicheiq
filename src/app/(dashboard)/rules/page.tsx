"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client/fetcher";
import { timeAgo } from "@/lib/utils/format";

const RULE_TYPES = [
  { value: "boost", label: "Boost" },
  { value: "require", label: "Require" },
  { value: "penalize", label: "Penalize" },
  { value: "block", label: "Block" },
] as const;
type RuleTypeValue = (typeof RULE_TYPES)[number]["value"];

interface GoldenRule {
  id: string;
  ruleType: "block" | "boost" | "penalize" | "require";
  label: string;
  description: string;
  keywords: string[];
  niche: string | null;
  weight: number;
  active: boolean;
  createdAt: string;
}

interface FeedbackPattern {
  id: string;
  label: string;
  description: string;
  confidence: number;
  derivedFrom: string;
}

export default function RulesPage() {
  // Initial fetch + refetch on demand.
  const {
    data: rulesData,
    error: rulesError,
    refetch: refetchRules,
  } = useApi<{ rules: GoldenRule[] }>("/api/rules");
  // NOTE: the endpoint returns { suggestions }, not { patterns }.
  const { data: patternsData } = useApi<{ suggestions: FeedbackPattern[] }>(
    "/api/rules/suggestions",
  );

  // Local optimistic state — flips immediately on toggle, then API patches in
  // the background. Falls back to the server value on refetch.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const rawRules = rulesData?.rules ?? [];
  const rules = rawRules.map((r) => ({
    ...r,
    active: optimistic[r.id] ?? r.active,
  }));
  const patterns = patternsData?.suggestions ?? [];

  // Create-rule dialog state.
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ruleType, setRuleType] = useState<RuleTypeValue>("boost");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [weight, setWeight] = useState("0.5");

  function resetForm() {
    setRuleType("boost");
    setLabel("");
    setDescription("");
    setKeywords("");
    setWeight("0.5");
  }

  // "Test a new rule" preview panel — separate lightweight inputs.
  const [previewLabel, setPreviewLabel] = useState("");
  const [previewKeywords, setPreviewKeywords] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    total: number;
    matched: number;
    avgDelta: number;
  } | null>(null);

  async function runPreview() {
    const kws = previewKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (previewLabel.trim().length < 2 || kws.length === 0) {
      toast.error("Add a label and at least one keyword");
      return;
    }
    setPreviewing(true);
    try {
      const res = await api.post<{
        preview: { total: number; matched: number; avgDelta: number };
      }>("/api/rules/preview", {
        label: previewLabel.trim(),
        ruleType: "boost",
        keywords: kws,
        weight: 0.5,
        active: true,
      });
      setPreviewResult(res.preview);
    } catch (err) {
      toast.error((err as Error).message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  // Open the dialog pre-filled from an AI suggestion ("Promote to rule").
  function promote(p: FeedbackPattern) {
    setRuleType("boost");
    setLabel(p.label);
    setDescription(p.description);
    setKeywords("");
    setWeight("0.5");
    setOpen(true);
  }

  async function createRule() {
    if (label.trim().length < 2) {
      toast.error("Label needs at least 2 characters");
      return;
    }
    const w = Number(weight);
    if (Number.isNaN(w) || w < 0 || w > 1) {
      toast.error("Weight must be between 0 and 1");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/rules", {
        label: label.trim(),
        description: description.trim() || undefined,
        ruleType,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        weight: w,
        active: true,
      });
      toast.success(`Rule "${label.trim()}" created`);
      resetForm();
      setOpen(false);
      refetchRules();
    } catch (err) {
      toast.error((err as Error).message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, currentActive: boolean) {
    const next = !currentActive;
    // Flip locally first so the UI responds instantly.
    setOptimistic((prev) => ({ ...prev, [id]: next }));
    try {
      await api.patch(`/api/rules/${id}`, { active: next });
      toast.success(next ? "Rule activated" : "Rule deactivated");
    } catch (err) {
      // Roll back optimistic flip if the API rejects.
      setOptimistic((prev) => ({ ...prev, [id]: currentActive }));
      toast.error((err as Error).message || "Toggle failed");
    } finally {
      // Pull fresh server state to clear our optimistic override.
      refetchRules();
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule? This cannot be undone.")) return;
    try {
      await api.delete(`/api/rules/${id}`);
      toast.success("Rule deleted");
      refetchRules();
    } catch (err) {
      toast.error((err as Error).message || "Delete failed");
    }
  }

  const activeCount = rules.filter((r) => r.active).length;

  return (
    <>
      <PageHeader
        title="Golden rules"
        description={`${activeCount} active · ${rules.length} total`}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New rule
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {rulesError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-8 text-center text-sm text-destructive">
              Couldn&apos;t load rules: {rulesError.message} ({rulesError.status || "network error"}
              ).{" "}
              <button onClick={refetchRules} className="underline">
                Retry
              </button>
            </div>
          )}
          {!rulesError && rules.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
              No rules yet. Create one to start shaping your feed.
            </div>
          )}
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
                      <Badge variant="outline" className="font-mono text-[10px]">
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
                        <code
                          key={k}
                          className="rounded bg-slate-800 px-1 py-0.5 font-mono text-slate-300"
                        >
                          {k}
                        </code>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500">
                      created {timeAgo(r.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch checked={r.active} onCheckedChange={() => toggle(r.id, r.active)} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteRule(r.id)}
                    >
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
              {patterns.length === 0 && (
                <div className="text-xs text-slate-500">
                  No suggestions yet. Vote and save more to see patterns emerge.
                </div>
              )}
              {patterns.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{p.label}</span>
                    <Badge variant="violet" className="font-mono text-[10px]">
                      {(p.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="mt-1 text-slate-500">{p.description}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase text-slate-500">{p.derivedFrom}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => promote(p)}
                    >
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
              <CardDescription>
                See how a boost rule would affect your opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Label…"
                value={previewLabel}
                onChange={(e) => setPreviewLabel(e.target.value)}
                className="h-8 border-slate-800 bg-slate-950"
              />
              <Input
                placeholder="Keywords (comma)…"
                value={previewKeywords}
                onChange={(e) => setPreviewKeywords(e.target.value)}
                className="h-8 border-slate-800 bg-slate-950"
              />
              <Button size="sm" className="w-full" disabled={previewing} onClick={runPreview}>
                {previewing ? "Calculating…" : "Preview impact"}
              </Button>
              {previewResult && (
                <div className="rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-300">
                  <div>
                    Matches{" "}
                    <span className="font-mono text-slate-100">{previewResult.matched}</span> of{" "}
                    {previewResult.total} opportunities
                  </div>
                  <div>
                    Avg score change:{" "}
                    <span
                      className={previewResult.avgDelta >= 0 ? "text-emerald-400" : "text-red-400"}
                    >
                      {previewResult.avgDelta >= 0 ? "+" : ""}
                      {previewResult.avgDelta}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) resetForm();
          setOpen(o);
        }}
      >
        <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New golden rule</DialogTitle>
            <DialogDescription>
              Rules shape scoring: boost or require what you want to see, penalize or block what you
              don&apos;t. Matched against opportunity title, summary, niche, and rationale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleTypeValue)}>
                  <SelectTrigger className="border-slate-800 bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Weight (0–1)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1}
                  step={0.05}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="border-slate-800 bg-slate-950"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder='e.g. "Boost AI agent tools"'
                className="border-slate-800 bg-slate-950"
              />
            </div>
            <div className="space-y-1">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="ai agent, autonomous, copilot"
                className="border-slate-800 bg-slate-950"
              />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why this rule exists"
                className="border-slate-800 bg-slate-950"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={createRule} disabled={saving}>
              {saving ? "Creating…" : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
