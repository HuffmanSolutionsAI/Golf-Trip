import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/server/requireAdmin";
import { insertHumanMessage } from "@/lib/repo/chat";
import { emitChange } from "@/lib/events";

const Body = z.object({
  body: z.string().trim().min(1).max(1000),
});

export async function POST(req: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  insertHumanMessage(gate.playerId, parsed.data.body);
  emitChange("chat_messages");
  return NextResponse.json({ ok: true });
}
