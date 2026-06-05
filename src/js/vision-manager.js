/**
 * Vision Manager
 * Handles downloading and running Multimodal Vision Models entirely inside the browser via WebGPU using Transformers.js.
 */

export const PhoneVision = (() => {
  let visionPipeline = null;
  let isDownloading = false;
  let downloadProgress = 0;
  let isReady = false;

  // The vision model for offline edge inference.
  // Using Florence-2-base as it is highly stable on WebGPU and very lightweight (~230MB).
  // Can be swapped to 'deepseek-community/Janus-Pro-1B' for heavier devices.
  const MODEL_ID = 'Xenova/florence-2-base';

  let progressCallback = null;

  async function init(onProgress) {
    if (visionPipeline) return visionPipeline;
    progressCallback = onProgress;
    isDownloading = true;

    try {
      console.log("[Vision] Importing @huggingface/transformers (v3-alpha)...");
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.19');
      
      // Configure for WebGPU
      env.backends.onnx.wasm.numThreads = 1; // Best for WebGPU stability
      
      console.log(`[Vision] Loading model: ${MODEL_ID}...`);
      
      // Initialize the pipeline
      visionPipeline = await pipeline('image-to-text', MODEL_ID, {
        device: 'webgpu',
        dtype: 'q4', // 4-bit quantization to save memory
        progress_callback: (report) => {
          if (report.status === 'progress') {
            downloadProgress = Math.round(report.progress);
            if (progressCallback) {
              progressCallback(downloadProgress, `Downloading Vision Weights: ${report.file}...`);
            }
          }
        }
      });
      
      isDownloading = false;
      isReady = true;
      if (progressCallback) progressCallback(100, 'Vision Engine Loaded Successfully.');
      console.log("[Vision] Engine is ready!");
      return visionPipeline;
    } catch (e) {
      console.error("[Vision] Failed to initialize WebGPU pipeline:", e);
      isDownloading = false;
      if (progressCallback) progressCallback(0, 'Failed to load Vision Engine. Check console.');
      throw e;
    }
  }

  /**
   * Describes a base64 image using the local vision model.
   * @param {string} imageBase64 - Raw base64 string
   * @param {string} prompt - Optional context prompt
   */
  async function describeImage(imageBase64, prompt = "Describe this image in detail.") {
    if (!isReady || !visionPipeline) {
      throw new Error("Vision Engine is not ready.");
    }

    try {
      // Convert base64 back to a blob/URL for transformers.js
      const dataUrl = `data:image/jpeg;base64,${imageBase64}`;
      
      // Florence-2 uses specific task prefixes, but standard image-to-text accepts <MORE_DETAILED_CAPTION>
      // We will use standard conditional logic based on the model if needed, but for now generic generation.
      const result = await visionPipeline(dataUrl, {
        prompt: "<MORE_DETAILED_CAPTION>", 
        max_new_tokens: 150
      });
      
      return result[0]?.generated_text || "A visual scene.";
    } catch (e) {
      console.error("[Vision] Inference error:", e);
      throw e;
    }
  }

  /**
   * Performs OCR on a base64 image.
   * @param {string} imageBase64 - Raw base64 string
   * @returns {Promise<string>} Extracted text
   */
  async function performOCR(imageBase64) {
    try {
      console.log("[Vision] Loading Tesseract.js from CDN...");
      const Tesseract = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/+esm');
      const dataUrl = `data:image/jpeg;base64,${imageBase64}`;
      console.log("[Vision] Recognizing text...");
      const result = await Tesseract.default.recognize(dataUrl, 'eng');
      return result?.data?.text || '';
    } catch (e) {
      console.error("[Vision] OCR failed:", e);
      return '';
    }
  }

  return {
    init,
    describeImage,
    performOCR,
    isReady: () => isReady,
    isDownloading: () => isDownloading,
    getProgress: () => downloadProgress
  };
})();
