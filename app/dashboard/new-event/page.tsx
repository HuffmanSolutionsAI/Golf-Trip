import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NewEventForm } from "./NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in?next=/dashboard/new-event");
  }
  return (
    <div className="paper-grain min-h-[100dvh]">
      <div className="mx-auto max-w-[640px] px-5 md:px-8 py-12 md:py-16">
        <div
          className="font-ui uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          New event
        </div>
        <h1
          className="font-display text-[var(--color-navy)] mt-2 mb-2"
          style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.01em" }}
        >
          Stand one up.
        </h1>
        <p
          className="font-body-serif italic mb-8"
          style={{
            fontSize: 15,
            color: "var(--color-stone)",
            opacity: 0.75,
            lineHeight: 1.6,
          }}
        >
          You&apos;ll be set as commissioner. Names, courses, and pairings can
          all be edited later.
        </p>
        <NewEventForm />
      </div>
    </div>
  );
}
