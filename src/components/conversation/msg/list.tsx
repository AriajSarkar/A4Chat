"use client";

import { useEffect, useRef } from "react";

import { MessageRow } from "@/components/conversation/msg/row";
import type { ConversationMessage } from "@/components/conversation/utils/conversation";

type MessageListProps = {
  messages: ConversationMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-3 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        {messages.map((message) => (
          <MessageRow key={message.id} message={message} />
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
