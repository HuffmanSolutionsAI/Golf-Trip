// Server-Sent Events stream for realtime fan-out.
// Client consumes via EventSource; each event body is JSON { event_id, kind }.
// The stream is scoped to a single event id so a multi-event deploy can fan
// out per event without listeners cross-contaminating. The event id comes
// from the ?event=<id> query string; if absent, the default event is used.

import { subscribe } from "@/lib/events";
import { DEFAULT_EVENT_ID } from "@/lib/repo/events";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const eventId =
    request.nextUrl.searchParams.get("event") ?? DEFAULT_EVENT_ID;

  const encoder = new TextEncoder();
  let closed = false;
  let unsub: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
          if (ping) clearInterval(ping);
          if (unsub) unsub();
        }
      };

      send(`retry: 5000\n\n`);
      send(`event: hello\ndata: {"ok":true}\n\n`);

      unsub = subscribe((ev) => {
        send(`event: change\ndata: ${JSON.stringify(ev)}\n\n`);
      }, eventId);

      ping = setInterval(() => {
        send(`: ping\n\n`);
      }, 20_000);
    },
    cancel() {
      closed = true;
      if (ping) clearInterval(ping);
      if (unsub) unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
