import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

interface VoiceAssistantProps {
  onTranscript?: (text: string) => void;
  onCommand?: (command: string, args: any) => void;
  isDarkMode?: boolean;
}

export interface VoiceAssistantHandle {
  startSession: () => Promise<void>;
  stopSession: () => void;
}

const VoiceAssistant = forwardRef<VoiceAssistantHandle, VoiceAssistantProps>(({ onTranscript, onCommand, isDarkMode }, ref) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    startSession,
    stopSession
  }));

  const startSession = async () => {
    setIsConnecting(true);
    try {
      let key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (key === "GEMINI_API_KEY") {
        key = import.meta.env.VITE_GEMINI_API_KEY;
      }
      if (!key) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey: key });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            setIsConnecting(false);
            setIsActive(true);
            startMic();
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const base64Audio = part.inlineData.data;
                  const binaryString = atob(base64Audio);
                  const len = binaryString.length;
                  const bytes = new Int16Array(len / 2);
                  for (let i = 0; i < len; i += 2) {
                    bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
                  }
                  audioQueueRef.current.push(bytes);
                  if (!isPlayingRef.current) {
                    playNextChunk();
                  }
                }
              }
            }
            
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }

            // Handle transcription if enabled
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
               const text = message.serverContent.modelTurn.parts[0].text;
               setTranscript(text);
               if (onTranscript) onTranscript(text);
               
               // Check for "Finish report" command
               if (text.toLowerCase().includes("finish report")) {
                 if (onCommand) onCommand("finish_report", {});
                 stopSession();
               }
            }

            if (message.serverContent?.userTurn?.parts?.[0]?.text) {
               const text = message.serverContent.userTurn.parts[0].text;
               setTranscript("You: " + text);
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error("Live error:", err);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: "You are OGX Voice, a highly intelligent and professional medical assistant for an expert OBGYN consultant. Your task is to listen to the doctor dictate ultrasound findings, measurements, and patient history in real-time. You must accurately understand advanced terms (like IOTA, IETA, MUSA, FIGO protocols). Speak with a fast, natural, and highly professional human voice. Do not be overly chatty. Acknowledge findings briefly and concisely (e.g., 'Got it, 15mm endometrium'). When the doctor says 'Finish report', you must stop listening and automatically populate the exact data into the report template fields.",
        },
      });
      sessionRef.current = session;
      session.sendRealtimeInput({ text: "Hi Doctor, how can I help?" });
    } catch (err) {
      console.error("Failed to start voice assistant:", err);
      setIsConnecting(false);
    }
  };

  const startMic = async () => {
    try {
      const session = sessionRef.current;
      if (!session) throw new Error("Session not initialized");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error("Mic access failed:", err);
    }
  };

  const playNextChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const chunk = audioQueueRef.current.shift()!;
    
    if (!audioContextRef.current) return;
    
    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < chunk.length; i++) {
      channelData[i] = chunk[i] / 32768.0;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = playNextChunk;
    source.start();
  };

  const stopSession = () => {
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={`mb-4 p-4 rounded-2xl shadow-2xl border transition-all duration-300 w-64 ${
              isDarkMode 
                ? 'bg-gray-900 border-gray-800 text-white' 
                : 'bg-white border-black/5 text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
              <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-700'}`}>OGXAI Voice Assistant</span>
            </div>
            <p className={`text-xs italic mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {isSpeaking ? "Speaking..." : "Listening for your dictation..."}
            </p>
            {transcript && (
              <div className={`mt-2 p-2 rounded-lg border max-h-24 overflow-y-auto transition-colors duration-300 ${
                isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-black/5'
              }`}>
                <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{transcript}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isActive 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-black hover:bg-gray-900'
        } text-white`}
      >
        {isConnecting ? (
          <i className="fas fa-circle-notch fa-spin text-sm"></i>
        ) : isActive ? (
          <i className="fas fa-stop text-sm"></i>
        ) : (
          <div className="w-3 h-3 bg-white rounded-full"></div>
        )}
      </button>
    </div>
  );
});

export default VoiceAssistant;
