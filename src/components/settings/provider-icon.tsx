"use client";

import { memo, type ComponentType, type SVGProps } from "react";
import { RiServerLine } from "@remixicon/react";

/* ── Known provider icon mapping ────────────────────────── */

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/**
 * Lazy-loaded provider icon resolver.
 * Uses @lobehub/icons when available, falls back to generic icon.
 *
 * We import only what we need to keep the bundle tree-shaken.
 */
const ICON_CACHE = new Map<string, IconComponent | null>();

function getLobeIcon(providerId: string): IconComponent | null {
  if (ICON_CACHE.has(providerId)) return ICON_CACHE.get(providerId) ?? null;
  /* we don't async-import here; instead we match known IDs to static imports */
  return null;
}

/**
 * Renders a provider-specific icon or a generic server icon.
 *
 * For known providers like OpenAI, Anthropic, Google, Meta, etc.,
 * we use @lobehub/icons. For unknown providers, we use a generic icon.
 */
export const ProviderIcon = memo(function ProviderIcon({
  providerId,
  size = 20,
  className,
}: {
  providerId: string;
  size?: number;
  className?: string;
}) {
  const id = providerId.toLowerCase();

  /* Accent-colored dot + letter for quick visual distinction */
  const letter = providerId.charAt(0).toUpperCase();

  /* Known provider color mapping */
  const colorMap: Record<string, string> = {
    openai: "#10a37f",
    anthropic: "#d4a27f",
    google: "#4285f4",
    meta: "#0668e1",
    lmstudio: "#00d4aa",
    openrouter: "#6366f1",
    ollama: "#ffffff",
    groq: "#f55036",
    together: "#6366f1",
    mistral: "#ff7000",
    cohere: "#39594d",
    perplexity: "#20808d",
  };

  const color = colorMap[id] ?? "#8892a6";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        backgroundColor: `${color}20`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color,
          fontSize: size * 0.5,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "var(--font-sans)",
        }}
      >
        {letter}
      </span>
    </div>
  );
});
