"use client";

import { cn } from "@/lib/cn";

type FieldProps = {
    label: string;
    value: string;
    type?: "password" | "text" | "url";
    placeholder?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
};

export function Field({
    label,
    value,
    type = "text",
    placeholder,
    disabled = false,
    onChange,
}: FieldProps) {
    return (
        <label className="text-text-tertiary grid gap-1.5 text-sm">
            {label}
            <input
                className={cn(
                    "h-11 rounded-xl border border-white/6 bg-white/3 px-3 text-text-primary outline-none transition-colors placeholder:text-text-quaternary focus:border-accent/50 focus:bg-white/5",
                    disabled && "cursor-not-allowed opacity-50",
                )}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                type={type}
                value={value}
            />
        </label>
    );
}
