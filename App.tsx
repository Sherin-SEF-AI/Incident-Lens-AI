import React, { useState } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { extractFramesFromVideo, analyzeIncidentStream } from './services/geminiService';
import { AnalysisPhase, IncidentAnalysis, VideoSource } from './types';
import { Activity, Loader2, Upload, Scan, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, LayoutDashboard, FileVideo } from 'lucide-react';

export default function App() {
  const [phase, setPhase] = useState<AnalysisPhase>(AnalysisPhase.IDLE);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [analysis, setAnalysis] = useState<IncidentAnalysis | null>(null);
  const [streamingLog, setStreamingLog] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [judgeMode, setJudgeMode] = useState<boolean>(false);

  // Handlers
  const handleAnalysisStart = (filesData: {file: File, name: string}[]) => {
    const sources: VideoSource[] = filesData.map((f, idx) => ({
      id: `source-${idx}`,
      name: f.name,
      file: f.file,
      url: URL.createObjectURL(f.file)
    }));
    setVideoSources(sources);
    startAnalysis(sources);
  };

  const handleDemoSelect = (urls: string[]) => {
    const sources: VideoSource[] = urls.map((url, idx) => ({
      id: `source-${idx}`,
      name: `Demo Feed ${idx + 1}`,
      url: url
    }));
    setVideoSources(sources);
    startAnalysis(sources);
  };

  const startAnalysis = async (sources: VideoSource[]) => {
    try {
      setPhase(AnalysisPhase.PROCESSING_VIDEO);
      setError(null);
      setAnalysis(null);
      setStreamingLog('');
      
      const framesPayload = [];

      for (const [idx, source] of sources.entries()) {
          setProgress(`Extracting keyframes: ${source.name}...`);
          const frames = await extractFramesFromVideo(source.url, 5);
          framesPayload.push({ name: source.name, frames: frames });
      }
      
      setPhase(AnalysisPhase.ANALYZING);
      setProgress(`Initializing Gemini 3 Forensic Engine...`);

      const result = await analyzeIncidentStream(
        framesPayload, 
        "Execute Master Forensic Analysis Protocol.",
        (chunk) => setStreamingLog(chunk)
      );
      
      setAnalysis(result);
      setPhase(AnalysisPhase.COMPLETE);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis failed.");
      setPhase(AnalysisPhase.ERROR);
    }
  };

  return (
    <div className="h-screen bg-background text-textPrimary flex flex-col overflow-hidden font-sans relative selection:bg-primary/30">
      
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-grid-pattern bg-[length:40px_40px] opacity-10 pointer-events-none z-0"></div>
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0"></div>
      
      {/* Header */}
      <header className="h-16 border-b border-white/5 glass shrink-0 z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setPhase(AnalysisPhase.IDLE)}>
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/40 group-hover:bg-primary group-hover:text-white transition-all text-primary">
              <Scan size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">INCIDENT LENS <span className="text-primary">AI</span></h1>
              <p className="text-[9px] text-textTertiary font-mono tracking-widest uppercase mt-0.5">Forensic Analysis Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             {/* Status Pill */}
             <div className="hidden md:flex items-center gap-2 bg-surfaceHighlight/50 border border-white/5 px-3 py-1 rounded-full">
               <div className={`w-1.5 h-1.5 rounded-full ${phase === AnalysisPhase.ANALYZING ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-glow-primary'}`}></div>
               <span className="font-mono text-[10px] text-textSecondary uppercase">
                 System: {phase === AnalysisPhase.ANALYZING ? 'Processing' : 'Ready'}
               </span>
             </div>
             
             {phase === AnalysisPhase.COMPLETE && (
                <button 
                  onClick={() => setJudgeMode(!judgeMode)}
                  className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-colors px-3 py-1 rounded-md border ${judgeMode ? 'border-danger/40 bg-danger/10 text-danger' : 'border-transparent text-textTertiary hover:text-white'}`}
                >
                    {judgeMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    Adjudication Mode
                </button>
             )}

             {phase === AnalysisPhase.COMPLETE && (
               <button 
                 onClick={() => setPhase(AnalysisPhase.IDLE)} 
                 className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary hover:bg-primaryHover text-white text-xs font-bold transition-all shadow-glow-primary"
               >
                 <Upload size={14} /> New Case
               </button>
             )}
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        
        {phase === AnalysisPhase.IDLE && (
          <div className="h-full overflow-y-auto custom-scrollbar">
             <VideoUploader onAnalyze={handleAnalysisStart} onDemoSelect={handleDemoSelect} />
          </div>
        )}

        {(phase === AnalysisPhase.PROCESSING_VIDEO || phase === AnalysisPhase.ANALYZING) && (
          <div className="h-full flex flex-col items-center justify-center p-6 relative">
             {/* Loading Animation */}
             <div className="relative w-full max-w-2xl aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent h-[40%] animate-scan pointer-events-none border-b border-primary/50 opacity-50"></div>
                
                {videoSources.length > 0 && (
                   <video src={videoSources[0].url} className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale" autoPlay loop muted />
                )}
                
                <div className="z-10 bg-surface/80 backdrop-blur-md p-8 rounded-2xl border border-white/10 flex flex-col items-center">
                   <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                   <h3 className="text-xl font-bold text-white mb-1">Analyzing Evidence</h3>
                   <p className="text-xs font-mono text-primary uppercase tracking-wider animate-pulse">{progress}</p>
                </div>
             </div>
          </div>
        )}

        {(phase === AnalysisPhase.COMPLETE) && (
          <AnalysisDashboard 
            analysis={analysis!} 
            streamingLog={streamingLog}
            judgeMode={judgeMode}
            videoSources={videoSources}
          />
        )}

        {phase === AnalysisPhase.ERROR && (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="bg-surface border border-danger/20 rounded-xl p-8 max-w-md text-center shadow-glow-danger">
              <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6 text-danger">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
              <p className="text-textSecondary text-sm mb-6">{error}</p>
              <button onClick={() => setPhase(AnalysisPhase.IDLE)} className="px-6 py-2 bg-surfaceHighlight hover:bg-surface border border-white/10 rounded text-sm text-white">
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}