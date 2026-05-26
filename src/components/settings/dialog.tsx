"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  RiCloseLine,
  RiDatabase2Line,
  RiDownloadCloud2Line,
  RiQrCodeLine,
  RiSettings3Line,
  RiShieldUserLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { GeneralSettings } from "@/components/Settings/General";
import { ProviderList } from "@/components/Settings/Provider/List";
import { QrPairingSection } from "@/components/Settings/Pairing";
import { SecuritySettings } from "@/components/Settings/Security";
import { UpdatePanel } from "@/components/Settings/Update/Panel";
import { normalizeProviders, type ProviderSettings } from "@/lib/Providers";
import { cn } from "@/lib/cn";

type SettingsDialogProps = {
  open: boolean;
  providers: ProviderSettings[];
  onClose: () => void;
  onSave: (providers: ProviderSettings[]) => Promise<void>;
  onProviderScanned?: (data: {
    id: string;
    label: string;
    baseUrl: string;
    model?: string;
  }) => void;
};

const sections = [
  { id: "general", label: "General", icon: RiSettings3Line },
  { id: "providers", label: "Providers", icon: RiDatabase2Line },
  { id: "updates", label: "Updates", icon: RiDownloadCloud2Line },
  { id: "connect", label: "Connect", icon: RiQrCodeLine },
  { id: "security", label: "Security", icon: RiShieldUserLine },
] as const;

export function SettingsDialog({
  open,
  providers,
  onClose,
  onSave,
  onProviderScanned,
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>("providers");
  const [draftProviders, setDraftProviders] = useState(providers);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftProviders(providers);
    }
  }, [open, providers]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(normalizeProviders(draftProviders));
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const updateProvider = useCallback((providerId: string, patch: Partial<ProviderSettings>) => {
    setDraftProviders((current) =>
      current.map((p) => (p.id === providerId ? { ...p, ...patch } : p)),
    );
  }, []);

  const addProvider = useCallback((provider: ProviderSettings) => {
    setDraftProviders((current) => [...current, provider]);
  }, []);

  const deleteProvider = useCallback((providerId: string) => {
    setDraftProviders((current) => current.filter((p) => p.id !== providerId));
  }, []);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-0 py-0 backdrop-blur-sm sm:px-3 sm:py-5"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.form
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="safe-top safe-bottom flex h-dvh w-full overflow-hidden border-white/8 bg-surface-1 shadow-2xl shadow-black/40 sm:h-[min(760px,92dvh)] sm:w-[min(960px,96vw)] sm:rounded-2xl sm:border md:rounded-3xl"
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            onSubmit={handleSubmit}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            {/* Desktop sidebar nav */}
            <aside className="hidden w-60 shrink-0 border-r border-white/6 p-3 md:block">
              <button
                aria-label="Close settings"
                className="mb-4 grid size-11 place-items-center rounded-xl bg-white/6 text-text-secondary transition-colors hover:bg-white/10"
                onClick={onClose}
                type="button"
              >
                <RiCloseLine size={22} />
              </button>
              <nav className="space-y-0.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      className={cn(
                        "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors",
                        activeSection === section.id
                          ? "bg-white/8 text-text-primary"
                          : "text-text-secondary hover:bg-white/5",
                      )}
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      type="button"
                    >
                      <Icon size={20} />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Content area */}
            <section className="min-w-0 flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-white/6 bg-surface-1/95 px-5 backdrop-blur md:h-16 md:px-8">
                <h2 className="text-lg font-semibold text-text-primary md:text-xl">Settings</h2>
                <button
                  aria-label="Close settings"
                  className="grid size-10 place-items-center rounded-xl text-text-secondary transition-colors hover:bg-white/8 md:hidden"
                  onClick={onClose}
                  type="button"
                >
                  <RiCloseLine size={22} />
                </button>
              </div>
              {/* Mobile tabs */}
              <div className="flex gap-1.5 overflow-x-auto border-b border-white/6 px-5 py-2.5 md:hidden">
                {sections.map((section) => (
                  <button
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
                      activeSection === section.id
                        ? "bg-white/10 text-text-primary"
                        : "text-text-tertiary hover:text-text-secondary",
                    )}
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    type="button"
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              <div className="px-5 py-6 md:px-8">
                {activeSection === "general" ? <GeneralSettings /> : null}
                {activeSection === "providers" ? (
                  <ProviderList
                    onAddProvider={addProvider}
                    onDeleteProvider={deleteProvider}
                    onUpdateProvider={updateProvider}
                    providers={draftProviders}
                  />
                ) : null}
                {activeSection === "updates" ? <UpdatePanel /> : null}
                {activeSection === "connect" ? (
                  <QrPairingSection
                    providers={draftProviders}
                    onProviderScanned={onProviderScanned}
                  />
                ) : null}
                {activeSection === "security" ? <SecuritySettings /> : null}
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/6 bg-surface-1/95 px-5 py-4 backdrop-blur md:px-8">
                <button
                  className="rounded-full px-4 py-2 text-sm text-text-tertiary transition-colors hover:bg-white/6"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(61,139,255,0.2)] transition-all hover:shadow-[0_0_24px_rgba(61,139,255,0.35)] disabled:opacity-50 disabled:shadow-none"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </section>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
