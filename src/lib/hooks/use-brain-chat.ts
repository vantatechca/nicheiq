"use client";

import { useCallback, useState } from "react";
import type { Message } from "@/lib/types";

interface SendArgs {
  conversationId?: string;
  mode: string;
  contextRefs?: Record<string, unknown>;
  message: string;
}

export function useBrainChat(initial: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [pending, setPending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [aiMode, setAiMode] = useState<"live" | "mock" | "mock-fallback" | undefined>();
  const [aiWarning, setAiWarning] = useState<string | undefined>();

  const send = useCallback(async (args: SendArgs) => {
    setPending(true);
    const userMsg: Message = {
      id: `local_${crypto.randomUUID()}`,
      conversationId: args.conversationId ?? "local",
      role: "user",
      content: args.message,
      createdAt: new Date().toISOString(),
    };
    const assistantId = `local_${crypto.randomUUID()}`;
    const assistantMsg: Message = {
      id: assistantId,
      conversationId: args.conversationId ?? "local",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/brain/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!res.ok || !res.body) throw new Error("Request failed");
      const cid = res.headers.get("x-conversation-id");
      if (cid) setActiveConversationId(cid);
      const mode = res.headers.get("x-ai-mode");
      if (mode === "live" || mode === "mock" || mode === "mock-fallback") setAiMode(mode);
      const warning = res.headers.get("x-ai-warning");
      setAiWarning(warning ?? undefined);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content + "\n\n_(error: " + (err as Error).message + ")_" }
            : m,
        ),
      );
    } finally {
      setPending(false);
    }
  }, []);

  return { messages, setMessages, send, pending, activeConversationId, aiMode, aiWarning };
}