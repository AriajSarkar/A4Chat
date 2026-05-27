"use client";

import { RiKey2Line } from "@remixicon/react";

export function SecuritySettings() {
    return (
        <div className="bg-surface-0 rounded-2xl border border-white/6 px-5 py-5">
            <div className="text-text-primary mb-3 flex items-center gap-3">
                <RiKey2Line size={20} />
                <h3 className="font-semibold">API keys</h3>
            </div>
            <p className="text-text-tertiary text-sm leading-6">
                Keys are stored locally for the current app profile. A dedicated OS keychain adapter
                should replace this before public release.
            </p>
        </div>
    );
}
