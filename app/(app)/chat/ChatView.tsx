"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

export type EnrichedMessage = {
  id: string;
  body: string;
  kind: "human" | "system";
  posted_at: string;
  playerName: string | null;
  teamColor: string | null;
  teamName: string | null;
};

export function ChatView({ initial }: { initial: EnrichedMessage[] }) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useLiveRefresh(["chat_messages"]);

  useEffect(() => setMessages(initial), [initial]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (res.ok) {
      setDraft("");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-0 sm:px-4 py-0 sm:py-4 h-[calc(100dvh-10rem)] md:h-[calc(100dvh-4rem)] flex flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[var(--color-paper)]"
      >
        {messages.length === 0 ? (
          <p className="font-body-serif italic text-neutral-600 text-center mt-10">
            Say something. Anything. The group&rsquo;s waiting.
          </p>
        ) : (
          messages.map((m) => {
            if (m.kind === "system") {
              return (
                <div
                  key={m.id}
                  className="text-center text-xs font-body-serif italic text-neutral-600"
                >
                  {m.body}
                </div>
              );
            }
            return (
              <div key={m.id} className="flex flex-col">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: m.teamColor ?? "#1A2E3B" }}
                  />
                  <span className="font-ui font-semibold">{m.playerName ?? "Guest"}</span>
                  <span className="text-neutral-400">·</span>
                  <span>{formatDistanceToNow(new Date(m.posted_at), { addSuffix: true })}</span>
                </div>
                <div className="text-sm font-ui mt-0.5">{m.body}</div>
              </div>
            );
          })
        )}
      </div>
      <form
        onSubmit={send}
        className="flex gap-2 items-center px-4 py-3 border-t border-[var(--color-rule)] bg-[var(--color-cream)] sticky bottom-16 md:bottom-0"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something…"
          maxLength={1000}
        />
        <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
