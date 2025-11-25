import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { RiMicLine, RiAddLine, RiArrowUpLine } from "@remixicon/react";
import { llmGenerate, listenToStream } from "../../lib/api/llm";
import { Message, StreamChunk } from "../../lib/types";
import { v4 as uuidv4 } from "uuid";
import { Sidebar } from "../Sidebar";
import { ModelSelector } from "../ModelSelector";
import { AutoExpandTextarea } from "../AutoExpandTextarea";
import { BottomNav } from "../BottomNav";
import { Settings } from "../Settings";
import { useMobile } from "../../hooks/use-mobile";
import { useKeyboard } from "../../hooks/use-keyboard";

export const ChatWindow: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [streamingContent, setStreamingContent] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [model, setModel] = useState("google/gemini-2.0-flash-exp:free");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [currentView, setCurrentView] = useState<"chat" | "settings">("chat");
    const isMobile = useMobile();
    const isKeyboardOpen = useKeyboard();

    const currentStreamId = useRef<string | null>(null);
    const streamingContentRef = useRef<string>("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    // Auto-collapse sidebar on mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarCollapsed(true);
        }
    }, [isMobile]);

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
        <div
            className="flex bg-[#0d0d0d]"
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
        >
            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onNavigateToSettings={() => setCurrentView("settings")}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative h-full">
                {currentView === "settings" ? (
                    <Settings />
                ) : !hasMessages ? (
                    // Empty state: center heading and input together
                    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
                        <h1 className="text-4xl font-medium text-white mb-12 text-center">
                            What can I help with?
                        </h1>

                        {/* Input Area - Centered Version */}
                        <div className="w-full max-w-4xl">
                            {/* Model Selector */}
                            <div className="mb-3">
                                <ModelSelector
                                    selectedModel={model}
                                    onSelectModel={setModel}
                                />
                            </div>

                            <div className="flex items-end gap-2 bg-[#2f2f2f] rounded-3xl p-2 border border-[#3d3d3d]">
                                {/* Plus Button */}
                                <button className="p-2 text-gray-400 hover:text-white bg-[#3d3d3d] rounded-full w-10 h-10 flex items-center justify-center shrink-0 transition-colors">
                                    <RiAddLine size={24} />
                                </button>

                                {/* Textarea */}
                                <div className="flex-1 py-2 min-h-[44px] flex items-center">
                                    <AutoExpandTextarea
                                        value={input}
                                        onChange={setInput}
                                        onSend={handleSend}
                                        placeholder="Message"
                                        disabled={isStreaming}
                                    />
                                </div>

                                {/* Send Button */}
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isStreaming}
                                    className={`p-2 rounded-full w-10 h-10 flex items-center justify-center shrink-0 transition-all ${input.trim() && !isStreaming
                                        ? "bg-white text-black hover:bg-gray-200"
                                        : "bg-[#3d3d3d] text-gray-500 cursor-not-allowed"
                                        }`}
                                >
                                    {input.trim() ? (
                                        <RiArrowUpLine size={24} />
                                    ) : (
                                        <RiMicLine size={24} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0d0d0d]">
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
                        </div>

                        {/* Input Area - Fixed at bottom when messages exist */}
                        <div className={`shrink-0 ${isMobile ? "bg-transparent p-2" : "border-t border-[#2d2d2d] bg-[#171717]"}`}>
                            <div className="max-w-4xl mx-auto w-full px-4 py-4">
                                {/* Model Selector */}
                                <div className="mb-3">
                                    <ModelSelector
                                        selectedModel={model}
                                        onSelectModel={setModel}
                                    />
                                </div>

                                <div className="flex items-end gap-2 bg-[#2f2f2f] rounded-3xl p-2 border border-[#3d3d3d]">
                                    {/* Plus Button */}
                                    <button className="p-2 text-gray-400 hover:text-white bg-[#3d3d3d] rounded-full w-10 h-10 flex items-center justify-center shrink-0 transition-colors">
                                        <RiAddLine size={24} />
                                    </button>

                                    {/* Textarea */}
                                    <div className="flex-1 py-2 min-h-[44px] flex items-center">
                                        <AutoExpandTextarea
                                            value={input}
                                            onChange={setInput}
                                            onSend={handleSend}
                                            placeholder="Message"
                                            disabled={isStreaming}
                                        />
                                    </div>

                                    {/* Send Button */}
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isStreaming}
                                        className={`p-2 rounded-full w-10 h-10 flex items-center justify-center shrink-0 transition-all ${input.trim() && !isStreaming
                                            ? "bg-white text-black hover:bg-gray-200"
                                            : "bg-[#3d3d3d] text-gray-500 cursor-not-allowed"
                                            }`}
                                    >
                                        {input.trim() ? (
                                            <RiArrowUpLine size={24} />
                                        ) : (
                                            <RiMicLine size={24} />
                                        )}
                                    </button>
                                </div>

                                {/* Footer hint */}
                                {!isMobile && (
                                    <div className="text-center text-xs text-gray-500 mt-2">
                                        ChatGPT can make mistakes. Check important info.
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Bottom Navigation for Mobile */}
                {isMobile && !isKeyboardOpen && (
                    <BottomNav
                        onNewChat={() => {
                            setMessages([]);
                            setStreamingContent("");
                            setCurrentView("chat");
                        }}
                        onSearch={() => { }}
                        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        onSettings={() => setCurrentView("settings")}
                    />
                )}
            </div>
        </div>
    );
};

