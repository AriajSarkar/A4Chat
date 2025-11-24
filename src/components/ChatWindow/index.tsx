import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { RiSendPlaneFill, RiMicLine } from "@remixicon/react";
import { llmGenerate, listenToStream } from "../../lib/api/llm";
import { Message, StreamChunk } from "../../lib/types";
import { v4 as uuidv4 } from "uuid";
import { Sidebar } from "../Sidebar";
import { ModelSelector } from "../ModelSelector";
import { AutoExpandTextarea } from "../AutoExpandTextarea";

export const ChatWindow: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [streamingContent, setStreamingContent] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [model, setModel] = useState("google/gemini-2.0-flash-exp:free");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const currentStreamId = useRef<string | null>(null);
    const streamingContentRef = useRef<string>("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    useEffect(() => {
        const setupListener = async () => {
            const unlisten = await listenToStream((chunk: StreamChunk) => {
                if (chunk.streamId === currentStreamId.current) {
                    if (chunk.done) {
                        const finalContent = streamingContentRef.current;
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: uuidv4(),
                                conversationId: "temp-id",
                                role: "assistant",
                                content: finalContent,
                                createdAt: new Date(),
                            },
                        ]);
                        setIsStreaming(false);
                        setStreamingContent("");
                        streamingContentRef.current = "";
                        currentStreamId.current = null;
                    } else {
                        const newContent = chunk.token;
                        streamingContentRef.current += newContent;
                        setStreamingContent((prev) => prev + newContent);
                    }
                }
            });
            return unlisten;
        };

        let unlistenFn: () => void;
        setupListener().then((fn) => (unlistenFn = fn));

        return () => {
            if (unlistenFn) unlistenFn();
        };
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const userMsg: Message = {
            id: uuidv4(),
            conversationId: "temp-id",
            role: "user",
            content: input,
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsStreaming(true);
        setStreamingContent("");

        try {
            const streamId = await llmGenerate({
                provider: "openrouter",
                model: model,
                prompt: input,
                conversationId: "temp-id",
            });
            currentStreamId.current = streamId;
        } catch (e) {
            console.error("Failed to start generation:", e);
            setIsStreaming(false);
        }
    };

    const hasMessages = messages.length > 0 || streamingContent;

    return (
        <div className="flex h-screen bg-[#0d0d0d]">
            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0d0d0d]">
                    {!hasMessages ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="h-full flex flex-col items-center justify-center px-4"
                        >
                            <h1 className="text-4xl font-medium text-white mb-8 text-center">
                                What can I help with?
                            </h1>
                        </motion.div>
                    ) : (
                        <div className="max-w-4xl mx-auto w-full px-4 py-8">
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`mb-6 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`rounded-2xl px-5 py-3 max-w-[75%] ${msg.role === "user"
                                            ? "bg-brand-1 text-white"
                                            : "bg-[#2d2d2d] text-gray-100"
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                    </div>
                                </motion.div>
                            ))}

                            {streamingContent && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6 flex justify-start"
                                >
                                    <div className="rounded-2xl px-5 py-3 bg-[#2d2d2d] text-gray-100 max-w-[75%]">
                                        <div className="whitespace-pre-wrap break-words">{streamingContent}</div>
                                        <div className="inline-block w-1 h-4 bg-brand-1 ml-1 animate-pulse" />
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-[#2d2d2d] bg-[#171717]">
                    <div className="max-w-4xl mx-auto w-full px-4 py-4">
                        <div className="bg-[#2d2d2d] rounded-2xl border border-[#3d3d3d] p-4">
                            {/* Model Selector */}
                            <div className="mb-3">
                                <ModelSelector
                                    selectedModel={model}
                                    onSelectModel={setModel}
                                />
                            </div>

                            {/* Input Row */}
                            <div className="flex items-end gap-3">
                                {/* Textarea */}
                                <div className="flex-1">
                                    <AutoExpandTextarea
                                        value={input}
                                        onChange={setInput}
                                        onSend={handleSend}
                                        placeholder="Type your message..."
                                        disabled={isStreaming}
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-2">
                                    <button className="p-2.5 hover:bg-[#3d3d3d] rounded-lg transition-all text-gray-400 hover:text-white">
                                        <RiMicLine size={20} />
                                    </button>
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isStreaming}
                                        className="p-2.5 bg-brand-1 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-all text-white"
                                    >
                                        <RiSendPlaneFill size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer hint */}
                        <div className="text-center text-xs text-gray-500 mt-2">
                            Press Enter to send, Shift+Enter for new line
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
