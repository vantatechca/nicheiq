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
  const { data: session } = useSession();
  const router = useRouter();
  const queryMode = params.get("mode") ?? "global";
  const queryId = params.get("id");

  // Fetch conversation list from API.
  const { data: convData, refetch: refetchConversations } = useApi<{
    conversations: Conversation[];
  }>("/api/brain/conversations");
  const conversations = convData?.conversations ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<string>(queryMode);

  // Once conversations load, pick the first one (if not arriving with ?id=).
  useEffect(() => {
    if (queryId) return; // seeding path will set it
    if (activeId) return; // already chose
    if (conversations.length === 0) return;
    setActiveId(conversations[0]!.id);
    setMode(conversations[0]!.brainMode);
  }, [conversations, queryId, activeId]);

  // Fetch messages for the active conversation.
  const { data: msgData } = useApi<{ messages: Message[] }>(
    activeId ? `/api/brain/conversations/${activeId}` : null,
  );
  const initialMessages = msgData?.messages ?? [];

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Seed a fresh conversation when arriving with ?id=. POSTs to the API so it
  // persists across reloads.
  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (!queryId) return;
    if (seededRef.current === queryId) return;
    seededRef.current = queryId;

    const contextRefs = contextRefsForMode(queryMode, queryId);
    const title = titleForMode(queryMode, queryId);

    (async () => {
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
            contextRefs={active?.contextRefs}
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

function contextRefsForMode(mode: string, id: string): Record<string, string> {
  switch (mode) {
    case "dataset_review":
      return { resellableAssetId: id };
    case "opportunity":
      return { opportunityId: id };
    case "niche":
      return { nicheId: id };
    case "creator":
      return { creatorId: id };
    case "replicate":
      return { sourceProductId: id };
    case "build_plan":
      return { opportunityId: id };
    default:
      return { id };
  }
}

function titleForMode(mode: string, id: string): string {
  const m = BRAIN_MODES.find((x) => x.value === mode);
  return (m?.label ?? "Review") + " - " + id.slice(0, 12);
}
