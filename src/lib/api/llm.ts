import { invoke } from "@tauri-apps/api/core";
import { LlmGenerateRequest, StreamChunk } from "../types";
import { listen } from "@tauri-apps/api/event";

export async function llmGenerate(request: LlmGenerateRequest): Promise<string> {
    const response = await invoke<{ stream_id: string }>("llm_generate", {
        request,
    });
    return response.stream_id;
}

export async function cancelStream(streamId: string): Promise<void> {
    await invoke("cancel_stream", { streamId });
}

export async function listenToStream(
    callback: (event: StreamChunk) => void
): Promise<() => void> {
    const unlisten = await listen<StreamChunk>("llm_stream", (event) => {
        callback(event.payload);
    });
    return unlisten;
}
