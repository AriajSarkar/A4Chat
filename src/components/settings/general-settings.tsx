"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauriRuntime, isAndroid } from "@/lib/native";

export function GeneralSettings() {
  const [saveLocation, setSaveLocation] = useState<string>("");

  useEffect(() => {
    if (!isTauriRuntime()) return;
    
    const loc = localStorage.getItem("a4chat_save_location");
    if (loc) {
      setSaveLocation(loc);
    } else if (!isAndroid()) {
      invoke<string>("get_default_save_dir").then((dir) => {
        setSaveLocation(dir);
        localStorage.setItem("a4chat_save_location", dir);
      }).catch(console.error);
    }
  }, []);

  const handleBrowse = async () => {
    if (!isTauriRuntime()) return;
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: saveLocation || undefined,
      });
      if (selected && typeof selected === "string") {
        setSaveLocation(selected);
        localStorage.setItem("a4chat_save_location", selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      <SettingRow label="Appearance" value="Dark" />
      <SettingRow label="Accent color" value="Blue" dot />
      <SettingRow label="Local data" value="SQLite" />
      
      {isTauriRuntime() ? (
        isAndroid() ? (
          <div className="flex items-center justify-between border-b border-white/6 py-4">
            <span className="text-text-secondary">Auto-save to Gallery (DCIM)</span>
            <button
              onClick={() => {
                if (saveLocation) {
                  setSaveLocation("");
                  localStorage.removeItem("a4chat_save_location");
                } else {
                  const loc = "/storage/emulated/0/DCIM/A4chat";
                  setSaveLocation(loc);
                  localStorage.setItem("a4chat_save_location", loc);
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${saveLocation ? "bg-accent" : "bg-white/20"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${saveLocation ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border-b border-white/6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Auto-save Images To</span>
              <button
                onClick={handleBrowse}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Browse
              </button>
            </div>
            <span className="break-all text-sm text-text-tertiary">
              {saveLocation || "Loading..."}
            </span>
          </div>
        )
      ) : null}
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
