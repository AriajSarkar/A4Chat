import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/conversations — list all conversations, newest first */
export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      providerId: true,
      model: true,
    },
  });

  return NextResponse.json(
    conversations.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.getTime(),
      providerId: c.providerId,
      model: c.model ?? "",
    })),
  );
}

/** POST /api/conversations — save/upsert a conversation + messages */
export async function POST(request: Request) {
  const body = await request.json();
  const { id, title, providerId, model, messages } = body;

  /* Ensure the provider exists (upsert a stub if missing) */
  await prisma.providerSetting.upsert({
    where: { id: providerId },
    create: {
      id: providerId,
      label: providerId,
      baseUrl: "",
      model: model ?? "",
    },
    update: {},
  });

  /* Upsert conversation */
  await prisma.conversation.upsert({
    where: { id },
    create: { id, title, providerId, model },
    update: { title, providerId, model },
  });

  /* Upsert all messages in a transaction for speed */
  if (messages?.length) {
    await prisma.$transaction(
      messages.map((m: { id: string; role: string; content: string; reasoning?: string; tokenCount?: number }) =>
        prisma.message.upsert({
          where: { id: m.id },
          create: {
            id: m.id,
            conversationId: id,
            role: m.role,
            content: m.content,
            reasoning: m.reasoning ?? null,
            tokenCount: m.tokenCount ?? null,
          },
          update: {
            role: m.role,
            content: m.content,
            reasoning: m.reasoning ?? null,
            tokenCount: m.tokenCount ?? null,
          },
        }),
      ),
    );
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/conversations — bulk delete */
export async function DELETE(request: Request) {
  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids?.length) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  /* CASCADE deletes messages automatically */
  await prisma.conversation.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ deleted: ids.length });
}
