"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";

import {
  createUserMessage,
  toCompletionMessages,
  type ConversationMessage,
} from "@/components/conversation/utils/conversation";
import { ConversationView } from "@/components/conversation/view";
import { NavigationSidebar } from "@/components/nav/sidebar";
import { SearchDialog } from "@/components/nav/search-dialog";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import {
  DEFAULT_PROVIDERS,
  findActiveProvider,
  normalizeProviders,
  type ProviderSettings,
} from "@/components/settings/utils/providers";
import {
  getAppHealth,
  loadConversationList,
  loadConversationMessages,
  loadProviders,
  persistConversation,
  persistProviders,
  streamChatCompletion,
  type AppHealth,
  type SavedConversation,
} from "@/lib/native";

const SELECTED_PROVIDER_KEY = "a4chat.selectedProvider";

export function ConversationWorkspace() {
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState(DEFAULT_PROVIDERS[0].id);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState(createConversationId);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "streaming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<AppHealth | null>(null);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);

  /* Streaming refs */
  const streamContentRef = useRef("");
  const streamReasoningRef = useRef("");
  const streamMsgIdRef = useRef<string | null>(null);
  const rafRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const hasStartedStreamingRef = useRef(false);

  /* Thread safety */
  const activeConvIdRef = useRef(conversationId);
  activeConvIdRef.current = conversationId;

  const deferredMessages = useDeferredValue(messages);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const selectedProvider = findActiveProvider(providers, selectedProviderId);

  /* ── Init ─────────────────────────────────────────── */
  useEffect(() => {
    const storedSelectedProvider = localStorage.getItem(SELECTED_PROVIDER_KEY);
    if (storedSelectedProvider) setSelectedProviderId(storedSelectedProvider);

    void refreshConvList();
    void getAppHealth().then(setHealth).catch(() => setHealth(null));
    void loadProviders()
      .then((p) => { if (p?.length) setProviders(p); })
      .catch(() => undefined);

    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Async refresh helper ────────────────────────── */
  async function refreshConvList() {
    try {
      const list = await loadConversationList();
      setConversations(list);
    } catch { /* ignore */ }
  }

  /* ── Providers ────────────────────────────────────── */
  const saveProviders = useCallback(
    async (nextProviders: ProviderSettings[]) => {
      const normalized = normalizeProviders(nextProviders);
      setProviders(normalized);
      await persistProviders(normalized);
      if (!normalized.some((p) => p.id === selectedProviderId)) {
        const nextId = normalized[0]?.id ?? DEFAULT_PROVIDERS[0].id;
        setSelectedProviderId(nextId);
        localStorage.setItem(SELECTED_PROVIDER_KEY, nextId);
      }
    },
    [selectedProviderId],
  );

  const selectProvider = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
    localStorage.setItem(SELECTED_PROVIDER_KEY, providerId);
  }, []);

  /* ── RAF flush ────────────────────────────────────── */
  function flushStream() {
    const id = streamMsgIdRef.current;
    if (!id) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, content: streamContentRef.current, reasoning: streamReasoningRef.current || undefined }
          : m,
      ),
    );
  }

  function scheduleFlush() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(flushStream);
  }

  /* ── Save current streaming state and abort ───────── */
  const saveAndAbort = useCallback(() => {
    const abort = abortRef.current;
    cancelAnimationFrame(rafRef.current);

    const id = streamMsgIdRef.current;
    if (id) {
      const content = streamContentRef.current;
      const reasoning = streamReasoningRef.current;
      setMessages((prev) => {
        const final = prev.map((m) =>
          m.id === id ? { ...m, content, reasoning: reasoning || undefined } : m,
        );
        if (selectedProvider) {
          void persistConversation(final, selectedProvider, conversationId);
        }
        return final;
      });
    }

    if (abort) abort.abort();
    abortRef.current = null;
    streamMsgIdRef.current = null;
    streamContentRef.current = "";
    streamReasoningRef.current = "";
    hasStartedStreamingRef.current = false;
    setStatus("idle");
    void refreshConvList();
  }, [conversationId, selectedProvider]);

  /* ── Stop streaming (user-initiated) ──────────────── */
  const stopStreaming = useCallback(() => {
    saveAndAbort();
  }, [saveAndAbort]);

  /* ── Submit (streaming) ───────────────────────────── */
  const submitMessage = useCallback(
    async (content: string) => {
      if (!selectedProvider || status !== "idle") return;

      const userMessage = createUserMessage(content);
      const nextMessages = [...messagesRef.current, userMessage];

      const pendingId = crypto.randomUUID();
      const pendingMsg: ConversationMessage = {
        id: pendingId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        providerId: selectedProvider.id,
        providerLabel: selectedProvider.label,
        model: selectedProvider.model,
      };

      streamContentRef.current = "";
      streamReasoningRef.current = "";
      streamMsgIdRef.current = pendingId;
      hasStartedStreamingRef.current = false;

      setMessages([...nextMessages, pendingMsg]);
      setStatus("sending");
      setError(null);

      const abort = new AbortController();
      abortRef.current = abort;

      const submitConvId = conversationId;
      const submitProvider = selectedProvider;

      await streamChatCompletion(
        {
          provider: selectedProvider,
          messages: toCompletionMessages(nextMessages),
          signal: abort.signal,
        },
        {
          onToken: (token) => {
            streamContentRef.current += token;
            if (!hasStartedStreamingRef.current) {
              hasStartedStreamingRef.current = true;
              setStatus("streaming");
            }
            scheduleFlush();
          },
          onReasoning: (token) => {
            streamReasoningRef.current += token;
            if (!hasStartedStreamingRef.current) {
              hasStartedStreamingRef.current = true;
              setStatus("streaming");
            }
            scheduleFlush();
          },
          onComplete: (response) => {
            cancelAnimationFrame(rafRef.current);
            abortRef.current = null;
            streamMsgIdRef.current = null;
            hasStartedStreamingRef.current = false;

            const buildFinal = (prev: ConversationMessage[]) =>
              prev.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      content: response.content || streamContentRef.current || m.content,
                      reasoning: (response.reasoning ?? streamReasoningRef.current) || undefined,
                      model: response.model ?? m.model,
                      inputTokens: response.inputTokens ?? undefined,
                      outputTokens: response.outputTokens ?? undefined,
                    }
                  : m,
              );

            if (activeConvIdRef.current === submitConvId) {
              setMessages((prev) => {
                const final = buildFinal(prev);
                void persistConversation(final, submitProvider, submitConvId).then(refreshConvList);
                return final;
              });
              setStatus("idle");
            } else {
              const finalMsgs = buildFinal(messagesRef.current);
              void persistConversation(finalMsgs, submitProvider, submitConvId).then(refreshConvList);
            }

            streamContentRef.current = "";
            streamReasoningRef.current = "";
          },
          onError: (err) => {
            cancelAnimationFrame(rafRef.current);
            abortRef.current = null;
            hasStartedStreamingRef.current = false;

            const hasContent = streamContentRef.current || streamReasoningRef.current;
            if (hasContent && streamMsgIdRef.current) {
              flushStream();
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== pendingId));
            }

            streamMsgIdRef.current = null;
            streamContentRef.current = "";
            streamReasoningRef.current = "";
            setError(err.message);
            setStatus("idle");
          },
        },
      );
    },
    [conversationId, selectedProvider, status],
  );

  /* ── Conversation management ──────────────────────── */
  const resetConversation = useCallback(() => {
    if (status !== "idle") saveAndAbort();
    setConversationId(createConversationId());
    setMessages([]);
    setError(null);
    setStatus("idle");
  }, [saveAndAbort, status]);

  const loadConversation = useCallback(
    async (id: string) => {
      if (status !== "idle") saveAndAbort();
      const msgs = await loadConversationMessages(id);
      setConversationId(id);
      setMessages(msgs);
      setError(null);
      setStatus("idle");
      setMobileSidebarOpen(false);
    },
    [saveAndAbort, status],
  );

  const toggleMobileSidebar = useCallback(() => setMobileSidebarOpen((v) => !v), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const refreshConversations = useCallback(() => { void refreshConvList(); }, []);

  return (
    <div className="flex h-dvh min-h-dvh overflow-hidden bg-background text-foreground">
      <NavigationSidebar
        conversations={conversations}
        expanded={sidebarExpanded}
        health={health}
        mobileOpen={mobileSidebarOpen}
        onLoadConversation={loadConversation}
        onMobileClose={closeMobileSidebar}
        onNewConversation={resetConversation}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onRefresh={refreshConversations}
        onToggleExpanded={() => setSidebarExpanded((v) => !v)}
      />
      <ConversationView
        error={error}
        isStreaming={status === "streaming"}
        messages={deferredMessages}
        onProviderChange={selectProvider}
        onStopStreaming={stopStreaming}
        onSubmit={submitMessage}
        onToggleSidebar={toggleMobileSidebar}
        providers={providers}
        selectedProviderId={selectedProvider?.id ?? selectedProviderId}
        status={status}
      />
      <SearchDialog
        conversations={conversations}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onLoadConversation={loadConversation}
        onRefresh={refreshConversations}
      />
      <SettingsDialog
        open={settingsOpen}
        providers={providers}
        onClose={() => setSettingsOpen(false)}
        onSave={saveProviders}
      />
    </div>
  );
}

function createConversationId() {
  return globalThis.crypto?.randomUUID?.() ?? `conversation-${Date.now()}`;
}
