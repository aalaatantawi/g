
import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import CameraCapture from './CameraCapture.tsx';

interface Props {
  onFilesChange: (files: { data: string; type: 'image' | 'video' }[]) => void;
  files: { data: string; type: 'image' | 'video' }[];
  disabled: boolean;
}

const ImageUploader: React.FC<Props> = ({ onFilesChange, files, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    const newFiles = await Promise.all(selectedFiles.map(file => new Promise<{ data: string; type: 'image' | 'video' }>((res) => {
      const reader = new FileReader();
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      reader.onloadend = () => res({ data: reader.result as string, type });
      reader.readAsDataURL(file);
    })));
    onFilesChange([...files, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" multiple className="hidden" />
      {isCameraOpen && <CameraCapture onCapture={(b64) => { onFilesChange([...files, { data: b64, type: 'image' }]); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
      
      <div className="grid grid-cols-2 gap-4">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => !disabled && fileInputRef.current?.click()}
          disabled={disabled}
          className="bg-white dark:bg-[#2A2A2A] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group shadow-sm hover:shadow-md"
        >
          <i className="fas fa-file-upload text-4xl text-gray-400 dark:text-gray-500 mb-4 block group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"></i>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-300">Upload Media</span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => !disabled && setIsCameraOpen(true)}
          disabled={disabled}
          className="bg-white dark:bg-[#2A2A2A] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group shadow-sm hover:shadow-md"
        >
          <i className="fas fa-camera text-4xl text-gray-400 dark:text-gray-500 mb-4 block group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"></i>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-300">Live Capture</span>
        </motion.button>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-[#f5f5f7] rounded-xl max-h-[400px] overflow-y-auto">
          {files.map((file, idx) => (
            <div key={idx} className="relative aspect-video rounded-lg bg-black overflow-hidden group">
              {file.type === 'image' ? (
                <img src={file.data} className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
              ) : (
                <video src={file.data} className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" controls={false} muted />
              )}
              <button 
                onClick={() => onFilesChange(files.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 bg-white/90 text-black w-6 h-6 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
              <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md text-white font-bold text-[8px] px-2 py-0.5 rounded tracking-widest">
                {file.type.toUpperCase()} {idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
