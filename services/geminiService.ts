
import { GoogleGenAI } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import { IncidentAnalysis, VideoFrame, RoiAnalysis } from '../types';

// Helper to extract frames from a video file
export const extractFramesFromVideo = async (videoUrl: string, numFrames: number = 5): Promise<VideoFrame[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.muted = true;
    
    const frames: VideoFrame[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth / 2; // Reduce resolution for token efficiency
      canvas.height = video.videoHeight / 2;
      const duration = video.duration;
      // Skip the very beginning and very end to avoid black frames
      const start = duration * 0.1;
      const end = duration * 0.9;
      const usableDuration = end - start;
      const interval = usableDuration / (numFrames - 1);

      for (let i = 0; i < numFrames; i++) {
        const time = start + (interval * i);
        video.currentTime = time;
        await new Promise<void>((r) => {
          const seekHandler = () => {
            video.removeEventListener('seeked', seekHandler);
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push({
                data: canvas.toDataURL('image/jpeg', 0.7).split(',')[1],
                timestamp: time
              });
            }
            r();
          };
          video.addEventListener('seeked', seekHandler);
        });
      }
      resolve(frames);
    };

    video.onerror = (e) => reject(e);
  });
};

// --- Audio Extraction Logic ---

// Helper function to create WAV file from AudioBuffer
const bufferToWav = (abuffer: AudioBuffer, len: number) => {
  let numOfChan = abuffer.numberOfChannels;
  let length = len * numOfChan * 2 + 44;
  let buffer = new ArrayBuffer(length);
  let view = new DataView(buffer);
  let channels = [], i, sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this example)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for(i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while(pos < length) {
    for(i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); 
      pos += 2;
    }
    offset++;
  }

  return buffer;

  function setUint16(data: any) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: any) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

export const extractAudioFromVideo = async (videoUrl: string): Promise<string | null> => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }); // Downsample to 16kHz
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Decode audio data
    // Note: decodeAudioData detaches the arrayBuffer, so we might need to clone if used elsewhere
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convert to WAV
    // Limit duration to 60s to save tokens
    const maxDuration = 60; 
    const samplesToKeep = Math.min(audioBuffer.length, maxDuration * audioBuffer.sampleRate);
    
    // Create a new buffer if we need to crop
    let finalBuffer = audioBuffer;
    if (samplesToKeep < audioBuffer.length) {
       // Just basic cropping logic or using the bufferToWav len parameter
    }

    const wavBuffer = bufferToWav(finalBuffer, samplesToKeep);
    
    // Convert ArrayBuffer to Base64
    let binary = '';
    const bytes = new Uint8Array(wavBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64Wav = btoa(binary);
    
    // Clean up
    audioContext.close();
    
    return base64Wav;
  } catch (e) {
    console.warn("Audio extraction skipped or failed", e);
    return null;
  }
};

interface SourceData {
  name: string;
  frames: VideoFrame[];
  url?: string; // Added URL for audio extraction access
}

