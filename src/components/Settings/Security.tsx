"use client";

import { RiKey2Line } from "@remixicon/react";

export function SecuritySettings() {
  return (
    <div className="rounded-2xl border border-white/6 bg-surface-0 px-5 py-5">
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
