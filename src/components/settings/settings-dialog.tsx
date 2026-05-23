"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  RiCloseLine,
  RiDatabase2Line,
  RiKey2Line,
  RiSettings3Line,
  RiShieldUserLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";

import { normalizeProviders, type ProviderSettings } from "@/components/settings/utils/providers";
import { cn } from "@/lib/cn";

type SettingsDialogProps = {
  open: boolean;
  providers: ProviderSettings[];
  onClose: () => void;
  onSave: (providers: ProviderSettings[]) => Promise<void>;
};

const sections = [
  { id: "general", label: "General", icon: RiSettings3Line },
  { id: "providers", label: "Providers", icon: RiDatabase2Line },
  { id: "security", label: "Security", icon: RiShieldUserLine },
] as const;

export function SettingsDialog({ open, providers, onClose, onSave }: SettingsDialogProps) {
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
    } finally {
      setSaving(false);
    }
  }

  function updateProvider(providerId: string, patch: Partial<ProviderSettings>) {
    setDraftProviders((current) =>
      current.map((p) => (p.id === providerId ? { ...p, ...patch } : p)),
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-3 py-5 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.form
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex h-[min(760px,92dvh)] w-[min(960px,96vw)] overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-1 shadow-2xl shadow-black/40 md:rounded-3xl"
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            onSubmit={handleSubmit}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            {/* Desktop sidebar nav */}
            <aside className="hidden w-60 shrink-0 border-r border-white/[0.06] p-3 md:block">
              <button
                aria-label="Close settings"
                className="mb-4 grid size-11 place-items-center rounded-xl bg-white/[0.06] text-text-secondary transition-colors hover:bg-white/[0.1]"
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
                          ? "bg-white/[0.08] text-text-primary"
                          : "text-text-secondary hover:bg-white/[0.05]",
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
              <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-white/[0.06] bg-surface-1/95 px-5 backdrop-blur md:h-16 md:px-8">
                <h2 className="text-lg font-semibold text-text-primary md:text-xl">Settings</h2>
                <button
                  aria-label="Close settings"
                  className="grid size-10 place-items-center rounded-xl text-text-secondary transition-colors hover:bg-white/[0.08] md:hidden"
                  onClick={onClose}
                  type="button"
                >
                  <RiCloseLine size={22} />
                </button>
              </div>
              {/* Mobile tabs */}
              <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-5 py-2.5 md:hidden">
                {sections.map((section) => (
                  <button
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm transition-colors",
                      activeSection === section.id
                        ? "bg-white/[0.1] text-text-primary"
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
                  <ProviderSettingsEditor providers={draftProviders} onChange={updateProvider} />
                ) : null}
                {activeSection === "security" ? <SecuritySettings /> : null}
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/[0.06] bg-surface-1/95 px-5 py-4 backdrop-blur md:px-8">
                <button
                  className="rounded-full px-4 py-2 text-sm text-text-tertiary transition-colors hover:bg-white/[0.06]"
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

function GeneralSettings() {
  return (
    <div className="space-y-5">
      <SettingRow label="Appearance" value="Dark" />
      <SettingRow label="Accent color" value="Blue" dot />
      <SettingRow label="Local data" value="SQLite" />
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-surface-0 px-5 py-5">
      <div className="mb-3 flex items-center gap-3 text-text-primary">
        <RiKey2Line size={20} />
        <h3 className="font-semibold">API keys</h3>
      </div>
      <p className="text-sm leading-6 text-text-tertiary">
        Keys are stored locally for the current app profile. A dedicated OS keychain adapter should
        replace this before public release.
      </p>
    </div>
  );
}

function ProviderSettingsEditor({
  providers,
  onChange,
}: {
  providers: ProviderSettings[];
  onChange: (providerId: string, patch: Partial<ProviderSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      {providers.map((provider) => (
        <div
          className="rounded-2xl border border-white/[0.06] bg-surface-0/60 p-4 md:p-5"
          key={provider.id}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">{provider.label}</h3>
              <p className="text-xs text-text-quaternary">{provider.id}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                checked={provider.enabled}
                className="peer sr-only"
                onChange={(e) => onChange(provider.id, { enabled: e.target.checked })}
                type="checkbox"
              />
              <span className="h-7 w-12 rounded-full bg-white/[0.1] transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-text-secondary after:transition-all peer-checked:bg-accent peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
            </label>
          </div>
          <div className="grid gap-4">
            <Field
              label="Base URL"
              onChange={(v) => onChange(provider.id, { baseUrl: v })}
              value={provider.baseUrl}
            />
            <Field
              label="Model"
              onChange={(v) => onChange(provider.id, { model: v })}
              value={provider.model}
            />
            <Field
              label="API key"
              onChange={(v) => onChange(provider.id, { apiKey: v })}
              type="password"
              value={provider.apiKey}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: "password" | "text";
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-text-tertiary">
      {label}
      <input
        className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-text-primary outline-none transition-colors placeholder:text-text-quaternary focus:border-accent/50 focus:bg-white/[0.05]"
        onChange={(e) => onChange(e.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function SettingRow({
  label,
  value,
  dot = false,
}: {
  label: string;
  value: string;
  dot?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] py-4">
      <span className="text-text-secondary">{label}</span>
      <span className="flex items-center gap-2 text-text-tertiary">
        {dot ? <span className="size-3 rounded-full bg-accent" /> : null}
        {value}
      </span>
    </div>
  );
}
