"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOURCE_PLATFORMS } from "@/lib/utils/constants";
import { api } from "@/lib/api-client/fetcher";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  opportunityTitle: string;
  /** Called with the launch result when the user confirms successfully.
   *  Receives the new product id so the parent can re-fetch / route. */
  onLaunched?: (result: { productId: string; opportunityId: string }) => void;
}

// Only show platforms a creator would realistically launch on. Filtering
// out things like Reddit / HN / Google Trends that are signal sources,
// not selling channels.
const LAUNCH_PLATFORMS = SOURCE_PLATFORMS.filter((p) => p.category === "marketplace");

export function LaunchProductDialog({
  open,
  onOpenChange,
  opportunityId,
  opportunityTitle,
  onLaunched,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [launchUrl, setLaunchUrl] = useState("");
  const [platform, setPlatform] = useState<string>(LAUNCH_PLATFORMS[0]!.value);
  const [titleOverride, setTitleOverride] = useState("");
  const [priceStr, setPriceStr] = useState("");

  function reset() {
    setLaunchUrl("");
    setPlatform(LAUNCH_PLATFORMS[0]!.value);
    setTitleOverride("");
    setPriceStr("");
  }

  async function submit() {
    const url = launchUrl.trim();
    if (!url) {
      toast.error("Launch URL is required");
      return;
    }
    try {
      // Cheap front-end URL sanity check before hitting the server's
      // stricter Zod parse.
      new URL(url);
    } catch {
      toast.error("That doesn't look like a valid URL");
      return;
    }

    const priceNum = priceStr.trim() ? Number(priceStr) : undefined;
    if (priceNum !== undefined && (!Number.isFinite(priceNum) || priceNum < 0)) {
      toast.error("Price must be a non-negative number");
      return;
    }

    setPending(true);
    try {
      const res = await api.post<{
        product: { id: string; title: string };
        opportunity: { id: string };
        alreadyLaunched: boolean;
      }>(`/api/opportunities/${opportunityId}/launch`, {
        launchUrl: url,
        sourcePlatform: platform,
        title: titleOverride.trim() || undefined,
        priceUsd: priceNum,
      });

      if (!res?.product) throw new Error("Empty response");
      toast.success(res.alreadyLaunched ? "Already launched" : "Launched", {
        description: res.product.title,
        action: {
          label: "Open product",
          onClick: () => router.push(`/products/${res.product.id}`),
        },
      });
      onLaunched?.({ productId: res.product.id, opportunityId });
      reset();
      onOpenChange(false);
      // Soft refresh so the opportunity detail page reflects the new
      // status without a full reload.
      router.refresh();
    } catch (err) {
      toast.error("Launch failed: " + (err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-emerald-400" /> Launch product
          </DialogTitle>
          <DialogDescription>
            Graduate this opportunity into a tracked product in your portfolio. The opportunity
            moves to <code className="rounded bg-slate-800 px-1">launched</code> and a new product
            row gets created linked back to it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="launch-url" className="text-xs">
              Launch URL
            </Label>
            <Input
              id="launch-url"
              autoFocus
              value={launchUrl}
              onChange={(e) => setLaunchUrl(e.target.value)}
              placeholder="https://gumroad.com/l/your-product"
              className="h-9 border-slate-800 bg-slate-950 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="launch-platform" className="text-xs">
              Platform
            </Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger
                id="launch-platform"
                className="h-9 border-slate-800 bg-slate-950 text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAUNCH_PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.icon} {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="launch-title" className="text-xs">
              Title <span className="text-slate-500">(defaults to opportunity title)</span>
            </Label>
            <Input
              id="launch-title"
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
              placeholder={opportunityTitle}
              className="h-9 border-slate-800 bg-slate-950 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="launch-price" className="text-xs">
              Price USD <span className="text-slate-500">(optional)</span>
            </Label>
            <Input
              id="launch-price"
              type="number"
              min={0}
              step="0.01"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="29"
              className="h-9 border-slate-800 bg-slate-950 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !launchUrl.trim()}>
            {pending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-1 h-4 w-4" />
            )}
            Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
