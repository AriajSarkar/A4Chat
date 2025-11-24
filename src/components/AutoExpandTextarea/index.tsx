import { useEffect, useRef, KeyboardEvent } from "react";

interface AutoExpandTextareaProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    placeholder?: string;
    disabled?: boolean;
}

export const AutoExpandTextarea: React.FC<AutoExpandTextareaProps> = ({
    value,
    onChange,
    onSend,
    placeholder = "Type your message...",
    disabled = false
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            const newHeight = Math.min(textarea.scrollHeight, 200); // Max height 200px
            textarea.style.height = `${newHeight}px`;
        }
    }, [value]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter without Shift = Send
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !disabled) {
                onSend();
            }
        }
        // Shift+Enter = New line (default behavior)
    };

    return <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="w-full resize-none bg-transparent border-none outline-none text-white text-base placeholder:text-gray-500 overflow-y-auto custom-scrollbar"
    />
};
