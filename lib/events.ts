// In-process event bus for realtime fan-out.
// Single-node only (fine on the mini). Survives module reloads in dev via globalThis.

import { EventEmitter } from "node:events";
import { getCurrentEventId } from "@/lib/repo/events";

export type ChangeKind =
  | "hole_scores"
  | "chat_messages"
  | "rounds"
  | "matches"
  | "scramble_entries"
  | "players";

export type ChangeEvent = { event_id: string; kind: ChangeKind };

const g = globalThis as unknown as { __npEmitter?: EventEmitter };
const emitter: EventEmitter = (g.__npEmitter ??= new EventEmitter());
emitter.setMaxListeners(200);

// Emit a change scoped to an event. Defaults to the current event so callers
// don't have to plumb the id everywhere; pass eventId explicitly when the
// caller already knows it (e.g. cross-event admin tooling).
export function emitChange(kind: ChangeKind, eventId?: string) {
  emitter.emit("change", {
    event_id: eventId ?? getCurrentEventId(),
    kind,
  } satisfies ChangeEvent);
}

// Subscribe to changes. If eventId is provided, the callback only fires for
// events matching that id; otherwise it fires for every event. The SSE
// route always filters by eventId so a future second event can stream
// independently.
export function subscribe(
  fn: (ev: ChangeEvent) => void,
  eventId?: string,
): () => void {
  const listener = (ev: ChangeEvent) => {
    if (eventId && ev.event_id !== eventId) return;
    fn(ev);
  };
  emitter.on("change", listener);
  return () => emitter.off("change", listener);
}
