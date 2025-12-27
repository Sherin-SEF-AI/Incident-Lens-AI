
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
    <div className="h-screen bg-background text-textPrimary flex flex-col overflow-hidden font-sans relative selection:bg-primaryLight selection:text-primary">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none z-0"></div>
      
      {/* Header */}
      <header className="h-16 border-b border-border bg-surface/90 backdrop-blur-md shrink-0 z-50 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setPhase(AnalysisPhase.IDLE)}>
            <div className="w-9 h-9 bg-primary text-white rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Scan size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-textPrimary leading-none">Incident Lens <span className="text-primary">AI</span></h1>
              <p className="text-[10px] text-textSecondary font-mono tracking-widest uppercase mt-0.5">Forensic Analysis Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             {/* Status Pill */}
             <div className="hidden md:flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-full shadow-sm">
               <div className={`w-2 h-2 rounded-full ${phase === AnalysisPhase.ANALYZING ? 'bg-warning animate-pulse' : 'bg-success'}`}></div>
               <span className="font-mono text-[10px] font-bold text-textSecondary uppercase tracking-wide">
                 System: {phase === AnalysisPhase.ANALYZING ? 'Processing' : 'Ready'}
               </span>
             </div>
             
             {phase === AnalysisPhase.COMPLETE && (
                <button 
                  onClick={() => setJudgeMode(!judgeMode)}
                  className={`flex items-center gap-2 text-[11px] font-bold uppercase transition-colors px-3 py-1.5 rounded-lg border ${judgeMode ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-border text-textSecondary hover:text-textPrimary hover:bg-background'}`}
                >
                    {judgeMode ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    Adjudication Mode
                </button>
             )}

             {phase === AnalysisPhase.COMPLETE && (
               <button 
                 onClick={() => setPhase(AnalysisPhase.IDLE)} 
                 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-textPrimary hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-md"
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
             <div className="relative w-full max-w-2xl aspect-video bg-surface rounded-2xl overflow-hidden border border-border shadow-2xl flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-background/50"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-primaryLight/20 to-transparent h-[40%] animate-scan pointer-events-none border-b border-primary/20"></div>
                
                {videoSources.length > 0 && (
                   <video src={videoSources[0].url} className="absolute inset-0 w-full h-full object-cover opacity-10 grayscale blur-sm" autoPlay loop muted />
                )}
                
                <div className="z-10 bg-surface/90 backdrop-blur-xl p-10 rounded-2xl border border-border flex flex-col items-center shadow-panel">
                   <Loader2 className="w-10 h-10 text-primary animate-spin mb-6" />
                   <h3 className="text-lg font-bold text-textPrimary mb-2">Analyzing Evidence</h3>
                   <p className="text-xs font-mono text-primary font-bold uppercase tracking-widest animate-pulse">{progress}</p>
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
            <div className="bg-surface border border-rose-200 rounded-xl p-8 max-w-md text-center shadow-xl">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-danger border border-rose-100">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-textPrimary mb-2">Analysis Failed</h3>
              <p className="text-textSecondary text-sm mb-6 leading-relaxed">{error}</p>
              <button onClick={() => setPhase(AnalysisPhase.IDLE)} className="px-6 py-2.5 bg-background hover:bg-border border border-border rounded-lg text-sm font-bold text-textPrimary transition-colors">
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
