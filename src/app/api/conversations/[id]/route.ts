import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** GET /api/conversations/:id — load messages for a conversation */
export async function GET(_: Request, { params }: Params) {
  const { id } = await params;

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      reasoning: true,
      tokenCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      reasoning: m.reasoning,
      outputTokens: m.tokenCount,
      createdAt: m.createdAt.getTime(),
    })),
  );
}

/** PATCH /api/conversations/:id — rename */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { title } = await request.json();

  await prisma.conversation.update({
    where: { id },
    data: { title },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/conversations/:id — delete single */
export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
