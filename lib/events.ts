// In-process event bus for realtime fan-out.
// Single-node only (fine on the mini). Survives module reloads in dev via globalThis.

import { EventEmitter } from "node:events";

export type ChangeKind =
  | "hole_scores"
  | "chat_messages"
  | "rounds"
  | "matches"
  | "scramble_entries"
  | "players";

type ChangeEvent = { kind: ChangeKind };

const g = globalThis as unknown as { __npEmitter?: EventEmitter };
const emitter: EventEmitter = (g.__npEmitter ??= new EventEmitter());
emitter.setMaxListeners(200);

export function emitChange(kind: ChangeKind) {
  emitter.emit("change", { kind } satisfies ChangeEvent);
}

export function subscribe(fn: (ev: ChangeEvent) => void): () => void {
  emitter.on("change", fn);
  return () => emitter.off("change", fn);
}
