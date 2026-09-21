/**
 * Meetly PCM AudioWorkletProcessor
 * Runs on dedicated Web Audio rendering thread to capture raw PCM frames.
 * Replaces deprecated ScriptProcessorNode and prevents UI stutters on Google Meet.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bufferIndex++] = channelData[i];
        if (this.bufferIndex >= this.bufferSize) {
          // Post buffer copy to main content script thread
          this.port.postMessage(this.buffer.slice(0, this.bufferSize));
          this.bufferIndex = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
