import React, { useRef, useState, useEffect } from 'react';
import { Upload, Play, X, FileVideo, Database, Shield, Activity, Target } from 'lucide-react';
import { MOCK_VIDEOS } from '../constants';

interface VideoUploaderProps {
  onAnalyze: (filesData: {file: File, name: string}[]) => void;
  onDemoSelect: (urls: string[]) => void;
}

interface StagedFile {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onAnalyze, onDemoSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  const addFiles = (files: File[]) => {
    const newStaged = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file, name: file.name, previewUrl: URL.createObjectURL(file)
    }));
    setStagedFiles(prev => [...prev, ...newStaged]);
  };

  const removeFile = (id: string) => setStagedFiles(prev => prev.filter(f => f.id !== id));
  
  useEffect(() => { return () => { stagedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl)); }; }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 animate-fade-in font-sans">
      
      {/* Hero Section */}
      <div className="text-center mb-16 space-y-4">
         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono tracking-widest uppercase mb-4">
            <Target size={12} /> Forensic Suite v3.1
         </div>
         <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
            Digital Evidence <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Reconstruction Engine</span>
         </h2>
         <p className="text-textSecondary text-lg font-light max-w-2xl mx-auto">
            Advanced forensic analysis for traffic incidents. Upload footage to generate physics models, liability reports, and legal grounding.
         </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-surface/50 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative backdrop-blur-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        
        {stagedFiles.length > 0 ? (
          <div className="p-8">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider flex items-center gap-2">
                   <Database size={14} className="text-primary"/> Staged Evidence ({stagedFiles.length})
                </h3>
                <button 
                  onClick={() => onAnalyze(stagedFiles.map(f => ({file: f.file, name: f.name})))}
                  className="px-6 py-2 bg-primary hover:bg-primaryHover text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-glow-primary flex items-center gap-2"
                >
                  <Activity size={14} /> Initialize Analysis
                </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stagedFiles.map(file => (
                  <div key={file.id} className="bg-surface border border-white/5 rounded-lg p-3 flex gap-4 items-center group relative overflow-hidden">
                    <div className="w-20 h-14 bg-black rounded border border-white/5 overflow-hidden shrink-0 relative">
                       <video src={file.previewUrl} className="w-full h-full object-cover opacity-70" />
                    </div>
                    <div className="flex-1 min-w-0 z-10">
                       <input 
                         type="text" value={file.name}
                         onChange={(e) => setStagedFiles(prev => prev.map(f => f.id === file.id ? { ...f, name: e.target.value } : f))}
                         className="bg-transparent text-sm font-bold text-white w-full focus:outline-none focus:text-primary transition-colors placeholder-gray-600"
                       />
                       <p className="text-[10px] text-gray-500 font-mono mt-0.5">{(file.file.size / 1024 / 1024).toFixed(2)} MB • {file.file.type}</p>
                    </div>
                    <button onClick={() => removeFile(file.id)} className="p-2 text-textSecondary hover:text-danger transition-colors z-10"><X size={16}/></button>
                  </div>
                ))}
                
                <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="border border-dashed border-white/10 hover:border-primary/30 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all min-h-[80px]"
                >
                   <span className="text-[10px] font-bold text-textSecondary uppercase flex items-center gap-2"><Upload size={14}/> Add Source</span>
                </div>
             </div>
          </div>
        ) : (
          <div 
            className={`
              flex flex-col items-center justify-center py-24 px-4 cursor-pointer transition-all duration-300
              ${isDragging ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}
            `}
            onDragOver={handleDragOver} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept="video/*" multiple onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))} />
            
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${isDragging ? 'bg-primary text-white scale-110 shadow-glow-primary' : 'bg-surfaceHighlight text-textTertiary group-hover:text-primary'}`}>
              <Upload size={24} />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">Drop Incident Footage Here</h3>
            <p className="text-xs text-textSecondary font-mono border border-white/5 px-2 py-1 rounded">Supports MP4, MOV, AVI</p>
          </div>
        )}
      </div>

      {/* Case Files */}
      <div className="mt-20 border-t border-white/5 pt-10">
        <h3 className="text-xs font-bold text-textTertiary uppercase tracking-widest mb-8 flex items-center gap-2">
            <Shield size={14} /> Training Datasets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_VIDEOS.map((demo, idx) => (
            <div 
              key={idx}
              onClick={() => onDemoSelect(demo.urls)}
              className="group bg-surface border border-white/5 hover:border-primary/40 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 relative"
            >
              <div className="h-36 bg-black relative overflow-hidden">
                 <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 mix-blend-overlay"></div>
                 <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                    <div className="w-10 h-10 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg"><Play size={20} fill="white" /></div>
                 </div>
                 {/* Abstract visual for demo video placeholder */}
                 <div className="w-full h-full bg-surfaceHighlight flex items-center justify-center">
                    <FileVideo size={32} className="text-white/5" />
                 </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{demo.title}</h4>
                   <span className="text-[9px] font-mono text-textTertiary bg-surfaceHighlight px-1.5 py-0.5 rounded border border-white/5">{demo.duration}</span>
                </div>
                <p className="text-[10px] text-textSecondary leading-relaxed">{demo.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};