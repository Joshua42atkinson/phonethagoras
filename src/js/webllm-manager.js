/**
 * WebLLM Manager
 * Handles downloading and running LLMs entirely inside the browser via WebGPU.
 */

export const WebLLMManager = (() => {
  let engine = null;
  let isDownloading = false;
  let downloadProgress = 0;
  let isReady = false;

  // The model we will use for offline inference.
  // Llama-3.2-1B-Instruct is perfect for mobile devices.
  const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

  // Callback to update the UI with progress
  let progressCallback = null;

  async function init(onProgress) {
    if (engine) return engine;
    progressCallback = onProgress;
    isDownloading = true;

    try {
      console.log("[WebLLM] Importing @mlc-ai/web-llm...");
      const webllm = await import('https://esm.run/@mlc-ai/web-llm');
      
      console.log("[WebLLM] Initializing WebGPU engine...");
      // Create the engine and set a callback for download progress
      engine = new webllm.MLCEngine();
      engine.setInitProgressCallback((report) => {
        downloadProgress = Math.round(report.progress * 100);
        console.log(`[WebLLM] Download Progress: ${downloadProgress}%`, report.text);
        if (progressCallback) {
          progressCallback(downloadProgress, report.text);
        }
      });

      console.log(`[WebLLM] Loading model: ${MODEL_ID}...`);
      await engine.reload(MODEL_ID);
      
      isDownloading = false;
      isReady = true;
      console.log("[WebLLM] Engine is ready!");
      return engine;
    } catch (e) {
      console.error("[WebLLM] Failed to initialize:", e);
      isDownloading = false;
      throw e;
    }
  }

  async function chat(messages, onChunk) {
    if (!isReady || !engine) {
      throw new Error("WebLLM Engine is not ready.");
    }

    try {
      const completion = await engine.chat.completions.create({
        messages: messages,
        temperature: 0.7,
        stream: true,
      });

      let fullResponse = "";
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content || "";
        fullResponse += delta;
        if (onChunk) {
          onChunk(delta);
        }
      }
      return fullResponse;
    } catch (e) {
      console.error("[WebLLM] Inference error:", e);
      throw e;
    }
  }

  return {
    init,
    chat,
    isReady: () => isReady,
    isDownloading: () => isDownloading,
    getProgress: () => downloadProgress
  };
})();
