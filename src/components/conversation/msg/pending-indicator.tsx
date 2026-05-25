"use client";

import { motion } from "motion/react";

/**
 * Neutral "pending" indicator shown while waiting for the API's first token.
 *
 * Displays an animated play-triangle that pulses, rotates, and reverses,
 * giving a feel of "processing" without implying text or image.
 * Once the response type is detected, the parent swaps this out
 * for the appropriate type-specific animation.
 */
export function PendingIndicator() {
  return (
    <div className="flex items-center py-4">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.05] shadow-sm">
        {/* Animated play triangle */}
        <motion.div
          className="relative flex items-center justify-center size-6"
          animate={{ rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            animate={{
              scale: [1, 0.85, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.path
              d="M4 2 L14 8 L4 14 Z"
              fill="currentColor"
              className="text-accent/60"
              animate={{
                d: [
                  "M4 2 L14 8 L4 14 Z",     // play triangle
                  "M12 2 L2 8 L12 14 Z",     // reversed triangle
                  "M4 2 L14 8 L4 14 Z",      // back to play
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.svg>
        </motion.div>

        {/* Bouncing dots for "thinking" */}
        <div className="flex items-center gap-1">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
            animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
            animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
            animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
