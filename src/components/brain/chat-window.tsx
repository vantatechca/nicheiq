"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBrainChat } from "@/lib/hooks/use-brain-chat";
import type { Message } from "@/lib/types";

interface Props {
  initialMessages?: Message[];
  mode: string;
  conversationId?: string;
  contextRefs?: Record<string, unknown>;
  placeholder?: string;
}

export function ChatWindow({ initialMessages, mode, conversationId, contextRefs, placeholder }: Props) {
  const { messages, send, pending } = useBrainChat(initialMessages ?? []);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void send({ conversationId, mode, contextRefs, message: trimmed });
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              Ask the Brain to surface, pressure-test, or build something.
            </div>
          ) : null}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-slate-800 bg-slate-950/50 p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder={placeholder ?? "Ask anything…  (⌘+Enter to send)"}
            rows={2}
            className="min-h-[60px] resize-none border-slate-800 bg-slate-900 text-sm"
          />
          <Button onClick={submit} disabled={pending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1 text-[10px] text-slate-500">
          mode: <code className="rounded bg-slate-800 px-1">{mode}</code> · ⌘+Enter to send
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
          isUser
            ? "border-primary/30 bg-primary/10"
            : "border-slate-800 bg-slate-900/60"
        }`}
      >
        {message.content || <span className="text-slate-500">…</span>}
      </div>
    </div>
  );
}
