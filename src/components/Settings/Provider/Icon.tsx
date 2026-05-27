"use client";

import { memo } from "react";

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
        comfyui: "#a855f7",
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
