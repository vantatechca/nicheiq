"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatWindow } from "@/components/brain/chat-window";
import { ModePicker } from "@/components/brain/mode-picker";
import { mockConversations, messagesFor } from "@/mock/data";
import { timeAgo } from "@/lib/utils/format";
import { BRAIN_MODES } from "@/lib/utils/constants";

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
  const [activeId, setActiveId] = useState<string | null>(mockConversations[0]?.id ?? null);
  const [mode, setMode] = useState(queryMode);

  const active = mockConversations.find((c) => c.id === activeId);
  const initialMessages = active ? messagesFor(active.id) : [];

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-3 lg:grid-cols-[260px_1fr]">
      <Card className="flex flex-col border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-slate-800 p-3">
          <span className="text-sm font-semibold">Conversations</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setActiveId(null)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {mockConversations.map((c) => {
              const selected = c.id === activeId;
              const modeMeta = BRAIN_MODES.find((m) => m.value === c.brainMode);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    setMode(c.brainMode);
                  }}
                  className={`w-full rounded-md border p-2 text-left text-xs transition ${
                    selected
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-transparent text-slate-300 hover:bg-slate-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {modeMeta?.label ?? c.brainMode}
                    </Badge>
                    <span className="text-[10px] text-slate-500">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium leading-tight">{c.title}</div>
                  <div className="text-[10px] text-slate-500">{c.messageCount} messages</div>
                </button>
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
    </div>
  );
}
