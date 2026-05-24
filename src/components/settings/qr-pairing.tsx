"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RiCameraLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiQrCodeLine,
  RiRefreshLine,
  RiSmartphoneLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";

import type { ProviderSettings } from "@/components/settings/utils/providers";
import { resolvePairingBaseUrl } from "@/lib/native";
import { cn } from "@/lib/cn";

type QrPairingSectionProps = {
  providers: ProviderSettings[];
  onProviderScanned?: (data: {
    id: string;
    label: string;
    baseUrl: string;
    model?: string;
  }) => void;
};

export const QrPairingSection = memo(function QrPairingSection({
  providers,
  onProviderScanned,
}: QrPairingSectionProps) {
  const [activeTab, setActiveTab] = useState<"generate" | "scan">("generate");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);

  const enabledProviders = useMemo(
    () => providers.filter((p) => p.enabled && (p.baseUrl || p.id === "lmstudio")),
    [providers],
  );

  const generateQr = useCallback(
    async (providerId: string) => {
      const provider = enabledProviders.find((p) => p.id === providerId);
      if (!provider) return;

      let rawBaseUrl = provider.baseUrl;
      if (provider.id === "lmstudio") {
        // Force the default LM Studio endpoint so the backend replaces 'localhost' with the LAN IPv4
        rawBaseUrl = "http://localhost:1234/v1";
      }

      let baseUrl = rawBaseUrl;
      try {
        baseUrl = await resolvePairingBaseUrl(rawBaseUrl);
      } catch (err) {
        console.warn("Could not resolve pairing URL:", err);
      }

      const payload = JSON.stringify({
        type: "a4chat-provider",
        id: provider.id,
        label: provider.label,
        baseUrl,
        model: provider.model,
      });

      setSelectedProviderId(providerId);
      setQrValue(payload);
    },
    [enabledProviders],
  );

  return (
    <div className="space-y-5">
      {/* Tab selector */}
      <div className="flex rounded-xl border border-white/6 bg-white/2 p-1">
        <button
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
            activeTab === "generate"
              ? "bg-white/8 text-text-primary"
              : "text-text-tertiary hover:text-text-secondary",
          )}
          onClick={() => setActiveTab("generate")}
          type="button"
        >
          <RiQrCodeLine size={16} />
          Generate QR
        </button>
        <button
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
            activeTab === "scan"
              ? "bg-white/8 text-text-primary"
              : "text-text-tertiary hover:text-text-secondary",
          )}
          onClick={() => setActiveTab("scan")}
          type="button"
        >
          <RiCameraLine size={16} />
          Scan QR
        </button>
      </div>

      {activeTab === "generate" ? (
        <QrGeneratePanel
          enabledProviders={enabledProviders}
          generateQr={generateQr}
          qrValue={qrValue}
          selectedProviderId={selectedProviderId}
        />
      ) : (
        <QrScanPanel onScanned={onProviderScanned} />
      )}
    </div>
  );
});

/* ── QR Generate Panel ─────────────────────────────────── */

