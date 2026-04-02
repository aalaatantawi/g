import React, { useState, useEffect, useRef } from 'react';

interface DictationButtonProps {
  onResult: (text: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
}

export const DictationButton: React.FC<DictationButtonProps> = ({ onResult, isListening, setIsListening }) => {
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        onResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error !== 'no-speech') {
        setError(`Error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If it was stopped unexpectedly, we might want to restart, but for now just update state
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onResult, setIsListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition", e);
      }
    }
  };

  if (error && !isListening) {
    return (
      <button 
        type="button"
        className="text-red-500 hover:text-red-700 p-2 rounded-full transition-colors"
        title={error}
        disabled
      >
        <i className="fa-solid fa-microphone-slash"></i>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-3 rounded-full transition-all duration-300 shadow-sm flex items-center justify-center ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse shadow-red-200' 
          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
      }`}
      title={isListening ? "Stop dictation" : "Start dictation"}
    >
      <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
    </button>
  );
};
