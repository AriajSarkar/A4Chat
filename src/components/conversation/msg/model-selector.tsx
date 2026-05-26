"use client";

import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiSearchLine,
  RiRefreshLine,
  RiStarFill,
  RiStarLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { ProviderIcon } from "@/components/settings/provider/icon";
import {
  MODEL_AUTO_REFRESH_MS,
  formatCompactDuration,
  formatModelCacheAge,
  getLatestModelSyncAt,
  getModelRefreshCooldownRemainingMs,
  isModelCacheStale,
  type ProviderModel,
  type ProviderSettings,
} from "@/components/settings/utils/providers";
import { cn } from "@/lib/cn";

type ModelSelectorProps = {
  providers: ProviderSettings[];
  providerModels: Map<string, ProviderModel[]>;
  selectedProviderCacheAt: number;
  selectedProviderId: string;
  selectedModelId: string;
  isActive: boolean;
  onSelect: (providerId: string, modelId: string) => void;
  onRefreshProviderModels: (
    provider: ProviderSettings,
    options?: { force?: boolean; silent?: boolean },
  ) => Promise<boolean>;
  onToggleFavorite: (providerId: string, modelId: string) => void;
  refreshingProviderId: string | null;
};

type FlatModel = {
  providerId: string;
  providerLabel: string;
  modelId: string;
  displayName: string;
  isFavorite: boolean;
};

