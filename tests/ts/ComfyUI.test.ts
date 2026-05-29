import { describe, expect, it } from "vitest";

import { buildTextToImageWorkflow, buildImageUrl, type ComfyUIImageRef } from "@/lib/comfyui";

// ── buildTextToImageWorkflow ────────────────────────────────────

describe("buildTextToImageWorkflow", () => {
    const prompt = "a beautiful sunset over mountains";
    const checkpoint = "sd_xl_base_1.0.safetensors";

    it("returns an object with all required node keys", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        expect(wf).toHaveProperty("3"); // KSampler
        expect(wf).toHaveProperty("4"); // CheckpointLoaderSimple
        expect(wf).toHaveProperty("5"); // EmptyLatentImage
        expect(wf).toHaveProperty("6"); // CLIPTextEncode (positive)
        expect(wf).toHaveProperty("7"); // CLIPTextEncode (negative)
        expect(wf).toHaveProperty("8"); // VAEDecode
        expect(wf).toHaveProperty("9"); // SaveImage
    });

    it("sets the checkpoint name correctly", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node4 = wf["4"] as any;
        expect(node4.class_type).toBe("CheckpointLoaderSimple");
        expect(node4.inputs.ckpt_name).toBe(checkpoint);
    });

    it("sets the positive prompt text correctly", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node6 = wf["6"] as any;
        expect(node6.class_type).toBe("CLIPTextEncode");
        expect(node6.inputs.text).toBe(prompt);
    });

    it("uses default negative prompt when not specified", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node7 = wf["7"] as any;
        expect(node7.inputs.text).toBe("ugly, blurry, low quality, deformed");
    });

    it("uses custom negative prompt when specified", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint, {
            negativePrompt: "bad quality",
        });
        const node7 = wf["7"] as any;
        expect(node7.inputs.text).toBe("bad quality");
    });

    it("uses default dimensions 512x512", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node5 = wf["5"] as any;
        expect(node5.inputs.width).toBe(512);
        expect(node5.inputs.height).toBe(512);
    });

    it("uses custom dimensions when specified", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint, {
            width: 1024,
            height: 768,
        });
        const node5 = wf["5"] as any;
        expect(node5.inputs.width).toBe(1024);
        expect(node5.inputs.height).toBe(768);
    });

    it("always sets batch_size to 1", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node5 = wf["5"] as any;
        expect(node5.inputs.batch_size).toBe(1);
    });

    it("uses default steps=20 and cfg=7", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node3 = wf["3"] as any;
        expect(node3.inputs.steps).toBe(20);
        expect(node3.inputs.cfg).toBe(7);
    });

    it("uses custom steps and cfg when specified", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint, {
            steps: 50,
            cfg: 12,
        });
        const node3 = wf["3"] as any;
        expect(node3.inputs.steps).toBe(50);
        expect(node3.inputs.cfg).toBe(12);
    });

    it("uses default sampler 'euler' and scheduler 'normal'", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node3 = wf["3"] as any;
        expect(node3.inputs.sampler_name).toBe("euler");
        expect(node3.inputs.scheduler).toBe("normal");
    });

    it("uses custom sampler and scheduler", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint, {
            samplerName: "dpm++_2m",
            scheduler: "karras",
        });
        const node3 = wf["3"] as any;
        expect(node3.inputs.sampler_name).toBe("dpm++_2m");
        expect(node3.inputs.scheduler).toBe("karras");
    });

    it("uses provided seed when specified", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint, { seed: 42 });
        const node3 = wf["3"] as any;
        expect(node3.inputs.seed).toBe(42);
    });

    it("generates a random seed within [0, 2^32) when not specified", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node3 = wf["3"] as any;
        expect(typeof node3.inputs.seed).toBe("number");
        expect(node3.inputs.seed).toBeGreaterThanOrEqual(0);
        expect(node3.inputs.seed).toBeLessThan(2 ** 32);
    });

    it("generates different seeds on consecutive calls (probabilistic)", () => {
        const seeds = new Set<number>();
        for (let i = 0; i < 10; i++) {
            const wf = buildTextToImageWorkflow(prompt, checkpoint);
            seeds.add((wf["3"] as any).inputs.seed);
        }
        // With 2^32 possibilities, 10 calls should produce at least 8 unique seeds
        // (allowing for small probability of collision)
        expect(seeds.size).toBeGreaterThanOrEqual(8);
    });

    it("sets denoise to 1", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node3 = wf["3"] as any;
        expect(node3.inputs.denoise).toBe(1);
    });

    it("wires model connection from checkpoint to KSampler", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node3 = wf["3"] as any;
        expect(node3.inputs.model).toEqual(["4", 0]);
    });

    it("wires positive/negative connections correctly", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node3 = wf["3"] as any;
        expect(node3.inputs.positive).toEqual(["6", 0]);
        expect(node3.inputs.negative).toEqual(["7", 0]);
        expect(node3.inputs.latent_image).toEqual(["5", 0]);
    });

    it("wires CLIP connections from checkpoint", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node6 = wf["6"] as any;
        const node7 = wf["7"] as any;
        expect(node6.inputs.clip).toEqual(["4", 1]);
        expect(node7.inputs.clip).toEqual(["4", 1]);
    });

    it("wires VAEDecode from KSampler and checkpoint", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node8 = wf["8"] as any;
        expect(node8.inputs.samples).toEqual(["3", 0]);
        expect(node8.inputs.vae).toEqual(["4", 2]);
    });

    it("wires SaveImage from VAEDecode", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint);
        const node9 = wf["9"] as any;
        expect(node9.inputs.images).toEqual(["8", 0]);
        expect(node9.inputs.filename_prefix).toBe("A4Chat");
    });

    it("handles empty prompt string", () => {
        const wf = buildTextToImageWorkflow("", checkpoint);
        const node6 = wf["6"] as any;
        expect(node6.inputs.text).toBe("");
    });

    it("handles empty checkpoint string", () => {
        const wf = buildTextToImageWorkflow(prompt, "");
        const node4 = wf["4"] as any;
        expect(node4.inputs.ckpt_name).toBe("");
    });

    it("handles prompt with special characters", () => {
        const specialPrompt = "a <b>bold</b> image with 'quotes' & \"doubles\"";
        const wf = buildTextToImageWorkflow(specialPrompt, checkpoint);
        const node6 = wf["6"] as any;
        expect(node6.inputs.text).toBe(specialPrompt);
    });

    it("handles prompt with unicode/emoji", () => {
        const emojiPrompt = "🌅 sunset over 山 mountains";
        const wf = buildTextToImageWorkflow(emojiPrompt, checkpoint);
        const node6 = wf["6"] as any;
        expect(node6.inputs.text).toBe(emojiPrompt);
    });

    it("overrides only specified options, defaults fill the rest", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint, { steps: 50 });
        const node3 = wf["3"] as any;
        expect(node3.inputs.steps).toBe(50);
        expect(node3.inputs.cfg).toBe(7); // default preserved
        expect(node3.inputs.sampler_name).toBe("euler"); // default preserved
        expect(node3.inputs.scheduler).toBe("normal"); // default preserved
    });

    it("uses seed=0 when explicitly provided", () => {
        const wf = buildTextToImageWorkflow(prompt, checkpoint, { seed: 0 });
        const node3 = wf["3"] as any;
        expect(node3.inputs.seed).toBe(0);
    });
});

