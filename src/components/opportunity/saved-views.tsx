"use client";

import { useState } from "react";
import { Bookmark, BookmarkPlus, Trash } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

export interface OpportunityFilters {
  niche: string | null;
  type: string | null;
  effort: string | null;
  status: string | null;
  minScore: number;
  search: string;
  sort: "score" | "newest" | "revenue";
}

interface SavedView {
  id: string;
  name: string;
  filters: OpportunityFilters;
  createdAt: string;
}

interface Props {
  current: OpportunityFilters;
  onLoad: (filters: OpportunityFilters) => void;
}

export function SavedViews({ current, onLoad }: Props) {
  const [views, setViews] = useLocalStorage<SavedView[]>("nicheiq:opportunity-views", []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function save() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Name needs at least 2 characters");
      return;
    }
    const id = `view_${Date.now()}`;
    setViews((prev) => [{ id, name: trimmed, filters: current, createdAt: new Date().toISOString() }, ...prev]);
    setName("");
    setOpen(false);
    toast.success(`View "${trimmed}" saved`);
  }

  function remove(id: string) {
    setViews((prev) => prev.filter((v) => v.id !== id));
    toast.success("View removed");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Bookmark className="mr-1 h-4 w-4" /> Views
            {views.length > 0 ? (
              <span className="ml-1 rounded bg-slate-800 px-1 text-[10px]">{views.length}</span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {views.length === 0 ? (
            <div className="px-2 py-3 text-xs text-slate-400">
              No saved views yet. Save the current filter combo to recall it later.
            </div>
          ) : null}
          {views.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onSelect={(e) => {
                e.preventDefault();
                onLoad(v.filters);
                toast.success(`Loaded "${v.name}"`);
              }}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="truncate">{v.name}</span>
                <button
                  className="rounded p-0.5 text-slate-500 hover:text-rose-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v.id);
                  }}
                  aria-label="Remove view"
                >
                  <Trash className="h-3 w-3" />
                </button>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
            <BookmarkPlus className="h-4 w-4" /> Save current filters…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save filter view</DialogTitle>
            <DialogDescription>
              Stored locally — these views are per-browser and don't sync across devices.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder='e.g. "Weekend bets ≥80"'
            autoFocus
            className="border-slate-800 bg-slate-950"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save view</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
