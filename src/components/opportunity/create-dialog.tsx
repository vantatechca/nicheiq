"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  NICHE_LIST,
  OPPORTUNITY_TYPES,
  BUILD_EFFORTS,
} from "@/lib/utils/constants";

export function OpportunityCreateDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [niche, setNiche] = useState<string>(NICHE_LIST[0]!.value);
  const [opportunityType, setOpportunityType] = useState<string>(OPPORTUNITY_TYPES[0]!.value);
  const [buildEffort, setBuildEffort] = useState<string>(BUILD_EFFORTS[0]!.value);
  const [revenue, setRevenue] = useState<string>("");

  function reset() {
    setTitle("");
    setSummary("");
    setNiche(NICHE_LIST[0]!.value);
    setOpportunityType(OPPORTUNITY_TYPES[0]!.value);
    setBuildEffort(BUILD_EFFORTS[0]!.value);
    setRevenue("");
  }

  async function submit() {
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters.");
      return;
    }
    if (summary.trim().length < 10) {
      toast.error("Summary needs at least 10 characters.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          niche,
          opportunityType,
          buildEffort,
          projectedRevenueUsd: revenue ? Number(revenue) : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: { opportunity: { id: string } } };
      toast.success("Opportunity created.");
      reset();
      setOpen(false);
      router.push(`/opportunities/${json.data.opportunity.id}`);
    } catch (err) {
      toast.error(`Create failed: ${(err as Error).message}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add manually
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New opportunity</DialogTitle>
          <DialogDescription>
            Manually track an opportunity. The Brain will score it and surface related signals next pass.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="opp-title">Title</Label>
            <Input
              id="opp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notion second-brain for indie SaaS founders"
              className="border-slate-800 bg-slate-950"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="opp-summary">Summary</Label>
            <Textarea
              id="opp-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="What it is, who it's for, the demand wedge."
              className="border-slate-800 bg-slate-950"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Niche</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="border-slate-800 bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_LIST.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={opportunityType} onValueChange={setOpportunityType}>
                <SelectTrigger className="border-slate-800 bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Build effort</Label>
              <Select value={buildEffort} onValueChange={setBuildEffort}>
                <SelectTrigger className="border-slate-800 bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUILD_EFFORTS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="opp-rev">Projected revenue (USD)</Label>
              <Input
                id="opp-rev"
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="2000"
                className="border-slate-800 bg-slate-950"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