// ── buildImageUrl ───────────────────────────────────────────────

describe("buildImageUrl", () => {
    const imageRef: ComfyUIImageRef = {
        filename: "A4Chat_00001_.png",
        subfolder: "",
        type: "output",
    };

    it("builds a correct URL with query parameters", () => {
        const url = buildImageUrl("http://127.0.0.1:8188", imageRef);
        expect(url).toContain("http://127.0.0.1:8188/view?");
        expect(url).toContain("filename=A4Chat_00001_.png");
        expect(url).toContain("subfolder=");
        expect(url).toContain("type=output");
    });

    it("strips trailing slashes from baseUrl", () => {
        const url = buildImageUrl("http://127.0.0.1:8188///", imageRef);
        expect(url).toMatch(/^http:\/\/127\.0\.0\.1:8188\/view\?/);
    });

    it("handles subfolder with value", () => {
        const ref: ComfyUIImageRef = {
            filename: "image.png",
            subfolder: "outputs/2025",
            type: "output",
        };
        const url = buildImageUrl("http://localhost:8188", ref);
        expect(url).toContain("subfolder=outputs%2F2025");
    });

    it("URL-encodes special characters in filename", () => {
        const ref: ComfyUIImageRef = {
            filename: "image (1).png",
            subfolder: "",
            type: "output",
        };
        const url = buildImageUrl("http://localhost:8188", ref);
        // URLSearchParams encodes spaces as + and parens
        expect(url).toContain("filename=");
        const params = new URL(url).searchParams;
        expect(params.get("filename")).toBe("image (1).png");
    });

    it("preserves type parameter", () => {
        const ref: ComfyUIImageRef = {
            filename: "img.png",
            subfolder: "",
            type: "temp",
        };
        const url = buildImageUrl("http://localhost:8188", ref);
        const params = new URL(url).searchParams;
        expect(params.get("type")).toBe("temp");
    });

    it("works with https URLs", () => {
        const url = buildImageUrl("https://comfy.example.com", imageRef);
        expect(url).toMatch(/^https:\/\/comfy\.example\.com\/view\?/);
    });

    it("works with URL that has a port", () => {
        const url = buildImageUrl("http://192.168.1.100:9999", imageRef);
        expect(url).toMatch(/^http:\/\/192\.168\.1\.100:9999\/view\?/);
    });

    it("handles empty filename", () => {
        const ref: ComfyUIImageRef = { filename: "", subfolder: "", type: "output" };
        const url = buildImageUrl("http://localhost:8188", ref);
        const params = new URL(url).searchParams;
        expect(params.get("filename")).toBe("");
    });

    it("handles filename with unicode characters", () => {
        const ref: ComfyUIImageRef = {
            filename: "画像_01.png",
            subfolder: "",
            type: "output",
        };
        const url = buildImageUrl("http://localhost:8188", ref);
        const params = new URL(url).searchParams;
        expect(params.get("filename")).toBe("画像_01.png");
    });

    it("all three query params are always present", () => {
        const url = buildImageUrl("http://localhost:8188", imageRef);
        const params = new URL(url).searchParams;
        expect(params.has("filename")).toBe(true);
        expect(params.has("subfolder")).toBe(true);
        expect(params.has("type")).toBe(true);
    });
});