function QrGeneratePanel({
  enabledProviders,
  selectedProviderId,
  qrValue,
  generateQr,
}: {
  enabledProviders: ProviderSettings[];
  selectedProviderId: string | null;
  qrValue: string | null;
  generateQr: (providerId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-surface-0 px-4 py-5 sm:px-5">
      <div className="mb-3 flex items-center gap-3 text-text-primary">
        <RiSmartphoneLine size={20} />
        <h3 className="font-semibold">Share provider</h3>
      </div>
      <p className="mb-5 text-sm leading-6 text-text-tertiary">
        Generate a QR code for any provider. Scan it on another device to add the connection. Only
        the base URL is shared — <strong>API keys are never included</strong>.
        <br />
        Localhost addresses are converted to your machine&apos;s LAN IP when possible so phones can
        reach the server.
      </p>

      {enabledProviders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/8 px-4 py-6 text-center text-sm text-text-quaternary">
          Enable a provider to generate a pairing QR code
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {enabledProviders.map((p) => (
              <button
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all active:scale-95",
                  selectedProviderId === p.id
                    ? "bg-accent/15 text-accent-soft"
                    : "bg-white/4 text-text-secondary hover:bg-white/8",
                )}
                key={p.id}
                onClick={() => void generateQr(p.id)}
                type="button"
              >
                <RiQrCodeLine size={16} />
                {p.label}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {qrValue ? (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-white/6 bg-white/2 py-6"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
              >
                <div className="rounded-xl bg-white p-3 shadow-lg">
                  <QRCodeSVG
                    bgColor="#ffffff"
                    fgColor="#07090d"
                    level="M"
                    size={180}
                    value={qrValue}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">
                    {enabledProviders.find((p) => p.id === selectedProviderId)?.label}
                  </p>
                  <p className="mt-1 text-xs text-text-quaternary">Scan with your phone camera</p>
                </div>
                <button
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-tertiary transition-colors hover:bg-white/6"
                  onClick={() => selectedProviderId && void generateQr(selectedProviderId)}
                  type="button"
                >
                  <RiRefreshLine size={14} />
                  Regenerate
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ── QR Scan Panel — Camera-based scanner ──────────────── */

function QrScanPanel({
  onScanned,
}: {
  onScanned?: (data: { id: string; label: string; baseUrl: string; model?: string }) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const scanningRef = useRef(false);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      scanningRef.current = true;
      setScanning(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera access denied";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access in your device settings.");
      } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
        setError("No camera found on this device.");
      } else {
        setError(`Camera error: ${msg}`);
      }
    }
  }, []);

  // Moved useEffect below to fix block-scoped variable error

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setScanSuccess(false);
  }, []);

  /* Use BarcodeDetector API if available, fallback to manual */
  const scanFrame = useCallback(() => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    /* Try BarcodeDetector (native API, fast) */
    if ("BarcodeDetector" in window) {
      const detector = new (
        window as unknown as {
          BarcodeDetector: new (opts: { formats: string[] }) => {
            detect: (source: HTMLCanvasElement) => Promise<Array<{ rawValue: string }>>;
          };
        }
      ).BarcodeDetector({
        formats: ["qr_code"],
      });
      detector
        .detect(canvas)
        .then((barcodes: Array<{ rawValue: string }>) => {
          if (barcodes.length > 0) {
            handleQrResult(barcodes[0].rawValue);
            return;
          }
          if (scanningRef.current) {
            rafRef.current = requestAnimationFrame(scanFrame);
          }
        })
        .catch(() => {
          if (scanningRef.current) {
            rafRef.current = requestAnimationFrame(scanFrame);
          }
        });
    } else {
      /* No native BarcodeDetector — continue scanning loop, rely on library fallback */
      rafRef.current = requestAnimationFrame(scanFrame);
    }
  }, []);

  useEffect(() => {
    if (scanning && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video
        .play()
        .then(() => {
          scanFrame();
        })
        .catch((err) => {
          console.error("Camera play failed", err);
        });
    }
  }, [scanning, scanFrame]);

  const handleQrResult = useCallback(
    (rawValue: string) => {
      scanningRef.current = false;
      cancelAnimationFrame(rafRef.current);

      try {
        const data = JSON.parse(rawValue);
        if (data.type === "a4chat-provider" && data.baseUrl) {
          setScanSuccess(true);
          setTimeout(() => {
            stopCamera();
            onScanned?.({
              id: data.id,
              label: data.label,
              baseUrl: data.baseUrl,
              model: data.model,
            });
          }, 600);
        } else {
          stopCamera();
          setError("Invalid QR code — not an A4Chat provider");
        }
      } catch {
        stopCamera();
        setError("Invalid QR code format");
      }
    },
    [stopCamera, onScanned],
  );

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/6 bg-surface-0 px-4 py-5 sm:px-5">
      <div className="mb-3 flex items-center gap-3 text-text-primary">
        <RiCameraLine size={20} />
        <h3 className="font-semibold">Scan QR code</h3>
      </div>
      <p className="mb-5 text-sm leading-6 text-text-tertiary">
        Point your camera at an A4Chat provider QR code to automatically add the connection.
      </p>

      {/* Camera viewport */}
      {scanning ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/8">
          <video
            autoPlay
            className="aspect-[4/3] w-full rounded-2xl bg-black object-cover"
            muted
            playsInline
            ref={videoRef}
          />
          {/* Scan overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "relative size-56 overflow-hidden rounded-2xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors duration-300",
                scanSuccess ? "border-green-500 bg-green-500/20" : "border-white/40",
              )}
            >
              {!scanSuccess && (
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2px] bg-accent shadow-[0_0_12px_3px_rgba(61,139,255,0.6)]"
                />
              )}
            </div>
          </div>
          <button
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
            onClick={stopCamera}
            type="button"
          >
            <RiCloseLine size={20} />
          </button>
          <canvas className="hidden" ref={canvasRef} />
        </div>
      ) : (
        /* Idle state — show start button */
        <div className="flex flex-col items-center gap-4">
          {error ? (
            <div className="flex w-full items-start gap-2 rounded-xl border border-danger/20 bg-danger/6 px-4 py-3 text-sm text-red-300">
              <RiErrorWarningLine className="mt-0.5 shrink-0" size={16} />
              <span>{error}</span>
            </div>
          ) : null}
          <button
            className="flex items-center gap-2 rounded-xl bg-accent/15 px-6 py-3 text-sm font-medium text-accent transition-all hover:bg-accent/25 active:scale-95"
            onClick={() => void startCamera()}
            type="button"
          >
            <RiCameraLine size={18} />
            Open Camera
          </button>
          <p className="text-center text-xs text-text-quaternary">
            Camera permission will be requested
          </p>
        </div>
      )}
    </div>
  );
}