export const ModelSelector = memo(function ModelSelector({
  providers,
  providerModels,
  selectedProviderCacheAt,
  selectedProviderId,
  selectedModelId,
  isActive,
  onSelect,
  onRefreshProviderModels,
  onToggleFavorite,
  refreshingProviderId,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [clock, setClock] = useState(() => Date.now());
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>(undefined);
  const deferredSearch = useDeferredValue(search);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const autoRefreshKeyRef = useRef<string>("");

  const enabledProviders = useMemo(() => providers.filter((p) => p.enabled), [providers]);

  /* Build flat model list across all providers */
  const allModels = useMemo<FlatModel[]>(() => {
    const result: FlatModel[] = [];
    for (const provider of enabledProviders) {
      const models = providerModels.get(provider.id) ?? [];
      if (models.length > 0) {
        for (const model of models) {
          result.push({
            providerId: provider.id,
            providerLabel: provider.label,
            modelId: model.modelId,
            displayName: model.displayName || model.modelId,
            isFavorite: model.isFavorite,
          });
        }
      } else {
        const fallbackModel = provider.model.trim();
        if (fallbackModel) {
          result.push({
            providerId: provider.id,
            providerLabel: provider.label,
            modelId: fallbackModel,
            displayName: fallbackModel,
            isFavorite: false,
          });
        }
      }
    }
    return result;
  }, [enabledProviders, providerModels]);

  const selectedProvider = enabledProviders.find((provider) => provider.id === selectedProviderId);
  const selectedProviderModels = providerModels.get(selectedProviderId) ?? [];
  const cacheAt = selectedProviderCacheAt || getLatestModelSyncAt(selectedProviderModels);
  const cacheAgeLabel = formatModelCacheAge(cacheAt, clock);
  const refreshCooldownRemainingMs = getModelRefreshCooldownRemainingMs(cacheAt, clock);
  const isRefreshInProgress = refreshingProviderId === selectedProviderId;
  const isRefreshCoolingDown = refreshCooldownRemainingMs > 0;
  const canRefreshModels = Boolean(
    selectedProvider && !isRefreshInProgress && !isRefreshCoolingDown,
  );
  const refreshLabel = isRefreshInProgress
    ? "Refreshing…"
    : isRefreshCoolingDown
      ? `Retry in ${formatCompactDuration(refreshCooldownRemainingMs)}`
      : "Refresh models";
  const refreshTooltip = isRefreshInProgress
    ? "Refreshing cached models"
    : isRefreshCoolingDown
      ? `Wait ${formatCompactDuration(refreshCooldownRemainingMs)} before refreshing again`
      : `Refresh models from ${selectedProvider?.label ?? "this provider"}`;

  /* Filter by search + tab */
  const filteredModels = useMemo(() => {
    let list = allModels;

    if (activeTab === "favorites") {
      list = list.filter((m) => m.isFavorite);
    } else if (activeTab !== "all") {
      list = list.filter((m) => m.providerId === activeTab);
    }

    const q = deferredSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (m) =>
          m.modelId.toLowerCase().includes(q) ||
          m.displayName.toLowerCase().includes(q) ||
          m.providerLabel.toLowerCase().includes(q),
      );
    }

    /* Sort: favorites first, then alphabetical */
    return list.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [allModels, activeTab, deferredSearch]);

  const renderedModelList = useMemo(() => {
    if (filteredModels.length === 0) {
      return <p className="px-4 py-6 text-center text-sm text-text-quaternary">No models found</p>;
    }

    return filteredModels.map((model) => {
      const isSelected =
        model.providerId === selectedProviderId && model.modelId === selectedModelId;
      return (
        <div
          className={cn(
            "group/model flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors",
            isSelected
              ? "bg-accent/8 text-accent-soft"
              : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
          )}
          key={`${model.providerId}:${model.modelId}`}
          onClick={() => {
            onSelect(model.providerId, model.modelId);
            setOpen(false);
          }}
          role="button"
          tabIndex={0}
        >
          <ProviderIcon providerId={model.providerId} size={20} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{model.displayName}</p>
            <p className="truncate text-[11px] text-text-quaternary">{model.providerLabel}</p>
          </div>
          {isSelected ? <RiCheckLine className="shrink-0 text-accent" size={16} /> : null}
          <button
            aria-label={model.isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded transition-all hover:text-yellow-400",
              model.isFavorite
                ? "text-yellow-400"
                : "text-text-quaternary opacity-0 group-hover/model:opacity-100",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(model.providerId, model.modelId);
            }}
            type="button"
          >
            {model.isFavorite ? <RiStarFill size={14} /> : <RiStarLine size={14} />}
          </button>
        </div>
      );
    });
  }, [filteredModels, selectedProviderId, selectedModelId, onSelect, onToggleFavorite]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: PointerEvent) {
      const isOutsideTrigger =
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node);
      const isOutsidePanel = !panelRef.current || !panelRef.current.contains(e.target as Node);

      if (isOutsideTrigger && isOutsidePanel) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [open]);

  /* Focus search on open */
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setSearch("");
      setActiveTab("all");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePanelPosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const maxPanelWidth = Math.min(480, window.innerWidth - 16);
      const preferredPanelHeight = Math.min(window.innerHeight * 0.72, 576);

      // Calculate available space using viewport height
      const spaceBelow = window.innerHeight - trigger.bottom - 12;
      const spaceAbove = trigger.top - 12;
      const shouldOpenBelow = spaceBelow >= 300 || spaceBelow >= spaceAbove;

      const left = Math.max(8, Math.min(trigger.left, window.innerWidth - maxPanelWidth - 8));

      const availableHeight = shouldOpenBelow ? spaceBelow : spaceAbove;
      const maxHeight = Math.min(preferredPanelHeight, availableHeight);

      const newStyle = shouldOpenBelow
        ? { left, top: trigger.bottom + 8, width: maxPanelWidth, maxHeight }
        : { left, bottom: window.innerHeight - trigger.top + 8, width: maxPanelWidth, maxHeight };

      setPanelStyle((prev) => {
        if (
          prev &&
          prev.left === newStyle.left &&
          prev.top === newStyle.top &&
          prev.bottom === newStyle.bottom &&
          prev.width === newStyle.width &&
          prev.maxHeight === newStyle.maxHeight
        ) {
          return prev;
        }
        return newStyle;
      });
    };

    updatePanelPosition();
    const timer = window.setInterval(() => setClock(Date.now()), 1000);

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (!selectedProvider || isRefreshInProgress || !isModelCacheStale(cacheAt, clock)) {
      return;
    }

    const refreshKey = `${selectedProvider.id}:${Math.floor(Math.max(0, clock - cacheAt) / MODEL_AUTO_REFRESH_MS)}`;
    if (autoRefreshKeyRef.current === refreshKey) {
      return;
    }

    autoRefreshKeyRef.current = refreshKey;
    void onRefreshProviderModels(selectedProvider, { force: true, silent: true });
  }, [cacheAt, clock, isRefreshInProgress, onRefreshProviderModels, open, selectedProvider]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* Current selection label */
  const currentModel = allModels.find(
    (m) => m.providerId === selectedProviderId && m.modelId === selectedModelId,
  );
  const displayLabel = currentModel?.displayName ?? (selectedModelId || "Select model");
  const displayProvider = currentModel?.providerLabel ?? selectedProvider?.label ?? "";

  /* Tabs for sidebar */
  const tabs = useMemo(() => {
    const t: { id: string; label: string }[] = [{ id: "all", label: "All" }];
    const hasFavorites = allModels.some((m) => m.isFavorite);
    if (hasFavorites) {
      t.push({ id: "favorites", label: "Favorites" });
    }
    for (const p of enabledProviders) {
      t.push({ id: p.id, label: p.label });
    }
    return t;
  }, [enabledProviders, allModels]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-text-tertiary transition-colors hover:bg-white/6 md:gap-2 md:px-3 md:py-2 md:text-sm"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <ProviderIcon providerId={selectedProviderId} size={16} />
        <span
          className={cn(
            "size-1.5 rounded-full bg-accent transition-shadow md:size-2",
            isActive && "animate-pulse shadow-[0_0_8px_rgba(61,139,255,0.5)]",
          )}
        />
        <span className="max-w-28 truncate sm:max-w-40 md:max-w-48">{displayLabel}</span>
        <RiArrowDownSLine
          className={cn("transition-transform duration-150", open && "rotate-180")}
          size={14}
        />
      </button>

      {/* Dropdown panel via Portal */}
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  ref={panelRef}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="model-selector-panel fixed z-50 flex max-h-[min(72dvh,36rem)] w-[min(30rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-white/8 bg-neutral-900/95 shadow-2xl shadow-black/50 backdrop-blur-md"
                  style={panelStyle}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                >
                  {/* Search header */}
                  <div className="flex shrink-0 items-center gap-2 border-b border-white/6 px-3 py-2.5">
                    <RiSearchLine className="shrink-0 text-text-quaternary" size={16} />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-quaternary"
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search models..."
                      ref={searchRef}
                      type="text"
                      value={search}
                    />
                    <button
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                        canRefreshModels
                          ? "bg-white/6 text-text-secondary hover:bg-white/8 hover:text-text-primary"
                          : "bg-white/4 text-text-quaternary",
                      )}
                      disabled={!canRefreshModels}
                      onClick={() => {
                        if (!selectedProvider) return;
                        void onRefreshProviderModels(selectedProvider, {
                          force: false,
                          silent: false,
                        });
                      }}
                      title={refreshTooltip}
                      type="button"
                    >
                      <RiRefreshLine
                        className={cn(
                          "shrink-0 transition-transform",
                          isRefreshInProgress && "animate-spin",
                        )}
                        size={14}
                      />
                      <span className="hidden sm:inline">{refreshLabel}</span>
                    </button>
                    <button
                      className="grid size-6 shrink-0 place-items-center rounded-md text-text-quaternary transition-colors hover:bg-white/8 hover:text-text-secondary"
                      onClick={() => setOpen(false)}
                      type="button"
                    >
                      <RiCloseLine size={16} />
                    </button>
                  </div>

                  {/* Mobile tabs */}
                  <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/6 px-2 py-1.5 md:hidden">
                    {tabs.map((tab) => (
                      <button
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors",
                          activeTab === tab.id
                            ? "bg-white/10 text-text-primary"
                            : "text-text-quaternary",
                        )}
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Desktop: sidebar + list side-by-side */}
                  <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                    {/* Provider tabs sidebar — desktop only */}
                    <div className="hidden w-10 shrink-0 flex-col items-center gap-1 border-r border-white/6 py-2 md:flex">
                      {tabs.map((tab) => (
                        <button
                          className={cn(
                            "grid size-8 place-items-center rounded-lg transition-colors",
                            activeTab === tab.id
                              ? "bg-white/10 text-text-primary"
                              : "text-text-quaternary hover:bg-white/6 hover:text-text-secondary",
                          )}
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          title={tab.label}
                          type="button"
                        >
                          {tab.id === "all" ? (
                            <span className="text-xs font-bold">All</span>
                          ) : tab.id === "favorites" ? (
                            <RiStarFill size={16} />
                          ) : (
                            <ProviderIcon providerId={tab.id} size={18} />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Model list */}
                    <div className="min-w-0 flex-1 overflow-y-auto py-1">{renderedModelList}</div>
                  </div>

                  {/* Footer — current selection */}
                  <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/6 px-3 py-2">
                    <ProviderIcon providerId={selectedProviderId} size={16} />
                    <span className="truncate text-xs font-medium text-text-secondary">
                      {displayLabel}
                    </span>
                    <span className="text-xs text-text-quaternary">•</span>
                    <span className="truncate text-xs text-text-quaternary">{displayProvider}</span>
                    <span className="ml-auto truncate text-[11px] text-text-quaternary">
                      {cacheAgeLabel}
                    </span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
});
