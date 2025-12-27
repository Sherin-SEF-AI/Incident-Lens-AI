
import React, { useRef, useState, useEffect } from 'react';
import { Upload, Play, X, FileVideo, Database, Shield, Activity, Target, ScanLine, FileCheck, ArrowRight, FileWarning, MapPin, Zap, Brain, Scale, Layers, Gavel } from 'lucide-react';
import { MOCK_VIDEOS, FEATURES } from '../constants';

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
  const [statement, setStatement] = useState('');
  const [location, setLocation] = useState('');

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

  const IconMap: Record<string, React.FC<any>> = {
      "Layers": Layers,
      "Activity": Activity,
      "Scale": Scale,
      "FileText": FileCheck,
      "ShieldCheck": Shield,
      "Brain": Brain,
      "Gavel": Gavel,
      "Zap": Zap
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 animate-fade-in font-sans relative z-10 flex flex-col min-h-[calc(100vh-4rem)]">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="video/*" 
        multiple 
        onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
                addFiles(Array.from(e.target.files));
                // Reset value to allow selecting the same file again if needed
                e.target.value = '';
            }
        }} 
      />

      {/* Hero Section */}
      <div className="text-center mb-16 space-y-6">
         <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primaryLight border border-primary/20 text-primary text-[11px] font-bold tracking-widest uppercase mb-2 shadow-sm animate-slide-up">
            <Target size={12} /> <span>System Operational</span>
         </div>
         <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-textPrimary animate-slide-up" style={{animationDelay: '0.1s'}}>
            Incident Lens <span className="text-primary">AI</span>
         </h2>
         <p className="text-textSecondary text-lg md:text-xl font-normal max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{animationDelay: '0.2s'}}>
            Professional forensic video reconstruction with autonomous investigation planning and legal context scouting.
         </p>
      </div>

      {/* Main Action Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-24 animate-slide-up" style={{animationDelay: '0.3s'}}>
        
        {/* Upload Zone */}
        <div className="lg:col-span-8">
            <div className={`
                relative rounded-2xl overflow-hidden border-2 transition-all duration-300 min-h-[450px] flex flex-col shadow-card hover:shadow-soft
                ${isDragging ? 'border-primary bg-primaryLight/10 scale-[1.01]' : 'border-dashed border-borderStrong bg-surface'}
            `}>
                {stagedFiles.length > 0 ? (
                  <div className="p-8 flex flex-col h-full bg-surface">
                     <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                        <h3 className="text-sm font-bold text-textPrimary uppercase tracking-widest flex items-center gap-2 font-mono">
                           <Database size={16} className="text-primary" /> Case Evidence ({stagedFiles.length})
                        </h3>
                        <button 
                          onClick={() => onAnalyze(stagedFiles.map(f => ({file: f.file, name: f.name})))}
                          className="group relative overflow-hidden px-6 py-3 bg-primary hover:bg-primaryHover text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md hover:shadow-glow flex items-center gap-2"
                        >
                          <span>Initialize Analysis</span> <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                     </div>
                     
                     <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                         <div className="grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar pr-2 max-h-[220px]">
                            {stagedFiles.map(file => (
                              <div key={file.id} className="bg-background border border-border rounded-xl p-3 flex gap-4 items-center group relative hover:shadow-md transition-all hover:border-primary/30">
                                <div className="w-24 h-16 bg-slate-900 rounded-lg overflow-hidden shrink-0 relative shadow-inner">
                                   <video src={file.previewUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                   <div className="absolute inset-0 flex items-center justify-center opacity-75"><Play size={20} className="fill-white text-white"/></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                   <label className="text-[10px] text-textTertiary uppercase font-bold tracking-wider mb-0.5 block">Evidence Label</label>
                                   <input 
                                     type="text" value={file.name}
                                     onChange={(e) => setStagedFiles(prev => prev.map(f => f.id === file.id ? { ...f, name: e.target.value } : f))}
                                     className="bg-transparent text-sm font-bold text-textPrimary w-full focus:outline-none focus:text-primary transition-colors font-sans border-b border-transparent focus:border-primary/20 pb-0.5"
                                   />
                                   <div className="flex items-center gap-3 mt-1.5">
                                       <p className="text-[10px] text-textSecondary font-mono flex items-center gap-1"><FileVideo size={10}/> {(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                       <span className="text-[10px] text-success font-mono flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><FileCheck size={10}/> Validated</span>
                                   </div>
                                </div>
                                <button onClick={() => removeFile(file.id)} className="p-2 text-textTertiary hover:text-danger hover:bg-rose-50 rounded-full transition-all"><X size={18}/></button>
                              </div>
                            ))}
                            
                            <div 
                               onClick={() => fileInputRef.current?.click()}
                               className="border-2 border-dashed border-border hover:border-primary/40 bg-background hover:bg-primaryLight/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all min-h-[60px] group"
                            >
                               <span className="text-xs font-bold text-textTertiary group-hover:text-primary uppercase flex items-center gap-2 transition-colors"><Upload size={16}/> Add Additional Source</span>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto pt-4 border-t border-border">
                             {/* Location Input */}
                             <div className="bg-background border border-border rounded-xl p-4">
                                <label className="text-[10px] font-bold text-textSecondary uppercase flex items-center gap-2 mb-2 font-mono tracking-wide">
                                    <MapPin size={12} className="text-success" /> Incident Location
                                </label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="City, State (e.g. 'Chicago, IL')"
                                    className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm font-medium text-textPrimary placeholder-textTertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                />
                             </div>

                             {/* Statement Input */}
                             <div className="bg-background border border-border rounded-xl p-4">
                                <label className="text-[10px] font-bold text-textSecondary uppercase flex items-center gap-2 mb-2 font-mono tracking-wide">
                                    <FileWarning size={12} className="text-warning" /> Claimant Statement
                                </label>
                                <textarea
                                    value={statement}
                                    onChange={(e) => setStatement(e.target.value)}
                                    placeholder="E.g., 'I was stopped at the red light...'"
                                    className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm font-medium text-textPrimary placeholder-textTertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 h-20 resize-none transition-all"
                                />
                             </div>
                         </div>
                     </div>
                  </div>
                ) : (
                  <div 
                    className="flex-1 flex flex-col items-center justify-center py-20 px-4 cursor-pointer"
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 relative group ${isDragging ? 'scale-110' : ''}`}>
                      <div className="absolute inset-0 bg-primaryLight rounded-2xl scale-90 group-hover:scale-110 transition-transform duration-500"></div>
                      <div className="bg-surface border border-border p-5 rounded-2xl relative z-10 shadow-lg group-hover:border-primary/30 transition-colors">
                          <Upload size={32} className="text-textTertiary group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-textPrimary mb-2 tracking-tight">Upload Forensic Evidence</h3>
                    <p className="text-sm text-textSecondary max-w-sm text-center mb-6">Drag and drop dashcam, CCTV, or bodycam footage to begin autonomous analysis.</p>
                    
                    <div className="flex gap-3">
                        <span className="text-[10px] font-mono font-bold text-textSecondary bg-background border border-border px-2 py-1 rounded">MP4</span>
                        <span className="text-[10px] font-mono font-bold text-textSecondary bg-background border border-border px-2 py-1 rounded">MOV</span>
                        <span className="text-[10px] font-mono font-bold text-textSecondary bg-background border border-border px-2 py-1 rounded">MKV</span>
                    </div>
                  </div>
                )}
            </div>
        </div>

        {/* Demo/Training Data */}
        <div className="lg:col-span-4 flex flex-col h-full">
            <div className="bg-surface border border-border rounded-2xl p-6 h-full flex flex-col shadow-card">
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-widest mb-6 flex items-center gap-2 font-mono">
                    <Shield size={14} className="text-success" /> Training Scenarios
                </h3>
                
                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                    {MOCK_VIDEOS.map((demo, idx) => (
                        <div 
                        key={idx}
                        onClick={() => onDemoSelect(demo.urls)}
                        className="group bg-background hover:bg-surface border border-border hover:border-primary/30 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
                        >
                            <div className="flex h-full">
                                <div className="w-24 bg-surfaceHighlight relative overflow-hidden shrink-0 flex items-center justify-center border-r border-border">
                                    <ScanLine size={24} className="text-textTertiary group-hover:text-primary transition-colors" />
                                </div>
                                <div className="p-4 flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-xs text-textPrimary group-hover:text-primary transition-colors line-clamp-1">{demo.title}</h4>
                                    </div>
                                    <p className="text-[10px] text-textSecondary leading-relaxed line-clamp-2 mb-3">{demo.description}</p>
                                    <span className="text-[9px] font-mono font-bold text-success bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{demo.duration}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-center gap-2 text-[10px] text-textTertiary font-mono">
                        <Shield size={10} /> ISO 27001 Compliant Environment
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- ELEVATOR PITCH DECK --- */}
      <div className="mb-24 animate-slide-up" style={{animationDelay: '0.4s'}}>
          <div className="text-center mb-12">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primaryLight/50 px-3 py-1 rounded-full border border-primaryLight">The Value Proposition</span>
              <h2 className="text-3xl font-bold text-textPrimary mt-4 mb-2">Why Incident Lens?</h2>
              <p className="text-textSecondary text-sm max-w-xl mx-auto">Transforming unstructured video data into adjudicated legal truth through multi-modal AI synthesis.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-surface border border-border rounded-2xl p-8 relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primaryLight/20 rounded-bl-full -mr-8 -mt-8 group-hover:bg-primaryLight/40 transition-colors"></div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                      <Brain size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-textPrimary mb-3">Autonomous Reconstruction</h3>
                  <p className="text-sm text-textSecondary leading-relaxed">
                      Instantaneously convert raw 2D footage into 3D kinematic models. Our engine calculates velocity, impact forces, and trajectories without manual plotting, reducing analysis time from days to minutes.
                  </p>
              </div>

              {/* Card 2 */}
              <div className="bg-surface border border-border rounded-2xl p-8 relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-emerald-100 transition-colors"></div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                      <Scale size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-textPrimary mb-3">Legal Admissibility</h3>
                  <p className="text-sm text-textSecondary leading-relaxed">
                      Built for the courtroom. Every pixel-to-meter calculation is transparently logged. Our "Reasoning Trace" technology cites specific traffic statutes and case law precedents for every fault determination.
                  </p>
              </div>

              {/* Card 3 */}
              <div className="bg-surface border border-border rounded-2xl p-8 relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-amber-100 transition-colors"></div>
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                      <Zap size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-textPrimary mb-3">Multi-Modal Synthesis</h3>
                  <p className="text-sm text-textSecondary leading-relaxed">
                      We don't just "see" video. We fuse audio waveforms, shadow geometry, and environmental metadata to reveal what the camera missed—like off-screen braking or signal states inferred from traffic flow.
                  </p>
              </div>
          </div>
      </div>

      {/* --- FEATURES SHOWCASE --- */}
      <div className="mb-20 animate-slide-up" style={{animationDelay: '0.5s'}}>
          <div className="border-t border-border pt-16">
              <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                  <div>
                      <h3 className="text-xl font-bold text-textPrimary mb-1">Core Capabilities</h3>
                      <p className="text-sm text-textSecondary">Enterprise-grade tools for insurance carriers and legal defense teams.</p>
                  </div>
                  <button className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                      View Full Documentation <ArrowRight size={12}/>
                  </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {FEATURES.map((feature, idx) => {
                      const Icon = IconMap[feature.icon] || Zap;
                      return (
                          <div key={idx} className="bg-background border border-border rounded-xl p-4 flex flex-col items-center text-center hover:border-primary/30 hover:bg-surface transition-all cursor-default group">
                              <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center mb-3 text-textTertiary group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                                  <Icon size={18} />
                              </div>
                              <span className="text-xs font-bold text-textSecondary group-hover:text-textPrimary transition-colors leading-tight">
                                  {feature.label}
                              </span>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

    </div>
  );
};
