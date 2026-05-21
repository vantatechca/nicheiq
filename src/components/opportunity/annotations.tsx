"use client";

// Annotations thread for an opportunity. Fetches the real thread from
// GET /api/opportunities/:id/annotations on mount, and POSTs new notes.
// (Previously it never fetched, and fell back to a hardcoded mock seed note
//  when no `initial` prop was passed — so live mode showed a fake note and
//  never loaded saved ones.)

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/utils/format";

interface Annotation {
  id: string;
  userName: string;
  userInitials: string;
  body: string;
  createdAt: string;
}

// Raw row shape from the API (the DB stores userId + body + createdAt).
interface ApiAnnotation {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
}

interface Props {
  opportunityId: string;
}

function toView(a: ApiAnnotation): Annotation {
  // userId is an email or id; show whatever is most human, derive initials from it.
  const name = a.userId.includes("@") ? a.userId.split("@")[0]! : a.userId;
  return {
    id: a.id,
    userName: name,
    userInitials: initials(name),
    body: a.body,
    createdAt: a.createdAt,
  };
}

export function AnnotationsThread({ opportunityId }: Props) {
  const { data: session } = useSession();
  const [items, setItems] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  // Load the real thread on mount.
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    fetch(`/api/opportunities/${opportunityId}/annotations`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ data: { annotations: ApiAnnotation[] } }>;
      })
      .then((json) => {
        if (!ac.signal.aborted) setItems(json.data.annotations.map(toView));
      })
      .catch((err) => {
        if (!ac.signal.aborted && err.name !== "AbortError") {
          toast.error(`Couldn't load notes: ${(err as Error).message}`);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [opportunityId]);

  async function submit() {
    const trimmed = body.trim();
    if (trimmed.length < 1) {
      toast.error("Annotation cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Annotation too long (max 2000 chars).");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/annotations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        data: { annotation: { id: string; createdAt: string } };
      };
      const userName = session?.user?.name ?? session?.user?.email ?? "You";
      setItems((prev) => [
        {
          id: json.data.annotation.id,
          userName,
          userInitials: initials(userName),
          body: trimmed,
          createdAt: json.data.annotation.createdAt,
        },
        ...prev,
      ]);
      setBody("");
      toast.success("Annotation saved");
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a note: hypothesis, blocker, decision…"
          className="border-slate-800 bg-slate-950"
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">{body.length}/2000</span>
          <Button size="sm" onClick={submit} disabled={pending || body.trim().length === 0}>
            {pending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Send className="h-3 w-3" /> Add note
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="rounded-md border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
            Loading notes…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
            No notes yet. First one above ↑
          </div>
        ) : null}
        {items.map((a) => (
          <div key={a.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-slate-800 text-[10px]">
                  {a.userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-slate-200">{a.userName}</span>
              <span className="text-[10px] text-slate-500">{timeAgo(a.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}