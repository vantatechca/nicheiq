"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { mockConversations, messagesFor } from "@/mock/data";
import { timeAgo } from "@/lib/utils/format";
import { BRAIN_MODES } from "@/lib/utils/constants";
import type { Conversation } from "@/lib/types";

export default function BrainPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading Brain…</div>}>
      <BrainView />
    </Suspense>
  );
}

function BrainView() {
  const params = useSearchParams();
  const queryMode = params.get("mode") ?? "global";

  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [mode, setMode] = useState(queryMode);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const active = conversations.find((c) => c.id === activeId);
  const initialMessages = active ? messagesFor(active.id) : [];

  function startRename(c: Conversation) {
    setRenamingId(c.id);
    setRenameValue(c.title);
  }
  function commitRename() {
    if (!renamingId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === renamingId ? { ...c, title: renameValue.trim() || c.title } : c)),
    );
    setRenamingId(null);
    toast.success("Renamed");
  }
  function confirmDelete() {
    if (!deletingId) return;
    setConversations((prev) => prev.filter((c) => c.id !== deletingId));
    if (activeId === deletingId) setActiveId(null);
    setDeletingId(null);
    toast.success("Conversation deleted");
  }
  function newConversation() {
    const id = `conv_local_${Date.now()}`;
    const fresh: Conversation = {
      id,
      userId: "user_andrei",
      brainMode: mode,
      contextRefs: {},
      title: "Untitled conversation",
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
    };
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(id);
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-3 lg:grid-cols-[260px_1fr]">
      <Card className="flex flex-col border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-slate-800 p-3">
          <span className="text-sm font-semibold">Conversations</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={newConversation} aria-label="New conversation">
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
                      <div className="mt-1 line-clamp-2 text-sm font-medium leading-tight">{c.title}</div>
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
            initialMessages={initialMessages}
            mode={mode}
            conversationId={active?.id}
            contextRefs={active?.contextRefs}
            placeholder="Pressure-test an opportunity, draft a build plan, ask 'what should I build next?'"
          />
        </div>
      </Card>

      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the chat history. The opportunities and signals it referenced are unaffected.
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
