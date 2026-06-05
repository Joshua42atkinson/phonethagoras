/**
 * Liquid Foundation Model (LFM) Manager
 * Handles downloading and running Liquid AI models entirely inside the browser via WebGPU.
 * Replaces the old WebLLM Llama-3.2 implementation.
 */

export const PhoneLFM = (() => {
  let generator = null;
  let isDownloading = false;
  let downloadProgress = 0;
  let isReady = false;

  // The state-space core engine
  const MODEL_ID = 'onnx-community/LFM2.5-1.3B-ONNX';

  // Callback to update the UI with progress
  let progressCallback = null;

  async function init(onProgress) {
    if (generator) return generator;
    progressCallback = onProgress;
    isDownloading = true;

    try {
      console.log("[LFM] Importing @huggingface/transformers (v3-alpha)...");
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.19');
      
      // Optimize for WebGPU text generation
      env.backends.onnx.wasm.numThreads = 1;

      console.log(`[LFM] Loading model: ${MODEL_ID}...`);
      
      // Initialize the pipeline
      generator = await pipeline('text-generation', MODEL_ID, {
        device: 'webgpu',
        dtype: 'q4', // Quantized to 4-bit for WebGPU
        progress_callback: (report) => {
          if (report.status === 'progress') {
            downloadProgress = Math.round(report.progress);
            if (progressCallback) {
              progressCallback(downloadProgress, `Loading ${report.file}: ${downloadProgress}%`);
            }
          }
        }
      });
      
      isDownloading = false;
      isReady = true;
      if (progressCallback) progressCallback(100, 'Liquid Core Engine Loaded.');
      console.log("[LFM] Engine is ready!");
      return generator;
    } catch (e) {
      console.error("[LFM] Failed to initialize:", e);
      isDownloading = false;
      throw e;
    }
  }

  /**
   * Generates a response from the Liquid model.
   * @param {Array} messages - Array of {role, content} objects
   * @param {Function} onChunk - Optional callback for streaming (if supported natively)
   */
  async function chat(messages, onChunk) {
    if (!isReady || !generator) {
      throw new Error("LFM Engine is not ready.");
    }

    try {
      // Liquid uses a specific chat template. 
      // Transformers.js pipeline can apply the chat template if available in the model config.
      const formattedPrompt = generator.tokenizer.apply_chat_template(messages, {
        tokenize: false,
        add_generation_prompt: true,
      });

      // LFM doesn't currently support true async streaming chunks via `pipeline()` out of the box
      // in the same way `AsyncGenerator` works for WebLLM, but we can simulate the UI update
      // using the Streamer class if needed. For simplicity and stability, we await full generation
      // and simulate chunks if the caller needs them, or use a TextStreamer.
      
      // To implement actual streaming, we use a custom callback
      let fullResponse = "";
      
      // Ensure we don't output the prompt back
      const output = await generator(formattedPrompt, {
        max_new_tokens: 512,
        temperature: 0.6,
        repetition_penalty: 1.1,
        // The callback approach simulates streaming for the UI
        callback_function: (beams) => {
          if (!onChunk) return;
          const decodedText = generator.tokenizer.decode(beams[0].output_token_ids, { skip_special_tokens: true });
          const newDelta = decodedText.substring(fullResponse.length);
          if (newDelta.length > 0) {
            fullResponse = decodedText;
            onChunk(newDelta);
          }
        }
      });

      // If callback streaming wasn't used or complete, ensure we get the final string.
      // Transformers.js text-generation returns the full prompt + generated text if `return_full_text: false` isn't supported correctly,
      // but usually the output[0].generated_text works.
      const finalRawText = output[0].generated_text;
      
      // If the generated text includes the prompt (common in pipeline), strip it
      let finalResponse = finalRawText;
      if (finalRawText.startsWith(formattedPrompt)) {
        finalResponse = finalRawText.substring(formattedPrompt.length).trim();
      } else if (finalResponse.length === 0 && fullResponse.length > 0) {
         finalResponse = fullResponse;
      }
      
      return finalResponse;
    } catch (e) {
      console.error("[LFM] Inference error:", e);
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
