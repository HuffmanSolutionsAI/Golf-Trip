// Server-Sent Events stream for realtime fan-out.
// Client consumes via EventSource; each event body is JSON { kind }.

import { subscribe } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(data));
      // Initial hello + retry hint.
      send(`retry: 5000\n\n`);
      send(`event: hello\ndata: {"ok":true}\n\n`);

      const unsub = subscribe((ev) => {
        send(`event: change\ndata: ${JSON.stringify(ev)}\n\n`);
      });

      // Keepalive every 20s so the tunnel doesn't close idle connections.
      const ping = setInterval(() => {
        send(`: ping\n\n`);
      }, 20_000);

      const close = () => {
        clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      // @ts-expect-error - controller.signal doesn't exist in all envs but we register onabort below
      if (controller.signal) controller.signal.addEventListener("abort", close);
      // In practice, Next.js will abort the Request and close the underlying stream.
    },
    cancel() {
      // Best-effort cleanup on client disconnect.
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
