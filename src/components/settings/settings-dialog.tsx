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
      current.map((provider) =>
        provider.id === providerId ? { ...provider, ...patch } : provider,
      ),
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/62 px-3 py-5 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <motion.form
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex h-[min(760px,92dvh)] w-[min(960px,96vw)] overflow-hidden rounded-3xl border border-white/10 bg-[#202124] shadow-2xl"
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            onSubmit={handleSubmit}
          >
            <aside className="hidden w-64 shrink-0 border-r border-white/8 p-3 md:block">
              <button
                aria-label="Close settings"
                className="mb-4 grid size-12 place-items-center rounded-xl bg-white/8 text-white/88 transition hover:bg-white/12"
                onClick={onClose}
                type="button"
              >
                <RiCloseLine size={24} />
              </button>
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;

                  return (
                    <button
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-white/84 transition",
                        activeSection === section.id ? "bg-white/10" : "hover:bg-white/8",
                      )}
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      type="button"
                    >
                      <Icon size={21} />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <section className="min-w-0 flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/10 bg-[#202124]/95 px-5 backdrop-blur md:px-8">
                <h2 className="text-xl font-semibold text-white">Settings</h2>
                <button
                  aria-label="Close settings"
                  className="grid size-10 place-items-center rounded-xl text-white/82 transition hover:bg-white/10 md:hidden"
                  onClick={onClose}
                  type="button"
                >
                  <RiCloseLine size={24} />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto border-b border-white/8 px-5 py-3 md:hidden">
                {sections.map((section) => (
                  <button
                    className={cn(
                      "rounded-full px-3 py-2 text-sm text-white/74",
                      activeSection === section.id && "bg-white/10 text-white",
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

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-[#202124]/95 px-5 py-4 backdrop-blur md:px-8">
                <button
                  className="rounded-full px-4 py-2 text-sm text-white/74 transition hover:bg-white/8"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-55"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "Saving" : "Save"}
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
    <div className="space-y-6">
      <SettingRow label="Appearance" value="Dark" />
      <SettingRow label="Accent color" value="Blue" dot />
      <SettingRow label="Local data" value="SQLite" />
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black px-5 py-5">
      <div className="mb-3 flex items-center gap-3 text-white">
        <RiKey2Line size={22} />
        <h3 className="font-semibold">API keys</h3>
      </div>
      <p className="text-sm leading-6 text-white/62">
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
    <div className="space-y-5">
      {providers.map((provider) => (
        <div
          className="rounded-2xl border border-white/10 bg-black/40 p-4 md:p-5"
          key={provider.id}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">{provider.label}</h3>
              <p className="text-xs text-white/44">{provider.id}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                checked={provider.enabled}
                className="peer sr-only"
                onChange={(event) => onChange(provider.id, { enabled: event.target.checked })}
                type="checkbox"
              />
              <span className="h-7 w-12 rounded-full bg-white/14 transition after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:bg-accent peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className="grid gap-4">
            <Field
              label="Base URL"
              onChange={(value) => onChange(provider.id, { baseUrl: value })}
              value={provider.baseUrl}
            />
            <Field
              label="Model"
              onChange={(value) => onChange(provider.id, { model: value })}
              value={provider.model}
            />
            <Field
              label="API key"
              onChange={(value) => onChange(provider.id, { apiKey: value })}
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
    <label className="grid gap-2 text-sm text-white/68">
      {label}
      <input
        className="h-11 rounded-xl border border-white/10 bg-white/6 px-3 text-white outline-none transition placeholder:text-white/30 focus:border-accent/70"
        onChange={(event) => onChange(event.target.value)}
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
    <div className="flex items-center justify-between border-b border-white/10 py-4">
      <span className="text-white/88">{label}</span>
      <span className="flex items-center gap-2 text-white/72">
        {dot ? <span className="size-3 rounded-full bg-accent" /> : null}
        {value}
      </span>
    </div>
  );
}
