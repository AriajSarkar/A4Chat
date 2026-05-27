"use client";

import { RiAddLine, RiCloseLine, RiSendPlane2Fill, RiStopCircleFill } from "@remixicon/react";
import { FormEvent, memo, useCallback, useEffect, useRef, useState } from "react";

import { ModelSelector } from "@/components/Conversation/Message/ModelSelector";
import { cn } from "@/lib/cn";
import type { ProviderModel, ProviderSettings } from "@/lib/Providers";

type MessageComposerProps = {
    disabled: boolean;
    providers: ProviderSettings[];
    providerModels: Map<string, ProviderModel[]>;
    selectedProviderCacheAt: number;
    selectedProviderId: string;
    selectedModelId: string;
    status: "idle" | "sending" | "streaming";
    onModelChange: (providerId: string, modelId: string) => void;
    onRefreshProviderModels: (
        provider: ProviderSettings,
        options?: { force?: boolean; silent?: boolean },
    ) => Promise<boolean>;
    onToggleFavorite: (providerId: string, modelId: string) => void;
    onStopStreaming: () => void;
    onSubmit: (content: string, images?: string[]) => Promise<void>;
    refreshingProviderId: string | null;
};

export const MessageComposer = memo(function MessageComposer({
    disabled,
    providers,
    providerModels,
    selectedProviderCacheAt,
    selectedProviderId,
    selectedModelId,
    status,
    onModelChange,
    onRefreshProviderModels,
    onToggleFavorite,
    onStopStreaming,
    onSubmit,
    refreshingProviderId,
}: MessageComposerProps) {
    const [value, setValue] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canSubmit = (value.trim().length > 0 || images.length > 0) && !disabled;
    const isActive = status === "sending" || status === "streaming";

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }, [value]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        const nextValue = value.trim();
        const currentImages = [...images];
        setValue("");
        setImages([]);
        textareaRef.current!.style.height = "auto";
        await onSubmit(nextValue, currentImages);
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Run all image compressions in parallel (blazingly fast for multiple files)
        const newImages = (
            await Promise.all(
                Array.from(files)
                    .filter((file) => file.type.startsWith("image/"))
                    .map((file) =>
                        compressImage(file, 1024, 1024, 0.8).catch((err) => {
                            console.error("Failed to compress image:", err);
                            return null;
                        }),
                    ),
            )
        ).filter(Boolean) as string[];

        setImages((prev) => [...prev, ...newImages]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleModelSelect = useCallback(
        (providerId: string, modelId: string) => {
            onModelChange(providerId, modelId);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 10);
        },
        [onModelChange],
    );

    return (
        <form
            className="focus-within:border-accent/40 relative mx-auto flex w-full max-w-4xl flex-col rounded-2xl border border-white/8 bg-white/3 shadow-lg shadow-black/20 backdrop-blur-xl transition-colors duration-200 md:rounded-3xl"
            onSubmit={handleSubmit}
        >
            {/* Images Row */}
            {images.length > 0 && (
                <div className="flex flex-wrap gap-2 px-2 pt-2 md:px-3 md:pt-3">
                    {images.map((src, idx) => (
                        <div
                            key={idx}
                            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 md:h-20 md:w-20"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={src}
                                alt="attachment"
                                className="h-full w-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                <RiCloseLine size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Textarea row */}
            <div className="flex items-end gap-1 px-2 pt-2 md:gap-2 md:px-3 md:pt-3">
                <textarea
                    autoComplete="off"
                    className="text-text-primary placeholder:text-text-quaternary max-h-44 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 outline-none"
                    disabled={disabled}
                    inputMode="text"
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            const isMobile =
                                typeof navigator !== "undefined" &&
                                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                                    navigator.userAgent,
                                );
                            if (!isMobile) {
                                e.preventDefault();
                                e.currentTarget.form?.requestSubmit();
                            }
                        }
                    }}
                    placeholder="Message"
                    ref={textareaRef}
                    rows={1}
                    value={value}
                />
            </div>

            {/* Action bar: attach + model selector + send */}
            <div className="flex items-center gap-1 px-1.5 pb-1.5 md:gap-2 md:px-2 md:pb-2">
                <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp, image/gif, image/svg+xml"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />
                <button
                    aria-label="Add attachment"
                    className="text-text-tertiary grid size-9 shrink-0 place-items-center rounded-xl transition-colors hover:bg-white/6 md:size-10"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <RiAddLine size={20} />
                </button>

                {/* Model selector (replaces old provider dropdown) */}
                <ModelSelector
                    isActive={isActive}
                    onSelect={handleModelSelect}
                    onRefreshProviderModels={onRefreshProviderModels}
                    onToggleFavorite={onToggleFavorite}
                    providerModels={providerModels}
                    providers={providers}
                    selectedProviderCacheAt={selectedProviderCacheAt}
                    refreshingProviderId={refreshingProviderId}
                    selectedModelId={selectedModelId}
                    selectedProviderId={selectedProviderId}
                />

                {/* Spacer */}
                <div className="flex-1" />

                {/* Send / Stop */}
                {isActive ? (
                    <button
                        aria-label="Stop generating"
                        className="text-text-primary grid size-9 shrink-0 place-items-center rounded-full bg-white/10 transition-all duration-200 hover:scale-105 hover:bg-white/16 md:size-10"
                        onClick={onStopStreaming}
                        type="button"
                    >
                        <RiStopCircleFill size={18} />
                    </button>
                ) : (
                    <button
                        aria-label="Send message"
                        className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-full transition-all duration-200 md:size-10",
                            canSubmit
                                ? "bg-accent text-white shadow-[0_0_20px_rgba(61,139,255,0.3)] hover:scale-105"
                                : "bg-white/6 text-text-quaternary",
                        )}
                        disabled={!canSubmit}
                        type="submit"
                    >
                        <RiSendPlane2Fill size={16} />
                    </button>
                )}
            </div>
        </form>
    );
});

function compressImage(
    file: File,
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL("image/jpeg", quality));
                } else {
                    resolve(event.target?.result as string); // fallback to original if canvas fails
                }
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}
