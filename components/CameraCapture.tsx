
import React, { useRef, useState, useEffect } from 'react';

interface Props {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<Props> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isInitializing, setIsInitializing] = useState(true);

  const startCamera = async (isFallback = false) => {
    setIsInitializing(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support camera access or you are not using HTTPS.");
      }

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // iPads can be sensitive to strict resolution ideals
      const constraints: MediaStreamConstraints = {
        video: isFallback ? true : { 
          facingMode: facingMode,
          width: { ideal: 1280, max: 1920 }, // Relaxed from hard 1920
          height: { ideal: 720, max: 1080 }   // Relaxed from hard 1080
        },
        audio: false
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // iPad critical: ensure we handle play explicitly
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.warn("Auto-play was prevented, waiting for user interaction", e);
          });
        }
      }
      setError(null);
    } catch (err: any) {
      console.error("Camera access error:", err);
      
      if (!isFallback && err.name !== 'NotAllowedError') {
        startCamera(true);
        return;
      }

      let userMessage = "Unable to access camera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userMessage = "Camera permission denied. On iPad, go to Settings > Safari > Camera and set to 'Allow'.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userMessage = "No camera found. If using an iPad with a cover, please ensure the lens is unobstructed.";
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        userMessage = "Camera access requires HTTPS for clinical security.";
      } else {
        userMessage = err.message || "Hardware initialization failed.";
      }
      setError(userMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const width = video.videoWidth || video.clientWidth;
      const height = video.videoHeight || video.clientHeight;
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirrored for user-facing camera (front)
        if (facingMode === 'user') {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(base64);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-[env(safe-area-inset-top)]">
      <div className="relative w-full h-full md:max-w-4xl md:h-auto md:aspect-video bg-black overflow-hidden flex items-center justify-center rounded-3xl shadow-2xl">
        {error ? (
          <div className="text-white text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
            </div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] mb-4">iPadOS Restriction</h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed uppercase tracking-widest">{error}</p>
            <div className="flex flex-col gap-4 mt-10">
              <button 
                onClick={() => startCamera()}
                className="bg-[#D4AF37] text-black px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Retry Feed
              </button>
              <button 
                onClick={onClose}
                className="text-white/40 hover:text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <>
            {isInitializing && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
                <div className="w-10 h-10 border-2 border-white/10 border-t-[#D4AF37] rounded-full animate-spin mb-6"></div>
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.4em]">Optimizing iPad Feed...</p>
              </div>
            )}
            
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
              <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                <p className="text-[9px] text-[#D4AF37] font-black uppercase tracking-[0.3em]">
                  <i className="fas fa-circle text-[6px] mr-2 animate-pulse text-red-500"></i>
                  Active Link
                </p>
              </div>
              <div className="flex gap-4 pointer-events-auto">
                <button 
                  onClick={toggleCamera}
                  className="w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-full flex items-center justify-center border border-white/20 active:scale-90 transition-transform"
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 bg-white/10 backdrop-blur-xl text-white rounded-full flex items-center justify-center border border-white/20 active:scale-90 transition-transform"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="absolute bottom-12 left-0 w-full flex flex-col items-center gap-8 px-6">
              <button 
                onClick={capturePhoto}
                className="group relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-[#D4AF37]/20"
              >
                <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
                   <div className="w-14 h-14 bg-black rounded-full"></div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
