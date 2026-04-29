import { notFound } from "next/navigation";
import { getEventById, runWithEvent } from "@/lib/repo/events";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { listRounds } from "@/lib/repo/rounds";
import {
  listEntries,
  listPayouts,
  listSideBets,
} from "@/lib/repo/sideBets";

export const dynamic = "force-dynamic";

function fmt$(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function EventWageringPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventById(slug);
  if (!event) notFound();

  const data = runWithEvent(slug, () => {
    const bets = listSideBets();
    const players = listPlayers();
    const teams = listTeams();
    const rounds = listRounds();
    const entries: Record<string, ReturnType<typeof listEntries>> = {};
    const payouts: Record<string, ReturnType<typeof listPayouts>> = {};
    for (const b of bets) {
      entries[b.id] = listEntries(b.id);
      payouts[b.id] = listPayouts(b.id);
    }
    return { bets, players, teams, rounds, entries, payouts };
  });

  const playerById = new Map(data.players.map((p) => [p.id, p]));
  const teamById = new Map(data.teams.map((t) => [t.id, t]));
  const roundById = new Map(data.rounds.map((r) => [r.id, r]));

  const open = data.bets.filter((b) => b.status === "open");
  const settled = data.bets.filter((b) => b.status === "settled");

  return (
    <div>
      <div
        className="paper-grain"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-14">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-gold)",
              fontWeight: 500,
            }}
          >
            {event.name.toUpperCase()} · WAGERING
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-2"
            style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.01em" }}
          >
            Side bets.
          </h1>
          <p
            className="font-body-serif italic mt-3"
            style={{
              fontSize: 14,
              color: "var(--color-stone)",
              opacity: 0.75,
              maxWidth: 540,
            }}
          >
            Pots and payouts. The commissioner settles every bet by hand —
            we keep the ledger, not the money.
          </p>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-8 md:py-10">
          {data.bets.length === 0 && (
            <p
              className="font-body-serif italic"
              style={{
                fontSize: 14,
                color: "var(--color-stone)",
                opacity: 0.7,
              }}
            >
              No bets yet.
            </p>
          )}

          {open.length > 0 && (
            <BetGroup
              title="Open"
              bets={open}
              entries={data.entries}
              payouts={data.payouts}
              playerById={playerById}
              teamById={teamById}
              roundById={roundById}
            />
          )}

          {settled.length > 0 && (
            <BetGroup
              title="Settled"
              bets={settled}
              entries={data.entries}
              payouts={data.payouts}
              playerById={playerById}
              teamById={teamById}
              roundById={roundById}
            />
          )}
        </div>
      </div>
    </div>
  );
}

type BetData = ReturnType<typeof listSideBets>;
type EntriesByBet = Record<string, ReturnType<typeof listEntries>>;
type PayoutsByBet = Record<string, ReturnType<typeof listPayouts>>;

function BetGroup({
  title,
  bets,
  entries,
  payouts,
  playerById,
  teamById,
  roundById,
}: {
  title: string;
  bets: BetData;
  entries: EntriesByBet;
  payouts: PayoutsByBet;
  playerById: Map<string, ReturnType<typeof listPlayers>[number]>;
  teamById: Map<string, ReturnType<typeof listTeams>[number]>;
  roundById: Map<string, ReturnType<typeof listRounds>[number]>;
}) {
  return (
    <section className="mb-10">
      <div
        className="font-ui uppercase pb-2 mb-2"
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--color-gold)",
          borderBottom: "1px solid var(--color-gold)",
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <ul>
        {bets.map((b) => {
          const ents = entries[b.id] ?? [];
          const pays = payouts[b.id] ?? [];
          const pot = b.buy_in_cents * ents.length;
          const round = b.round_id ? roundById.get(b.round_id) : null;
          const totalPaid = pays.reduce((s, p) => s + p.amount_cents, 0);
          return (
            <li
              key={b.id}
              className="py-4"
              style={{ borderBottom: "1px solid var(--color-rule-cream)" }}
            >
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <div
                    className="font-display text-[var(--color-navy)]"
                    style={{ fontSize: 22, lineHeight: 1.05 }}
                  >
                    {b.name}
                  </div>
                  <div
                    className="font-body-serif italic mt-0.5"
                    style={{
                      fontSize: 13,
                      color: "var(--color-stone)",
                    }}
                  >
                    {round
                      ? `Day ${round.day} · ${round.course_name}`
                      : "Event-wide"}
                    {b.buy_in_cents > 0
                      ? ` · ${fmt$(b.buy_in_cents)} buy-in`
                      : " · no buy-in"}
                  </div>
                </div>
                <div
                  className="font-mono text-right"
                  style={{ fontSize: 14, color: "var(--color-navy)" }}
                >
                  Pot {fmt$(pot)}
                  {b.status === "settled" && (
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 11,
                        color: "var(--color-stone)",
                        marginTop: 2,
                      }}
                    >
                      Paid {fmt$(totalPaid)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {ents.map((e) => {
                  const label = e.player_id
                    ? playerById.get(e.player_id)?.name ?? "?"
                    : e.team_id
                      ? teamById.get(e.team_id)?.name ?? "?"
                      : "?";
                  return (
                    <span
                      key={e.id}
                      className="font-body-serif"
                      style={{
                        fontSize: 12,
                        color: "var(--color-stone)",
                        padding: "1px 8px",
                        border: "1px solid var(--color-rule-cream)",
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
                {ents.length === 0 && (
                  <span
                    className="font-body-serif italic"
                    style={{
                      fontSize: 12,
                      color: "var(--color-stone)",
                      opacity: 0.6,
                    }}
                  >
                    No participants yet
                  </span>
                )}
              </div>
              {b.status === "settled" && pays.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {pays.map((p) => {
                    const recipient = p.recipient_player_id
                      ? playerById.get(p.recipient_player_id)?.name
                      : p.recipient_team_id
                        ? teamById.get(p.recipient_team_id)?.name
                        : "?";
                    return (
                      <li
                        key={p.id}
                        className="flex items-baseline justify-between font-body-serif"
                        style={{
                          fontSize: 13,
                          color: "var(--color-navy)",
                        }}
                      >
                        <span>
                          {recipient}
                          {p.note && (
                            <span
                              className="font-body-serif italic ml-2"
                              style={{
                                fontSize: 12,
                                color: "var(--color-stone)",
                              }}
                            >
                              {p.note}
                            </span>
                          )}
                        </span>
                        <span className="font-mono">
                          {fmt$(p.amount_cents)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
