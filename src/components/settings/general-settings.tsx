"use client";

export function GeneralSettings() {
  return (
    <div className="space-y-5">
      <SettingRow label="Appearance" value="Dark" />
      <SettingRow label="Accent color" value="Blue" dot />
      <SettingRow label="Local data" value="SQLite" />
    </div>
  );
}

export function SettingRow({
  label,
  value,
  dot = false,
}: {
  label: string;
  value: string;
  dot?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/6 py-4">
      <span className="text-text-secondary">{label}</span>
      <span className="flex items-center gap-2 text-text-tertiary">
        {dot ? <span className="size-3 rounded-full bg-accent" /> : null}
        {value}
      </span>
    </div>
  );
}
