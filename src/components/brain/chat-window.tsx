"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link as LinkIcon, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useBrainChat } from "@/lib/hooks/use-brain-chat";
import type { Message } from "@/lib/types";

interface Props {
  initialMessages?: Message[];
  mode: string;
  conversationId?: string;
  contextRefs?: Record<string, unknown>;
  placeholder?: string;
}

interface ContextChip {
  label: string;
  value: string;
}

/**
 * Flatten the persisted contextRefs into chips for the header. Surfaces
 * "what's loaded" so the user can see at a glance which opportunity /
 * creator / niche / asset the Brain has in scope. Without this, the user
 * sees only "New conversation" and has no idea their click landed.
 */
function chipsFromContextRefs(refs?: Record<string, unknown>): ContextChip[] {
  if (!refs) return [];
  const chips: ContextChip[] = [];
  const push = (label: string, vals: unknown) => {
    if (!Array.isArray(vals)) return;
    for (const v of vals) {
      if (typeof v === "string" && v.length > 0) chips.push({ label, value: v });
    }
  };
  push("Opportunity", refs.opportunityIds);
  push("Product", refs.productIds);
  push("Creator", refs.creatorIds);
  push("Niche", refs.niches);
  push("Asset", refs.assetIds);
  return chips.slice(0, 6);
}

export function ChatWindow({
  initialMessages,
  mode,
  conversationId,
  contextRefs,
  placeholder,
}: Props) {
  const { messages, send, pending, aiMode, aiWarning } = useBrainChat(initialMessages ?? []);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chips = useMemo(() => chipsFromContextRefs(contextRefs), [contextRefs]);
  const hasContext = chips.length > 0;

  useEffect(() => {
    const viewport =
      (scrollRef.current?.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null) ??
      (scrollRef.current?.parentElement?.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLElement | null);
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void send({ conversationId, mode, contextRefs, message: trimmed });
  }

  return (
    <div className="flex h-full flex-col">
      {hasContext ? (
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/40 px-3 py-2">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-[11px] uppercase tracking-wide text-slate-500">Context</span>
          <div className="flex flex-1 flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <Badge
                key={`${c.label}-${c.value}-${i}`}
                variant="outline"
                className="h-5 border-primary/30 bg-primary/10 px-2 font-mono text-[10px]"
                title={`${c.label}: ${c.value}`}
              >
                <span className="text-slate-400">{c.label}:</span>
                <span className="ml-1 text-slate-200">
                  {c.value.length > 28 ? `${c.value.slice(0, 28)}…` : c.value}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              {hasContext
                ? `Ready when you are — Brain has ${chips.length === 1 ? "this item" : `${chips.length} items`} in scope. Try "summarise it" or "pressure-test the riskiest assumption."`
                : "Ask the Brain to surface, pressure-test, or build something."}
            </div>
          ) : null}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </ScrollArea>
      {aiMode === "mock" || aiMode === "mock-fallback" ? (
        <div className="border-t border-amber-900/40 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
          <span className="font-semibold">
            {aiMode === "mock-fallback" ? "Mock fallback" : "Mock mode"}:
          </span>{" "}
          {aiMode === "mock-fallback"
            ? (aiWarning ??
              "USE_MOCK=false but ANTHROPIC_API_KEY is missing — serving canned responses.")
            : "Brain is serving canned templates, not real Claude responses. Set USE_MOCK=false and ANTHROPIC_API_KEY in .env.local, then restart the dev server."}
        </div>
      ) : null}
      <div className="border-t border-slate-800 bg-slate-950/50 p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder ?? "Ask anything…  (⌘+Enter to send)"}
            rows={2}
            className="min-h-[60px] resize-none border-slate-800 bg-slate-900 text-sm"
          />
          <Button onClick={submit} disabled={pending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
          <span>
            mode: <code className="rounded bg-slate-800 px-1">{mode}</code>
          </span>
          {aiMode ? (
            <span>
              ·{" "}
              <span
                className={
                  aiMode === "live"
                    ? "text-emerald-400"
                    : aiMode === "mock-fallback"
                      ? "text-amber-400"
                      : "text-slate-400"
                }
              >
                {aiMode === "live"
                  ? "● live"
                  : aiMode === "mock-fallback"
                    ? "● mock-fallback"
                    : "● mock"}
              </span>
            </span>
          ) : null}
          <span>· ⌘+Enter to send</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-slate-800 text-xs">
          {isUser ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-primary" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg border p-3 text-sm ${
          isUser ? "border-primary/30 bg-primary/10" : "border-slate-800 bg-slate-900/60"
        }`}
      >
        {message.content || <span className="text-slate-500">…</span>}
      </div>
    </div>
  );
}