export const analyzeIncidentStream = async (
  sources: SourceData[], 
  userPrompt: string,
  onStreamUpdate: (text: string) => void
): Promise<IncidentAnalysis> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  // Prepare content parts: Interleave text labels and image frames
  const parts: any[] = [];

  // --- AUDIO INJECTION ---
  // We prioritize audio from the first source
  if (sources.length > 0 && sources[0].url) {
      const audioBase64 = await extractAudioFromVideo(sources[0].url);
      if (audioBase64) {
          parts.push({
            inlineData: {
              mimeType: 'audio/wav',
              data: audioBase64
            }
          });
          parts.push({ text: "\n[NOTE: Audio Track extracted and attached. Correlate sound events with visual frames.]\n" });
      }
  }
  
  parts.push({ text: "Here is the video evidence from multiple perspectives, including precise timestamps for physics calculations:" });

  sources.forEach((source, index) => {
    parts.push({ text: `\n--- VIDEO SOURCE ${index + 1}: ${source.name} ---\n` });
    source.frames.forEach((frame, i) => {
      // CRITICAL: Inject timestamp so Gemini can calculate delta_time for speed estimation
      parts.push({ text: `\n[Frame ${i + 1}, Timestamp: ${frame.timestamp.toFixed(3)}s]\n` });
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: frame.data
        }
      });
    });
  });

  parts.push({ text: "\nConduct a Multi-Perspective Synthesis Analysis." });
  parts.push({ text: userPrompt });

  try {
    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        tools: [{ googleSearch: {} }], // Enable Search for legal precedents
        // responseMimeType: "application/json" // REMOVED to allow mixed text/json stream
      }
    });

    let fullText = "";
    let groundingMetadata;

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onStreamUpdate(fullText);
      }
      
      // Capture grounding metadata if available in the chunk
      if (chunk.candidates?.[0]?.groundingMetadata) {
        groundingMetadata = chunk.candidates[0].groundingMetadata;
      }
    }

    // Attempt to extract the JSON block from the end of the text
    const jsonMatch = fullText.match(/```json\n([\s\S]*)\n```/);
    if (!jsonMatch) {
      // Fallback: try to find the last opening brace if code block markers are missing
      const lastBrace = fullText.lastIndexOf('}');
      const firstBrace = fullText.indexOf('{');
      if (lastBrace > firstBrace && firstBrace !== -1) {
          const jsonStr = fullText.substring(firstBrace, lastBrace + 1);
          try {
              const json = JSON.parse(jsonStr);
              return { ...json, rawAnalysis: fullText, groundingMetadata };
          } catch(e) {
              console.warn("Fallback JSON parse failed");
          }
      }
      throw new Error("Could not extract structured data from analysis stream.");
    }

    try {
      const json = JSON.parse(jsonMatch[1]);
      return {
        ...json,
        rawAnalysis: fullText,
        groundingMetadata
      };
    } catch (e) {
      console.error("Failed to parse extracted JSON", e);
      throw new Error("Invalid format received from AI");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// New function for handling on-demand "What If" questions using the original context
export const evaluateCounterfactual = async (
  originalAnalysisContext: string,
  query: string
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are the Incident Lens AI Counterfactual Simulator.
    
    CONTEXT:
    The following is the forensic analysis of a traffic incident:
    "${originalAnalysisContext}"

    USER HYPOTHETICAL QUERY:
    "${query}"

    INSTRUCTIONS:
    1. Reason through this scenario using the physics, timing, and conditions established in the original analysis.
    2. Determine if the outcome would have changed (collision avoided, severity reduced, or same outcome).
    3. Provide the result in a concise, authoritative format using Markdown.
    4. Explicitly state the causal chain logic.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { role: 'user', parts: [{ text: prompt }] },
    config: {
      temperature: 0.4 // Slightly higher for hypothetical reasoning
    }
  });

  return response.text || "Simulation inconclusive.";
};

// New function for Legal/Web Search Verification
export const searchSimilarCases = async (query: string): Promise<{ text: string; chunks: any[] }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find recent legal precedents, traffic statutes, case law, or weather reports relevant to: ${query}. Summarize the findings clearly for a forensic report.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "No results found.";
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return { text, chunks };
};

export const analyzeRegionOfInterest = async (imageData: string, query: string): Promise<RoiAnalysis> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");
  
    const ai = new GoogleGenAI({ apiKey });
  
    const prompt = `
      You are a specialized forensic image analyst. 
      Analyze this cropped specific region of a traffic incident video frame.
      
      USER QUERY: "${query}"
      
      Provide a structured JSON response:
      {
        "question": "${query}",
        "answer": "Direct answer to the query",
        "confidence": "High/Medium/Low",
        "details": "Technical observation details (e.g. resolution quality, lighting factors)"
      }
    `;
  
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageData } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: 'application/json' }
    });
  
    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { question: query, answer: response.text || "Analysis failed", confidence: "Low", details: "Parsing error" };
    }
};

export const generateReport = async (analysisContext: string, reportType: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });

    const reportDefinitions: Record<string, string> = {
        'Executive Summary': "Create a concise Executive Summary for non-technical stakeholders. Focus on key facts, the ultimate liability determination, and major contributing factors. Keep it under 1 page.",
        'Technical Report': "Create a detailed Forensic Technical Report. Include sections on Environmental Analysis, Vehicle Dynamics (Speed/Physics), Temporal Reconstruction, and a detailed Fault Logic Chain. Use professional engineering terminology.",
        'Insurance Claim': "Create an Insurance Claim Investigation Report. Focus on: Policyholder/Claimant liability percentages, cited vehicle code violations, damage assessment descriptions, and fraud indicator checks. Use standard insurance industry formatting.",
        'Legal Brief': "Create a Legal Brief for Litigation Support. Focus on defensible evidence, cited statutes/case law (using the search context if available), chain of custody logic, and counter-arguments to potential defenses."
    };

    const specificInstruction = reportDefinitions[reportType] || "Create a professional forensic report.";

    const prompt = `
      You are Incident Lens AI, generating a professional document.
      
      SOURCE DATA (Forensic Analysis):
      "${analysisContext}"

      TASK:
      ${specificInstruction}

      FORMAT:
      Return ONLY the body text of the report. Do not use Markdown formatting (bold/italic) as this will be printed to PDF. Use uppercase for section headers. Use plain text layout.
    `;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: { temperature: 0.3 }
    });

    return response.text || "Report generation failed.";
};
