"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Pencil, Plus, Sparkles, Trash } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ChatWindow } from "@/components/brain/chat-window";
import { ModePicker } from "@/components/brain/mode-picker";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client/fetcher";
import { timeAgo } from "@/lib/utils/format";
import { BRAIN_MODES } from "@/lib/utils/constants";
import type { Conversation } from "@/lib/types";

interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export default function BrainPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading Brain...</div>}>
      <BrainView />
    </Suspense>
  );
}

function BrainView() {
  const params = useSearchParams();
  useSession(); // keeps SessionProvider warm
  const router = useRouter();
  const queryMode = params.get("mode") ?? "global";
  const queryId = params.get("id");

  const { data: convData, refetch: refetchConversations } = useApi<{
    conversations: Conversation[];
  }>("/api/brain/conversations");
  const conversations = convData?.conversations ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<string>(queryMode);

  useEffect(() => {
    if (queryId) return;
    if (activeId) return;
    if (conversations.length === 0) return;
    setActiveId(conversations[0]!.id);
    setMode(conversations[0]!.brainMode);
  }, [conversations, queryId, activeId]);

  const { data: msgData } = useApi<{ messages: Message[] }>(
    activeId ? `/api/brain/conversations/${activeId}` : null,
  );
  const initialMessages = msgData?.messages ?? [];

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Seed a fresh conversation when arriving with ?id=. POSTs to the API so it
  // persists across reloads. The seed-once ref prevents the effect from
  // re-running after router.replace clears the params.
  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (!queryId) return;
    if (seededRef.current === queryId) return;
    seededRef.current = queryId;

    const contextRefs = contextRefsForMode(queryMode, queryId);

    (async () => {
      // Resolve a human-readable title from the actual entity (opportunity
      // title, creator name, niche label, etc.) so the sidebar shows
      // "Opportunity: Notion second-brain for indie SaaS founders" instead
      // of "Opportunity — opportunity_use…". Falls back to the ID if the
      // fetch fails so we never block conversation creation on a 404.
      const title = await resolveTitleForMode(queryMode, queryId);

      try {
        const res = await api.post<{ conversation: Conversation }>("/api/brain/conversations", {
          brainMode: queryMode,
          contextRefs,
          title,
        });
        if (res?.conversation) {
          setActiveId(res.conversation.id);
          setMode(queryMode);
          refetchConversations();
        }
      } catch (err) {
        toast.error("Couldn't create conversation: " + (err as Error).message);
      } finally {
        router.replace("/brain");
      }
    })();
  }, [queryId, queryMode, router, refetchConversations]);

  const active = conversations.find((c) => c.id === activeId);

  function startRename(c: Conversation) {
    setRenamingId(c.id);
    setRenameValue(c.title);
  }
  async function commitRename() {
    if (!renamingId) return;
    const newTitle = renameValue.trim();
    if (!newTitle) {
      setRenamingId(null);
      return;
    }
    try {
      await api.patch(`/api/brain/conversations/${renamingId}`, { title: newTitle });
      toast.success("Renamed");
      refetchConversations();
    } catch (err) {
      toast.error("Rename failed: " + (err as Error).message);
    } finally {
      setRenamingId(null);
    }
  }
  async function confirmDelete() {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    try {
      await api.delete(`/api/brain/conversations/${id}`);
      if (activeId === id) setActiveId(null);
      toast.success("Conversation deleted");
      refetchConversations();
    } catch (err) {
      toast.error("Delete failed: " + (err as Error).message);
    }
  }
  async function newConversation() {
    try {
      const res = await api.post<{ conversation: Conversation }>("/api/brain/conversations", {
        brainMode: mode,
        contextRefs: {},
        title: "Untitled conversation",
      });
      if (res?.conversation) {
        setActiveId(res.conversation.id);
        refetchConversations();
      }
    } catch (err) {
      toast.error("Couldn't create: " + (err as Error).message);
    }
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-3 lg:grid-cols-[260px_1fr]">
      <Card className="flex flex-col border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-slate-800 p-3">
          <span className="text-sm font-semibold">Conversations</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={newConversation}
            aria-label="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {conversations.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                No conversations. Start one with the +.
              </div>
            ) : null}
            {conversations.map((c) => {
              const selected = c.id === activeId;
              const modeMeta = BRAIN_MODES.find((m) => m.value === c.brainMode);
              const isRenaming = renamingId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group rounded-md border p-2 transition ${
                    selected
                      ? "border-primary/40 bg-primary/10"
                      : "border-transparent text-slate-300 hover:bg-slate-950"
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveId(c.id);
                      setMode(c.brainMode);
                    }}
                    className="block w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px] uppercase">
                        {modeMeta?.label ?? c.brainMode}
                      </Badge>
                      <span className="text-[10px] text-slate-500">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    {isRenaming ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={commitRename}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-7 border-slate-800 bg-slate-950 text-sm"
                      />
                    ) : (
                      <div className="mt-1 line-clamp-2 text-sm font-medium leading-tight">
                        {c.title}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500">{c.messageCount} messages</div>
                  </button>
                  {!isRenaming ? (
                    <div className="mt-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(c);
                        }}
                        aria-label="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-rose-300 hover:text-rose-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(c.id);
                        }}
                        aria-label="Delete"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex flex-col overflow-hidden border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-slate-800 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {active?.title ?? "New conversation"}
              </div>
              <div className="text-[11px] text-slate-500">
                {active ? `${active.messageCount} messages` : "Start a new chat"}
              </div>
            </div>
          </div>
          <ModePicker value={mode} onChange={setMode} />
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            key={active?.id ?? "empty"}
            initialMessages={initialMessages}
            mode={mode}
            conversationId={active?.id}
            contextRefs={active?.contextRefs as Record<string, unknown> | undefined}
            placeholder="Pressure-test an opportunity, draft a build plan, ask what to build next."
          />
        </div>
      </Card>

      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the chat history. The opportunities and signals it referenced are
              unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Builds the `contextRefs` payload in the shape that `brainMessageSchema`
 * (and the Anthropic context-assembler) actually expect: plural array
 * fields under specific keys. The previous version returned singular keys
 * like `opportunityId`, which Zod stripped silently — the assembler then
 * saw empty arrays and the AI was told "(no opportunities selected)",
 * which is the "di lumalabas yung pinindot" bug.
 *
 * Schema expects:
 *   opportunityIds: string[]
 *   productIds:     string[]
 *   creatorIds:     string[]
 *   niches:         string[]  (slugs from the niche enum)
 *   assetIds:       string[]  (resellable asset ids)
 */
function contextRefsForMode(mode: string, id: string): Record<string, string[]> {
  switch (mode) {
    case "opportunity":
    case "build_plan":
      return { opportunityIds: [id] };
    case "replicate":
      // Replicate is anchored on a source product but the assembler also
      // accepts an opportunity ref. Send both so either path resolves.
      return { opportunityIds: [id], productIds: [id] };
    case "creator":
      return { creatorIds: [id] };
    case "niche":
      // The route id IS the niche slug — pass it through.
      return { niches: [id] };
    case "dataset_review":
      return { assetIds: [id] };
    case "global":
    default:
      return {};
  }
}

function titleForMode(mode: string, id: string): string {
  // Synchronous fallback only — used when the entity fetch fails.
  const m = BRAIN_MODES.find((x) => x.value === mode);
  const shortId = id.length > 14 ? id.slice(0, 14) + "…" : id;
  return `${m?.label ?? "Review"} — ${shortId}`;
}

/**
 * Fetch the underlying entity (opportunity / creator / niche / product /
 * resellable asset) and build a sidebar-friendly title from its real name
 * instead of the raw ID. Falls back to titleForMode() if anything goes
 * wrong — a slow API or a 404 should never block conversation creation.
 *
 * Output format: "<Mode label>: <entity name>"
 *   e.g. "Opportunity: Notion second-brain for indie SaaS founders"
 *        "Creator: Sarah Chen (@sarahbuilds)"
 *        "Niche: Notion Templates"
 */
async function resolveTitleForMode(mode: string, id: string): Promise<string> {
  const modeLabel = BRAIN_MODES.find((x) => x.value === mode)?.label ?? "Review";
  const TITLE_MAX = 120;
  const trim = (s: string) => (s.length > TITLE_MAX ? s.slice(0, TITLE_MAX - 1) + "…" : s);

  try {
    switch (mode) {
      case "opportunity":
      case "build_plan": {
        const res = await api.get<{ opportunity: { title: string } }>(
          `/api/opportunities/${encodeURIComponent(id)}`,
        );
        if (res?.opportunity?.title) return trim(`${modeLabel}: ${res.opportunity.title}`);
        break;
      }
      case "replicate": {
        // Replicate can be anchored on either a product or an opportunity.
        // Try product first (the more common entry point); fall back to
        // opportunity. We deliberately don't surface 404 noise from the
        // first attempt — only the final failure falls through to the
        // catch.
        try {
          const res = await api.get<{ product: { title: string } }>(
            `/api/products/${encodeURIComponent(id)}`,
          );
          if (res?.product?.title) return trim(`${modeLabel}: ${res.product.title}`);
        } catch {
          /* try opportunity */
        }
        const res = await api.get<{ opportunity: { title: string } }>(
          `/api/opportunities/${encodeURIComponent(id)}`,
        );
        if (res?.opportunity?.title) return trim(`${modeLabel}: ${res.opportunity.title}`);
        break;
      }
      case "creator": {
        const res = await api.get<{
          creator: { displayName: string; handle: string };
        }>(`/api/creators/${encodeURIComponent(id)}`);
        if (res?.creator) {
          const name = res.creator.displayName || res.creator.handle;
          const handle = res.creator.handle ? ` (@${res.creator.handle})` : "";
          return trim(`${modeLabel}: ${name}${handle}`);
        }
        break;
      }
      case "niche": {
        const res = await api.get<{ niche: { label: string } }>(
          `/api/niches/${encodeURIComponent(id)}`,
        );
        if (res?.niche?.label) return trim(`${modeLabel}: ${res.niche.label}`);
        break;
      }
      case "dataset_review": {
        const res = await api.get<{ asset: { title: string } }>(
          `/api/resellable/${encodeURIComponent(id)}`,
        );
        if (res?.asset?.title) return trim(`${modeLabel}: ${res.asset.title}`);
        break;
      }
      default:
        break;
    }
  } catch {
    /* fall through to sync fallback */
  }
  return titleForMode(mode, id);
}
