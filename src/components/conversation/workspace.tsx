"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createAssistantMessage,
  createUserMessage,
  toCompletionMessages,
  type ConversationMessage,
} from "@/components/conversation/utils/conversation";
import { ConversationView } from "@/components/conversation/view";
import { NavigationSidebar } from "@/components/nav/sidebar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import {
  DEFAULT_PROVIDERS,
  findActiveProvider,
  normalizeProviders,
  type ProviderSettings,
} from "@/components/settings/utils/providers";
import {
  getAppHealth,
  loadProviders,
  persistConversation,
  persistProviders,
  sendChatCompletion,
  type AppHealth,
} from "@/lib/native";

const PROVIDER_STORAGE_KEY = "a4chat.providers";
const SELECTED_PROVIDER_KEY = "a4chat.selectedProvider";

export function ConversationWorkspace() {
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState(DEFAULT_PROVIDERS[0].id);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState(createConversationId);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<AppHealth | null>(null);

  const selectedProvider = useMemo(
    () => findActiveProvider(providers, selectedProviderId),
    [providers, selectedProviderId],
  );

  useEffect(() => {
    const storedProviders = localStorage.getItem(PROVIDER_STORAGE_KEY);
    const storedSelectedProvider = localStorage.getItem(SELECTED_PROVIDER_KEY);

    if (storedProviders) {
      try {
        setProviders(normalizeProviders(JSON.parse(storedProviders)));
      } catch {
        localStorage.removeItem(PROVIDER_STORAGE_KEY);
      }
    }

    if (storedSelectedProvider) {
      setSelectedProviderId(storedSelectedProvider);
    }

    void getAppHealth()
      .then(setHealth)
      .catch(() => setHealth(null));

    void loadProviders()
      .then((nativeProviders) => {
        if (nativeProviders?.length) {
          setProviders(nativeProviders);
        }
      })
      .catch(() => undefined);
  }, []);

  const saveProviders = useCallback(
    async (nextProviders: ProviderSettings[]) => {
      const normalized = normalizeProviders(nextProviders);
      setProviders(normalized);
      localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(normalized));
      await persistProviders(normalized);

      if (!normalized.some((provider) => provider.id === selectedProviderId)) {
        const nextSelectedProvider = normalized[0]?.id ?? DEFAULT_PROVIDERS[0].id;
        setSelectedProviderId(nextSelectedProvider);
        localStorage.setItem(SELECTED_PROVIDER_KEY, nextSelectedProvider);
      }
    },
    [selectedProviderId],
  );

  const selectProvider = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
    localStorage.setItem(SELECTED_PROVIDER_KEY, providerId);
  }, []);

  const submitMessage = useCallback(
    async (content: string) => {
      if (!selectedProvider || status === "sending") {
        return;
      }

      const userMessage = createUserMessage(content);
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setStatus("sending");
      setError(null);

      try {
        const response = await sendChatCompletion({
          provider: selectedProvider,
          messages: toCompletionMessages(nextMessages),
        });
        const assistantMessage = createAssistantMessage(response, selectedProvider);
        const completedMessages = [...nextMessages, assistantMessage];
        setMessages(completedMessages);
        await persistConversation(completedMessages, selectedProvider, conversationId);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Provider request failed.");
      } finally {
        setStatus("idle");
      }
    },
    [conversationId, messages, selectedProvider, status],
  );

  const resetConversation = useCallback(() => {
    setConversationId(createConversationId());
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div className="flex h-dvh min-h-dvh overflow-hidden bg-background text-foreground">
      <NavigationSidebar
        expanded={sidebarExpanded}
        health={health}
        onNewConversation={resetConversation}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleExpanded={() => setSidebarExpanded((value) => !value)}
      />
      <ConversationView
        error={error}
        messages={messages}
        onOpenSettings={() => setSettingsOpen(true)}
        onProviderChange={selectProvider}
        onSubmit={submitMessage}
        providers={providers}
        selectedProviderId={selectedProvider?.id ?? selectedProviderId}
        status={status}
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
