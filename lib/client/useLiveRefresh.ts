import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Kind =
  | "hole_scores"
  | "chat_messages"
  | "rounds"
  | "matches"
  | "scramble_entries"
  | "players";

/**
 * Subscribe to SSE events and call router.refresh() when relevant changes arrive.
 * Pass a list of kinds you care about; if empty, refreshes on every change.
 */
export function useLiveRefresh(kinds: Kind[] = []) {
  const router = useRouter();
  useEffect(() => {
    const es = new EventSource("/api/events");
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
  }, [router, kinds.join(",")]);
}
