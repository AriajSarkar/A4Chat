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
import { mergeWithSeeds } from "@/components/settings/utils/popular-models";
import {
  DEFAULT_PROVIDERS,
  findActiveProvider,
  getLatestModelSyncAt,
  getModelRefreshCooldownRemainingMs,
  isModelCacheStale,
  normalizeProviders,
  type ProviderModel,
  type ProviderSettings,
} from "@/components/settings/utils/providers";
import {
  detectProviderModels,
  getAppHealth,
  loadConversationList,
  loadConversationMessages,
  loadProviderModels,
  loadProviders,
  persistConversation,
  persistProviders,
  streamChatCompletion,
  toggleModelFavorite,
  type AppHealth,
  type SavedConversation,
} from "@/lib/native";
import { loadProviderModelCache, saveProviderModelCache } from "@/lib/model-cache";

const SELECTED_PROVIDER_KEY = "a4chat.selectedProvider";
const SELECTED_MODEL_KEY = "a4chat.selectedModel";
const PROVIDER_MODEL_CHECKED_AT_KEY = "a4chat.providerModelCheckedAt";

function loadProviderModelCheckedAt(): Record<string, number> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(PROVIDER_MODEL_CHECKED_AT_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries: Array<[string, number]> = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        entries.push([key, value]);
      }
    }
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function ConversationWorkspace() {
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState(DEFAULT_PROVIDERS[0].id);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_PROVIDERS[0].model);
  const [providerModels, setProviderModels] = useState<Map<string, ProviderModel[]>>(new Map());
  const [providerModelCheckedAt, setProviderModelCheckedAt] = useState<Record<string, number>>(() =>
    loadProviderModelCheckedAt(),
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState(createConversationId);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshingProviderId, setRefreshingProviderId] = useState<string | null>(null);
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
  const submittingRef = useRef(false);

  /* Thread safety */
  const activeConvIdRef = useRef(conversationId);
  activeConvIdRef.current = conversationId;

  const deferredMessages = useDeferredValue(messages);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const selectedProvider = findActiveProvider(providers, selectedProviderId);
  const selectedProviderCacheAt = selectedProvider
    ? (providerModelCheckedAt[selectedProvider.id] ??
      getLatestModelSyncAt(providerModels.get(selectedProvider.id) ?? []))
    : 0;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PROVIDER_MODEL_CHECKED_AT_KEY,
        JSON.stringify(providerModelCheckedAt),
      );
    } catch {
      /* ignore storage errors */
    }
  }, [providerModelCheckedAt]);

  /* ── Init ─────────────────────────────────────────── */
  useEffect(() => {
    const storedProvider = localStorage.getItem(SELECTED_PROVIDER_KEY);
    const storedModel = localStorage.getItem(SELECTED_MODEL_KEY);
    if (storedProvider) setSelectedProviderId(storedProvider);
    if (storedModel) setSelectedModelId(storedModel);

    void refreshConvList();
    void getAppHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
    void loadProviders()
      .then(async (p) => {
        if (p?.length) {
          setProviders(p);
          const entries = await Promise.all(
            p.map(async (provider) => {
              const cached = await loadProviderModelCache(provider.id).catch(() => null);

              if (cached) {
                const merged = mergeWithSeeds(provider.id, cached.models);
                void saveProviderModelCache(provider.id, merged, cached.checkedAt);

                return {
                  providerId: provider.id,
                  models: merged,
                  checkedAt: cached.checkedAt,
                };
              }

              const loaded = await loadProviderModels(provider.id).catch(
                () => [] as ProviderModel[],
              );
              const merged = mergeWithSeeds(provider.id, loaded);
              const checkedAt = getLatestModelSyncAt(loaded) || Date.now();
              void saveProviderModelCache(provider.id, merged, checkedAt);

              return {
                providerId: provider.id,
                models: merged,
                checkedAt,
              };
            }),
          );

          const modelsByProvider = new Map(
            entries.map((entry) => [entry.providerId, entry.models]),
          );
          const checkedAtByProvider = new Map(
            entries.map((entry) => [entry.providerId, entry.checkedAt]),
          );

          setProviderModels((prev) => {
            const next = new Map(prev);
            for (const [providerId, models] of modelsByProvider) {
              next.set(providerId, models);
            }
            return next;
          });

          setProviderModelCheckedAt((prev) => {
            const next = { ...prev };
            for (const [providerId, checkedAt] of checkedAtByProvider) {
              next[providerId] = checkedAt;
            }
            return next;
          });

          for (const provider of p) {
            const currentCacheAt =
              checkedAtByProvider.get(provider.id) ?? providerModelCheckedAt[provider.id] ?? 0;
            if (provider.enabled && isModelCacheStale(currentCacheAt)) {
              void syncProviderModels(provider, { force: true, silent: true });
            }
          }
        }
      })
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
    } catch {
      /* ignore */
    }
  }

  /* ── Model selection ─────────────────────────────── */
  const selectModel = useCallback((providerId: string, modelId: string) => {
    setSelectedProviderId(providerId);
    setSelectedModelId(modelId);
    localStorage.setItem(SELECTED_PROVIDER_KEY, providerId);
    localStorage.setItem(SELECTED_MODEL_KEY, modelId);
  }, []);

  const syncProviderModels = useCallback(
    async (provider: ProviderSettings, options: { force?: boolean; silent?: boolean } = {}) => {
      const currentModels = providerModels.get(provider.id) ?? [];
      const currentCacheAt =
        providerModelCheckedAt[provider.id] ?? getLatestModelSyncAt(currentModels);
      const cooldownRemaining = getModelRefreshCooldownRemainingMs(currentCacheAt);
      if (!options.force && cooldownRemaining > 0) {
        return false;
      }

      if (refreshingProviderId === provider.id) {
        return false;
      }

      setRefreshingProviderId(provider.id);
      setProviderModelCheckedAt((prev) => ({ ...prev, [provider.id]: Date.now() }));
      try {
        const detected = await detectProviderModels(provider.id, provider.baseUrl, provider.apiKey);
        const merged = mergeWithSeeds(provider.id, detected);
        setProviderModels((prev) => {
          const next = new Map(prev);
          next.set(provider.id, merged);
          return next;
        });
        void saveProviderModelCache(provider.id, merged, Date.now());

        if (selectedProviderId === provider.id) {
          const selectedStillExists = merged.some((model) => model.modelId === selectedModelId);
          if (!selectedStillExists) {
            const nextModel =
              provider.model.trim() ||
              merged.find((model) => model.isFavorite)?.modelId ||
              merged[0]?.modelId ||
              "";

            if (nextModel) {
              selectModel(provider.id, nextModel);
            }
          }
        }

        return true;
      } catch (err) {
        if (!options.silent) {
          const message = err instanceof Error ? err.message : "Model refresh failed.";
          setError(message);
        }
        return false;
      } finally {
        setRefreshingProviderId((current) => (current === provider.id ? null : current));
      }
    },
    [
      providerModelCheckedAt,
      providerModels,
      refreshingProviderId,
      selectModel,
      selectedModelId,
      selectedProviderId,
    ],
  );

  const handleToggleFavorite = useCallback(
    async (providerId: string, modelId: string) => {
      const currentModels = providerModels.get(providerId) ?? [];
      const nextModels = currentModels.map((m) =>
        m.modelId === modelId ? { ...m, isFavorite: !m.isFavorite } : m,
      );

      setProviderModels((prev) => {
        const next = new Map(prev);
        next.set(providerId, nextModels);
        return next;
      });

      void saveProviderModelCache(
        providerId,
        nextModels,
        providerModelCheckedAt[providerId] ?? getLatestModelSyncAt(nextModels) ?? Date.now(),
      );

      const current = currentModels.find((m) => m.modelId === modelId);
      await toggleModelFavorite(providerId, modelId, !(current?.isFavorite ?? false));
    },
    [providerModelCheckedAt, providerModels],
  );

  /* ── Providers ────────────────────────────────────── */
  const saveProviders = useCallback(
    async (nextProviders: ProviderSettings[]) => {
      const normalized = normalizeProviders(nextProviders);
      setProviders(normalized);
      await persistProviders(normalized);
      if (!normalized.some((p) => p.id === selectedProviderId)) {
        const nextId = normalized[0]?.id ?? DEFAULT_PROVIDERS[0].id;
        const nextModel = normalized[0]?.model ?? DEFAULT_PROVIDERS[0].model;
        selectModel(nextId, nextModel);
      }
    },
    [selectedProviderId, selectModel],
  );

  /* ── RAF flush ────────────────────────────────────── */
  function flushStream() {
    const id = streamMsgIdRef.current;
    if (!id) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              content: streamContentRef.current,
              reasoning: streamReasoningRef.current || undefined,
            }
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
    submittingRef.current = false;
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
      if (!selectedProvider || status !== "idle" || submittingRef.current) return;
      const activeModel = selectedModelId || selectedProvider.model;
      if (!activeModel) {
        setError("Pick a model before sending a message.");
        return;
      }
      submittingRef.current = true;

      /* Use the selected model, falling back to provider default */
      const providerForSubmit = { ...selectedProvider, model: activeModel };

      const userMessage = createUserMessage(content);
      const nextMessages = [...messagesRef.current, userMessage];

      const pendingId = crypto.randomUUID();
      const pendingMsg: ConversationMessage = {
        id: pendingId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        providerId: providerForSubmit.id,
        providerLabel: providerForSubmit.label,
        model: activeModel,
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
      const submitProvider = providerForSubmit;

      await streamChatCompletion(
        {
          provider: providerForSubmit,
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
            submittingRef.current = false;

            const buildFinal = (prev: ConversationMessage[]) =>
              prev.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      content: response.content || streamContentRef.current || m.content,
                      reasoning: (response.reasoning ?? streamReasoningRef.current) || undefined,
                      model: response.model || m.model,
                      inputTokens: response.inputTokens ?? undefined,
                      outputTokens: response.outputTokens ?? undefined,
                    }
                  : m,
              );

            const realModel = response.model || submitProvider.model;
            if (realModel && realModel !== submitProvider.model) {
              selectModel(submitProvider.id, realModel);
            }

            if (activeConvIdRef.current === submitConvId) {
              setMessages((prev) => {
                const final = buildFinal(prev);
                void persistConversation(
                  final,
                  { ...submitProvider, model: realModel },
                  submitConvId,
                ).then(refreshConvList);
                return final;
              });
              setStatus("idle");
            } else {
              const finalMsgs = buildFinal(messagesRef.current);
              void persistConversation(
                finalMsgs,
                { ...submitProvider, model: realModel },
                submitConvId,
              ).then(refreshConvList);
            }

            streamContentRef.current = "";
            streamReasoningRef.current = "";
          },
          onError: (err) => {
            cancelAnimationFrame(rafRef.current);
            abortRef.current = null;
            hasStartedStreamingRef.current = false;
            submittingRef.current = false;

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
    [conversationId, selectedProvider, selectedModelId, status],
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

      // Enrich assistant messages with the conversation's provider/model
      // so the model badge doesn't disappear on older messages
      const conv = conversationsRef.current.find((c) => c.id === id);
      const enrichedMsgs = msgs.map((m) =>
        m.role === "assistant" && conv
          ? { ...m, providerId: conv.providerId, model: conv.model }
          : m,
      );

      setConversationId(id);
      setMessages(enrichedMsgs);
      setError(null);
      setStatus("idle");
      setMobileSidebarOpen(false);
    },
    [saveAndAbort, status],
  );

  const handleProviderScanned = useCallback(
    (data: { id: string; label: string; baseUrl: string; model?: string }) => {
      const newProvider: ProviderSettings = {
        id: data.id || `scanned-${Date.now()}`,
        label: data.label || "Scanned Provider",
        baseUrl: data.baseUrl,
        apiKey: "",
        model: data.model || "",
        enabled: true,
      };
      /* Add to providers or update if already existing */
      setProviders((current) => {
        let existingIndex = current.findIndex((p) => p.id === data.id);
        if (existingIndex < 0) {
          existingIndex = current.findIndex((p) => p.baseUrl === data.baseUrl);
        }

        if (existingIndex >= 0) {
          const updated = [...current];
          updated[existingIndex] = {
            ...updated[existingIndex],
            label: data.label || updated[existingIndex].label,
            model: data.model || updated[existingIndex].model,
            baseUrl: data.baseUrl,
          };
          void persistProviders(updated);
          return updated;
        }
        const updated = [...current, newProvider];
        void persistProviders(updated);
        return updated;
      });
      setSettingsOpen(false);
    },
    [],
  );

  const toggleMobileSidebar = useCallback(() => setMobileSidebarOpen((v) => !v), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const refreshConversations = useCallback(() => {
    void refreshConvList();
  }, []);

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
        onDismissError={() => setError(null)}
        onModelChange={selectModel}
        onRefreshProviderModels={syncProviderModels}
        onStopStreaming={stopStreaming}
        onSubmit={submitMessage}
        onToggleFavorite={handleToggleFavorite}
        onToggleSidebar={toggleMobileSidebar}
        providerModels={providerModels}
        providers={providers}
        selectedProviderCacheAt={selectedProviderCacheAt}
        refreshingProviderId={refreshingProviderId}
        selectedModelId={selectedModelId}
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
        onProviderScanned={handleProviderScanned}
      />
    </div>
  );
}

function createConversationId() {
  return globalThis.crypto?.randomUUID?.() ?? `conversation-${Date.now()}`;
}
