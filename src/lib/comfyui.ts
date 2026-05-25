/**
 * ComfyUI API client.
 *
 * Handles workflow submission, websocket progress tracking,
 * history polling, and image retrieval from a ComfyUI server.
 */

/* ── Types ──────────────────────────────────────────────── */

export type ComfyUIImageRef = {
  filename: string;
  subfolder: string;
  type: string;
};

export type ComfyUIPromptResponse = {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
};

export type ComfyUIProgressCallback = {
  onProgress?: (value: number, max: number) => void;
  onNodeExecuting?: (nodeId: string | null) => void;
  onPreviewImage?: (blob: Blob) => void;
  onComplete?: (images: ComfyUIImageRef[]) => void;
  onError?: (error: Error) => void;
};

/* ── Default text-to-image workflow (API format) ────────── */

/**
 * Builds a minimal text-to-image workflow for ComfyUI.
 *
 * Uses: CheckpointLoaderSimple → CLIPTextEncode (pos/neg) →
 *       KSampler → VAEDecode → SaveImage
 */
export function buildTextToImageWorkflow(
  prompt: string,
  checkpoint: string,
  options: {
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg?: number;
    seed?: number;
    samplerName?: string;
    scheduler?: string;
  } = {},
): Record<string, unknown> {
  const {
    negativePrompt = "ugly, blurry, low quality, deformed",
    width = 512,
    height = 512,
    steps = 20,
    cfg = 7,
    seed = Math.floor(Math.random() * 2 ** 32),
    samplerName = "euler",
    scheduler = "normal",
  } = options;

  return {
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { batch_size: 1, width, height },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: prompt },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: negativePrompt },
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
        seed,
        steps,
        cfg,
        sampler_name: samplerName,
        scheduler,
        denoise: 1,
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "A4Chat", images: ["8", 0] },
    },
  };
}

/* ── API calls ──────────────────────────────────────────── */

/** Queue a workflow prompt on the ComfyUI server */
export async function queuePrompt(
  baseUrl: string,
  workflow: Record<string, unknown>,
  clientId: string,
): Promise<ComfyUIPromptResponse> {
  const url = `${baseUrl.replace(/\/+$/, "")}/prompt`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    let errorMessage = `ComfyUI error (HTTP ${resp.status})`;
    try {
      const parsed = JSON.parse(body);
      if (parsed.error?.message) errorMessage = parsed.error.message;
      else if (parsed.node_errors && Object.keys(parsed.node_errors).length > 0) {
        const firstError = Object.values(parsed.node_errors)[0] as any;
        errorMessage = firstError?.errors?.[0]?.message ?? "Workflow validation failed";
      }
    } catch {
      /* use default */
    }
    throw new Error(errorMessage);
  }

  return resp.json();
}

/** Get execution history for a specific prompt */
export async function getHistory(
  baseUrl: string,
  promptId: string,
): Promise<Record<string, unknown>> {
  const url = `${baseUrl.replace(/\/+$/, "")}/history/${promptId}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch history (HTTP ${resp.status})`);
  return resp.json();
}

/** Build the URL to retrieve a generated image */
export function buildImageUrl(baseUrl: string, imageRef: ComfyUIImageRef): string {
  const base = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    filename: imageRef.filename,
    subfolder: imageRef.subfolder,
    type: imageRef.type,
  });
  return `${base}/view?${params}`;
}

/** Fetch a generated image as base64 data URL */
export async function fetchImageAsBase64(
  baseUrl: string,
  imageRef: ComfyUIImageRef,
): Promise<string> {
  const url = buildImageUrl(baseUrl, imageRef);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image (HTTP ${resp.status})`);
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** List available checkpoint models from ComfyUI */
export async function listCheckpoints(baseUrl: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/object_info/CheckpointLoaderSimple`;
  const resp = await fetch(url);
  if (!resp.ok) return [];

  const data = await resp.json();
  const inputInfo = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name;
  if (Array.isArray(inputInfo) && Array.isArray(inputInfo[0])) {
    return inputInfo[0] as string[];
  }
  return [];
}

/** Check if a ComfyUI server is reachable */
export async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/system_stats`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return resp.ok;
  } catch {
    return false;
  }
}

/* ── WebSocket-based execution tracking ─────────────────── */

/**
 * Submits a workflow and tracks execution via WebSocket.
 *
 * Returns a Promise that resolves with the generated image refs
 * when execution completes, or rejects on error.
 */
export function executeWorkflow(
  baseUrl: string,
  workflow: Record<string, unknown>,
  callbacks: ComfyUIProgressCallback,
  signal?: AbortSignal,
): Promise<ComfyUIImageRef[]> {
  return new Promise<ComfyUIImageRef[]>((resolve, reject) => {
    const clientId = crypto.randomUUID();
    const base = baseUrl.replace(/\/+$/, "");
    const wsUrl = `${base.replace(/^http/, "ws")}/ws?clientId=${clientId}`;

    let ws: WebSocket;
    let promptId: string | null = null;
    const collectedImages: ComfyUIImageRef[] = [];
    let resolved = false;

    function cleanup() {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    }

    function finish(images: ComfyUIImageRef[]) {
      if (resolved) return;
      resolved = true;
      cleanup();
      callbacks.onComplete?.(images);
      resolve(images);
    }

    function fail(error: Error) {
      if (resolved) return;
      resolved = true;
      cleanup();
      callbacks.onError?.(error);
      reject(error);
    }

    if (signal?.aborted) {
      fail(new Error("Aborted"));
      return;
    }
    signal?.addEventListener("abort", () => fail(new Error("Aborted")));

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      fail(new Error(`Failed to connect to ComfyUI WebSocket: ${err}`));
      return;
    }

    ws.onopen = async () => {
      try {
        const result = await queuePrompt(base, workflow, clientId);
        promptId = result.prompt_id;

        if (result.node_errors && Object.keys(result.node_errors).length > 0) {
          const firstError = Object.values(result.node_errors)[0] as any;
          fail(new Error(firstError?.errors?.[0]?.message ?? "Workflow validation failed"));
        }
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    };

    ws.onmessage = (event) => {
      // Handle binary preview images
      if (event.data instanceof Blob) {
        callbacks.onPreviewImage?.(event.data);
        return;
      }

      try {
        const msg = JSON.parse(event.data as string);
        if (!msg.type || !msg.data) return;

        // Only process messages for our prompt
        if (msg.data.prompt_id && msg.data.prompt_id !== promptId) return;

        switch (msg.type) {
          case "progress":
            callbacks.onProgress?.(msg.data.value, msg.data.max);
            break;

          case "executing":
            callbacks.onNodeExecuting?.(msg.data.node);
            // node === null means execution finished
            if (msg.data.node === null && promptId) {
              // Short delay to allow "executed" events to arrive
              setTimeout(() => {
                if (!resolved) finish(collectedImages);
              }, 200);
            }
            break;

          case "executed":
            if (msg.data.output?.images) {
              for (const img of msg.data.output.images) {
                collectedImages.push({
                  filename: img.filename,
                  subfolder: img.subfolder ?? "",
                  type: img.type ?? "output",
                });
              }
            }
            break;

          case "execution_error":
            fail(new Error(msg.data.exception_message ?? "ComfyUI execution error"));
            break;
        }
      } catch {
        /* ignore parse errors */
      }
    };

    ws.onerror = () => {
      fail(new Error("ComfyUI WebSocket connection failed. Is the server running?"));
    };

    ws.onclose = () => {
      if (!resolved) {
        fail(new Error("ComfyUI WebSocket closed unexpectedly"));
      }
    };
  });
}
