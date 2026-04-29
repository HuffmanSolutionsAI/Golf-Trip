import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Kind =
  | "hole_scores"
  | "chat_messages"
  | "rounds"
  | "matches"
  | "scramble_entries"
  | "players";

// Subscribe to SSE events and call router.refresh() when relevant changes
// arrive. `kinds` filters which kinds trigger a refresh (empty = all).
// `eventId` scopes the SSE subscription to a single event; the existing
// top-level surfaces (N&P Invitational) leave it undefined and the server
// defaults to event-1.
export function useLiveRefresh(kinds: Kind[] = [], eventId?: string) {
  const router = useRouter();
  useEffect(() => {
    const url = eventId
      ? `/api/events?event=${encodeURIComponent(eventId)}`
      : "/api/events";
    const es = new EventSource(url);
    const onChange = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as { kind: Kind };
        if (kinds.length === 0 || kinds.includes(parsed.kind)) {
          router.refresh();
        }
      } catch {
        /* ignore */
      }
    };
    es.addEventListener("change", onChange);
    return () => {
      es.removeEventListener("change", onChange);
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, kinds.join(","), eventId]);
}
