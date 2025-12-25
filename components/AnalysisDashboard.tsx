
import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from "jspdf";
import { IncidentAnalysis, ConfidenceLevel, Entity, RoiAnalysis, VideoSource } from '../types';
import { RiskRadarChart, FaultChart } from './AnalysisCharts';
import { evaluateCounterfactual, searchSimilarCases, analyzeRegionOfInterest, generateReport } from '../services/geminiService';
import { FileText, Activity, Scale, Truck, Clock, Video, Zap, PlayCircle, Layers, GitPullRequest, Loader2, Minimize2, ZoomIn, RotateCcw, PenTool, MousePointer2, Settings, AlertTriangle, List, Search, ChevronRight, ChevronLeft, Pause, Play, Scan, Crosshair, X, Terminal, ShieldCheck, CheckCircle2, HelpCircle, AlertOctagon, Ruler, Calculator, Gavel, MonitorPlay, Speaker, Waves, Sparkles, Sun, Cloud, Thermometer, Signpost, Grip, Wind, Camera, Aperture, User, Eye, Smartphone, UserX, Share2, Circle, Signal, Car, Droplets, Construction, EyeOff, TreeDeciduous, Lock, FileCheck, Database, Hammer, ShieldAlert, BookOpen } from 'lucide-react';

interface AnalysisDashboardProps {
  analysis: IncidentAnalysis | null;
  streamingLog?: string;
  judgeMode: boolean;
  videoSources: VideoSource[];
}

// --- SHARED UI PRIMITIVES ---

const ConfidenceBadge: React.FC<{ level?: ConfidenceLevel }> = ({ level = 'Insufficient' }) => {
  const styles = {
    'High': 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    'Moderate': 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    'Low': 'text-danger border-danger/30 bg-danger/10',
    'Insufficient': 'text-gray-500 border-gray-500/30 bg-gray-500/10'
  }[level];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${styles}`}>
      {level === 'High' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />}
      {level === 'Moderate' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
      {level === 'Low' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
      {level === 'Insufficient' && <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />}
      {level} Conf.
    </span>
  );
};

const TextWithTimestamps: React.FC<{ text: string; onSeek: (t: number) => void }> = ({ text, onSeek }) => {
  if (!text) return null;
  // Regex to capture bold text (**text**) OR timestamps ([MM:SS] or [MM:SS.ms])
  const parts = text.split(/(\*\*.*?\*\*|\[\d{1,2}:\d{2}(?:\.\d+)?\])/g);
  
  return (
    <span>
      {parts.map((part, i) => {
        // Check for timestamp
        const tsMatch = part.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d+))?\]$/);
        if (tsMatch) {
           const seconds = parseInt(tsMatch[1]) * 60 + parseInt(tsMatch[2]) + (tsMatch[3] ? parseFloat(`0.${tsMatch[3]}`) : 0);
           return (
            <button key={i} onClick={(e) => { e.stopPropagation(); onSeek(seconds); }}
              className="text-primary hover:text-white hover:underline cursor-pointer font-mono font-bold mx-0.5 transition-colors bg-primary/10 px-1 rounded border border-primary/20 text-[0.9em] align-baseline"
              title={`Jump to ${part}`}
            >
              {part}
            </button>
          );
        }
        // Check for bold
        if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} className="font-bold text-white">{part.slice(2, -2)}</span>;
        }
        // Plain text
        return <span key={i} className="text-inherit">{part}</span>;
      })}
    </span>
  );
};

const ReasoningLogRenderer: React.FC<{ text: string; onSeek: (t: number) => void }> = ({ text, onSeek }) => {
  // Hide JSON block for the log view if present at the end
  const displayText = text.replace(/```json[\s\S]*$/, '').replace(/```json[\s\S]*```/, '').trim();
  const lines = displayText.split('\n');

  return (
    <div className="font-mono text-xs leading-relaxed space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('###')) {
           // Phase Header
           return (
             <div key={i} className="mt-8 mb-3 flex items-center gap-3 text-cyan-400 border-b border-cyan-900/50 pb-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]"/>
                <span className="font-bold tracking-[0.2em] uppercase">{trimmed.replace(/#/g, '').trim()}</span>
             </div>
           );
        }
        if (trimmed.startsWith('-')) {
            // Bullet point
            return (
                <div key={i} className="pl-4 flex gap-2">
                    <span className="text-gray-600">•</span>
                    <div className="text-gray-300"><TextWithTimestamps text={trimmed.substring(1).trim()} onSeek={onSeek} /></div>
                </div>
            )
        }
        if (trimmed === '') return <div key={i} className="h-2"></div>;
        
        return <div key={i} className="text-gray-400 pl-0"><TextWithTimestamps text={line} onSeek={onSeek} /></div>;
      })}
      <div className="h-4 w-2 bg-primary/50 animate-pulse inline-block mt-2"/>
    </div>
  );
};

// --- TIMELINE COMPONENT ---

const TimelineTrack: React.FC<{ duration: number; currentTime: number; onSeek: (t: number) => void; events: any[] }> = ({ duration, currentTime, onSeek, events }) => {
    return (
        <div className="relative h-14 w-full bg-[#0c0c10] border-t border-white/5 flex items-center px-4 select-none">
            {/* Ticks */}
            <div className="absolute inset-0 pointer-events-none flex justify-between px-4 opacity-20">
                {Array.from({ length: 11 }).map((_, i) => (
                    <div key={i} className="h-full w-px bg-white/20 relative">
                        <span className="absolute bottom-1 left-1 text-[8px] font-mono text-gray-500">{Math.round((duration/10)*i)}s</span>
                    </div>
                ))}
            </div>

            {/* Scrubber */}
            <div 
                className="relative w-full h-2 bg-white/5 rounded-full cursor-pointer group"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onSeek(((e.clientX - rect.left) / rect.width) * duration);
                }}
            >
                {/* Event Markers */}
                {events.map((evt, i) => {
                     const match = evt.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                     if (!match) return null;
                     const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                     const pct = (sec / duration) * 100;
                     return (
                         <div key={i} 
                            className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${evt.type === 'impact' ? 'bg-danger shadow-[0_0_8px_rgba(244,63,94,0.8)] z-20 scale-125' : 'bg-primary/50 z-10 hover:bg-white'} transition-colors`} 
                            style={{ left: `${pct}%` }}
                            title={evt.description}
                         />
                     );
                })}

                {/* Progress */}
                <div className="absolute top-0 left-0 bottom-0 bg-primary/40 rounded-full pointer-events-none" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                
                {/* Playhead */}
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] z-30 pointer-events-none transition-transform duration-75" style={{ left: `${(currentTime/duration)*100}%`, transform: 'translate(-50%, -50%)' }}></div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD ---

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ analysis, streamingLog = "", judgeMode, videoSources }) => {
  const [activeTab, setActiveTab] = useState<'log' | 'authenticity' | 'narrative' | 'scene' | 'damage' | 'hazards' | 'signals' | 'entities' | 'vehicles' | 'occupants' | 'debris' | 'physics' | 'sim' | 'liability' | 'synthesis' | 'audio' | 'reflections' | 'shadows'>('log');
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [videoDuration, setVideoDuration] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Tools
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [contrast, setContrast] = useState(100);
  const [toolMode, setToolMode] = useState<'view' | 'draw' | 'scan'>('view');
  
  // Drawing & Annotation
  const [isPanning, setIsPanning] = useState(false);
  const [annotations, setAnnotations] = useState<{points: {x:number, y:number}[], color: string}[]>([]);
  const [currentPath, setCurrentPath] = useState<{x:number, y:number}[]>([]);
  const [annotationColor, setAnnotationColor] = useState('#ef4444');
  
  // Scan / ROI
  const [roiSelection, setRoiSelection] = useState<{start: {x:number, y:number}, end: {x:number, y:number}} | null>(null);
  const [isSelectingRoi, setIsSelectingRoi] = useState(false);
  const [roiModalOpen, setRoiModalOpen] = useState(false);
  const [roiImage, setRoiImage] = useState<string | null>(null);
  const [roiQuery, setRoiQuery] = useState('');
  const [roiResult, setRoiResult] = useState<RoiAnalysis | null>(null);
  const [isRoiAnalyzing, setIsRoiAnalyzing] = useState(false);

  // Confidence Audit
  const [confidenceModalOpen, setConfidenceModalOpen] = useState(false);

  // Reporting State
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Sim
  const [sandboxSpeed, setSandboxSpeed] = useState(0);
  const [sandboxFriction, setSandboxFriction] = useState(0.7);
  const [customQuery, setCustomQuery] = useState('');
  const [simResult, setSimResult] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [legalQuery, setLegalQuery] = useState('');
  const [legalResult, setLegalResult] = useState<{text: string, chunks: any[]} | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (activeTab === 'log' && logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [streamingLog, analysis, activeTab]);

  // Video loop for Canvas sync
  useEffect(() => {
      let animId: number;
      const loop = () => {
          if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              setIsPlaying(!videoRef.current.paused);
          }
          animId = requestAnimationFrame(loop);
      }
      loop();
      return () => cancelAnimationFrame(animId);
  }, []);

  // Canvas Logic
  const getCoords = (e: React.MouseEvent) => {
      const c = canvasRef.current;
      if (!c) return { x: 0, y: 0 };
      const r = c.getBoundingClientRect();
      const sx = c.width / r.width;
      const sy = c.height / r.height;
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (toolMode === 'draw') {
        isDrawing.current = true;
        setCurrentPath([getCoords(e)]);
      } else if (toolMode === 'scan') {
        setIsSelectingRoi(true);
        const coords = getCoords(e);
        setRoiSelection({ start: coords, end: coords });
      } else if (zoom > 1) {
        setIsPanning(true);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (toolMode === 'draw' && isDrawing.current) {
          setCurrentPath(p => [...p, getCoords(e)]);
      } else if (toolMode === 'scan' && isSelectingRoi && roiSelection) {
          setRoiSelection(prev => ({ ...prev!, end: getCoords(e) }));
      } else if (isPanning && zoom > 1) {
          setPan(p => ({ x: p.x + e.movementX/zoom, y: p.y + e.movementY/zoom })); 
      }
  };

  const handleMouseUp = () => {
      if (toolMode === 'draw' && isDrawing.current) {
          if (currentPath.length > 0) setAnnotations(p => [...p, { points: currentPath, color: annotationColor }]);
          setCurrentPath([]);
          isDrawing.current = false;
      } else if (toolMode === 'scan' && isSelectingRoi && roiSelection) {
          setIsSelectingRoi(false);
          // Capture Crop
          captureRoi();
          setToolMode('view'); // Exit scan mode after capture
      }
      setIsPanning(false);
  };

  const captureRoi = () => {
      if (!canvasRef.current || !videoRef.current || !roiSelection) return;
      
      const video = videoRef.current;
      const scaleX = video.videoWidth / canvasRef.current.width;
      const scaleY = video.videoHeight / canvasRef.current.height;

      const x = Math.min(roiSelection.start.x, roiSelection.end.x) * scaleX;
      const y = Math.min(roiSelection.start.y, roiSelection.end.y) * scaleY;
      const w = Math.abs(roiSelection.end.x - roiSelection.start.x) * scaleX;
      const h = Math.abs(roiSelection.end.y - roiSelection.start.y) * scaleY;

      if (w < 10 || h < 10) return; // Ignore tiny clicks

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
          ctx.filter = `contrast(${contrast}%)`;
          ctx.drawImage(video, x, y, w, h, 0, 0, w, h);
          setRoiImage(tempCanvas.toDataURL('image/jpeg'));
          setRoiModalOpen(true);
          setRoiSelection(null);
      }
  };

  // Rendering Canvas Overlay
  useEffect(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw Annotations
      const draw = (pts: {x:number, y:number}[], col: string) => {
          if (pts.length < 2) return;
          ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.moveTo(pts[0].x, pts[0].y);
          for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
      };
      annotations.forEach(a => draw(a.points, a.color));
      if (toolMode === 'draw' && currentPath.length > 0) draw(currentPath, annotationColor);

      // Draw ROI Box
      if (roiSelection) {
          const { start, end } = roiSelection;
          const w = end.x - start.x;
          const h = end.y - start.y;
          
          ctx.strokeStyle = '#06b6d4'; // Cyan
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(start.x, start.y, w, h);
          ctx.setLineDash([]);
          
          ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
          ctx.fillRect(start.x, start.y, w, h);

          // Draw "Corners" for effect
          const s = 10;
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 4;
          // Top Left
          ctx.beginPath(); ctx.moveTo(start.x, start.y + s); ctx.lineTo(start.x, start.y); ctx.lineTo(start.x + s, start.y); ctx.stroke();
          // Top Right
          ctx.beginPath(); ctx.moveTo(end.x, start.y + s); ctx.lineTo(end.x, start.y); ctx.lineTo(end.x - s, start.y); ctx.stroke();
          // Bottom Right
          ctx.beginPath(); ctx.moveTo(end.x, end.y - s); ctx.lineTo(end.x, end.y); ctx.lineTo(end.x - s, end.y); ctx.stroke();
          // Bottom Left
          ctx.beginPath(); ctx.moveTo(start.x, end.y - s); ctx.lineTo(start.x, end.y); ctx.lineTo(start.x + s, end.y); ctx.stroke();
      }

  }, [annotations, currentPath, annotationColor, roiSelection, toolMode]);

  useEffect(() => {
      if (videoRef.current && canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 1280;
          canvasRef.current.height = videoRef.current.videoHeight || 720;
      }
  }, [videoSources, activeSourceIdx]);

  // Actions
  const togglePlay = () => {
      if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
      }
  };

  const handleSeek = (t: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, Math.min(t, videoRef.current.duration || 0));
      }
  };

  const resetTools = () => {
      setZoom(1); setPan({x:0,y:0}); setContrast(100); setAnnotations([]); setToolMode('view');
  };

  const generatePdf = (title: string, content: string) => {
      const doc = new jsPDF();
      // Header
      doc.setFillColor(20, 20, 25); // Dark background
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("INCIDENT LENS AI", 14, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("FORENSIC ANALYSIS REPORT", 196, 16, { align: 'right' });

      // Report Title
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(title.toUpperCase(), 14, 40);
      doc.setLineWidth(0.5);
      doc.line(14, 45, 196, 45);
      
      // Metadata
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 52);
      doc.text(`Case Ref: ${analysis?.entities?.[0]?.id || 'UNKNOWN'}`, 196, 52, { align: 'right' });

      // Content
      doc.setFont("times", "roman");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      
      const splitText = doc.splitTextToSize(content, 180);
      let y = 65;
      
      // Simple pagination handling
      for (let i = 0; i < splitText.length; i++) {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(splitText[i], 14, y);
        y += 6;
      }
      
      doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const handleExport = async (type: string) => {
      if (!analysis) return;
      setGeneratingReport(type);
      try {
          const content = await generateReport(analysis.rawAnalysis, type);
          generatePdf(type, content);
      } catch (e) {
          console.error("Report generation failed", e);
      } finally {
          setGeneratingReport(null);
      }
  };

  // Decide what text to show in the log
  // If analysis is done, use rawAnalysis (which contains the full log). 
  // If streaming, use streamingLog.
  const contentToRender = analysis ? analysis.rawAnalysis : streamingLog;

  return (
    <div className="flex flex-col lg:flex-row h-full bg-background overflow-hidden animate-fade-in relative">
      
      {/* ... (Existing Confidence and ROI Modals) ... */}
      
      {/* --- CONFIDENCE AUDIT MODAL --- */}
      {confidenceModalOpen && analysis?.confidenceReport && (
          <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur flex items-center justify-center p-6 animate-fade-in">
              {/* ... (Modal content unchanged) ... */}
              <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#121216]">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              analysis.confidenceReport.overallLevel === 'High' ? 'bg-emerald-500/20 text-emerald-400' :
                              analysis.confidenceReport.overallLevel === 'Moderate' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                              <ShieldCheck size={20} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-white">Forensic Confidence Audit</h3>
                              <p className="text-xs text-textSecondary">Reliability assessment of automated findings</p>
                          </div>
                      </div>
                      <button onClick={() => setConfidenceModalOpen(false)} className="text-textSecondary hover:text-white p-2 rounded-full hover:bg-white/10"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {/* ... (Existing confidence modal internals) ... */}
                          {/* Left Column: Score & Summary */}
                          <div className="space-y-6">
                              <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                                  <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 100 100">
                                      <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="8" />
                                      <circle cx="50" cy="50" r="45" fill="none" 
                                        stroke={analysis.confidenceReport.overallLevel === 'High' ? '#10b981' : analysis.confidenceReport.overallLevel === 'Moderate' ? '#f59e0b' : '#f43f5e'} 
                                        strokeWidth="8" 
                                        strokeDasharray={`${analysis.confidenceReport.overallScore * 2.83}, 283`}
                                        strokeLinecap="round"
                                      />
                                  </svg>
                                  <div className="text-center">
                                      <div className="text-4xl font-mono font-bold text-white">{analysis.confidenceReport.overallScore}</div>
                                      <div className={`text-xs font-bold uppercase tracking-widest ${
                                          analysis.confidenceReport.overallLevel === 'High' ? 'text-emerald-400' :
                                          analysis.confidenceReport.overallLevel === 'Moderate' ? 'text-amber-400' : 'text-rose-400'
                                      }`}>{analysis.confidenceReport.overallLevel}</div>
                                  </div>
                              </div>
                              <div className="p-4 bg-white/5 rounded-lg border border-white/5 text-xs text-gray-300 leading-relaxed">
                                  {analysis.confidenceReport.confidenceStatement}
                              </div>
                          </div>

                          {/* Middle Column: Dimensions */}
                          <div className="space-y-6">
                              <h4 className="text-xs font-bold text-textTertiary uppercase tracking-widest border-b border-white/5 pb-2">Analysis Dimensions</h4>
                              {[
                                  { label: "Entity Identification", val: analysis.confidenceReport.metrics.identification },
                                  { label: "Temporal Precision", val: analysis.confidenceReport.metrics.timing },
                                  { label: "Physics Calculations", val: analysis.confidenceReport.metrics.physics },
                                  { label: "Causal Reasoning", val: analysis.confidenceReport.metrics.causation },
                              ].map((m, i) => (
                                  <div key={i}>
                                      <div className="flex justify-between text-xs mb-1.5">
                                          <span className="text-gray-400">{m.label}</span>
                                          <span className={`font-bold ${
                                              m.val === 'High' ? 'text-emerald-400' : m.val === 'Moderate' ? 'text-amber-400' : 'text-rose-400'
                                          }`}>{m.val}</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${
                                              m.val === 'High' ? 'bg-emerald-500 w-[95%]' : m.val === 'Moderate' ? 'bg-amber-500 w-[70%]' : 'bg-rose-500 w-[40%]'
                                          }`}></div>
                                      </div>
                                  </div>
                              ))}
                              {analysis.confidenceReport.uncertaintyFactors?.length > 0 && (
                                  <div className="mt-6">
                                      <h4 className="text-xs font-bold text-textTertiary uppercase tracking-widest border-b border-white/5 pb-2 mb-3">Uncertainty Factors</h4>
                                      <div className="space-y-2">
                                          {(analysis.confidenceReport.uncertaintyFactors || []).map((f, i) => (
                                              <div key={i} className="flex gap-2 items-start p-2 rounded bg-rose-500/10 border border-rose-500/20">
                                                  <AlertTriangle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                                                  <div>
                                                      <div className="text-xs font-bold text-rose-300">{f.category}</div>
                                                      <div className="text-[10px] text-rose-200/70">{f.description}</div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>

                          {/* Right Column: Alternatives */}
                          <div className="space-y-6">
                              <h4 className="text-xs font-bold text-textTertiary uppercase tracking-widest border-b border-white/5 pb-2">Alternative Interpretations</h4>
                              {analysis.confidenceReport.alternatives?.length > 0 ? (
                                  (analysis.confidenceReport.alternatives || []).map((alt, i) => (
                                      <div key={i} className="p-3 bg-surfaceHighlight rounded border border-white/5">
                                          <div className="flex justify-between items-start mb-1">
                                              <span className="text-xs font-bold text-white w-3/4">{alt.scenario}</span>
                                              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{alt.likelihood}</span>
                                          </div>
                                          <p className="text-[10px] text-gray-500">{alt.supportingEvidence}</p>
                                      </div>
                                  ))
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-32 text-gray-600 border border-dashed border-white/10 rounded">
                                      <CheckCircle2 size={24} className="mb-2 opacity-50"/>
                                      <span className="text-xs">No dominant alternatives identified</span>
                                  </div>
                              )}
                              <div className="pt-4 border-t border-white/5">
                                  <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-2">Recommendations</h4>
                                  <ul className="space-y-1">
                                      {analysis.confidenceReport.improvementRecommendations?.map((rec, i) => (
                                          <li key={i} className="text-[10px] text-gray-400 flex gap-2">
                                              <span className="text-primary">•</span> {rec}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- ROI MODAL --- */}
      {roiModalOpen && roiImage && (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in">
              {/* ... (ROI modal content unchanged) ... */}
              <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[80vh]">
                  <div className="md:w-1/2 bg-black flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/5 relative">
                      <div className="absolute top-4 left-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-900/20 px-2 py-1 rounded border border-cyan-500/20">Source Crop</div>
                      <img src={roiImage} className="max-w-full max-h-full object-contain shadow-[0_0_30px_rgba(6,182,212,0.15)] border border-cyan-500/30" />
                  </div>
                  <div className="md:w-1/2 p-6 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Scan size={20} className="text-cyan-400"/> Deep Scan Analysis</h3>
                          <button onClick={() => { setRoiModalOpen(false); setRoiResult(null); setRoiQuery(''); }} className="text-gray-500 hover:text-white"><X size={20}/></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
                          {roiResult ? (
                              <div className="space-y-4 animate-fade-in">
                                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                                      <h4 className="text-xs font-bold text-cyan-300 uppercase mb-2">Analysis Result</h4>
                                      <p className="text-sm text-gray-200 leading-relaxed">{roiResult.answer}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="p-3 bg-surfaceHighlight rounded border border-white/5">
                                          <div className="text-[10px] text-gray-500 uppercase">Confidence</div>
                                          <div className="text-sm font-bold text-white">{roiResult.confidence}</div>
                                      </div>
                                      <div className="p-3 bg-surfaceHighlight rounded border border-white/5">
                                          <div className="text-[10px] text-gray-500 uppercase">Details</div>
                                          <div className="text-xs text-gray-300 truncate">{roiResult.details}</div>
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                                  <Scan size={48} className="opacity-20"/>
                                  <p className="text-xs text-center">Select an area to inspect specific details <br/> like license plates, debris, or signals.</p>
                              </div>
                          )}
                      </div>

                      <div className="mt-auto">
                          <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Investigative Query</label>
                          <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={roiQuery}
                                onChange={(e) => setRoiQuery(e.target.value)}
                                placeholder="E.g., 'Read the license plate' or 'Describe the damage'"
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                              />
                              <button 
                                onClick={() => { 
                                    if(!roiQuery) return;
                                    setIsRoiAnalyzing(true);
                                    analyzeRegionOfInterest(roiImage.split(',')[1], roiQuery).then(res => {
                                        setRoiResult(res);
                                        setIsRoiAnalyzing(false);
                                    })
                                }}
                                disabled={isRoiAnalyzing || !roiQuery}
                                className="px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 flex items-center justify-center min-w-[60px]"
                              >
                                  {isRoiAnalyzing ? <Loader2 size={20} className="animate-spin"/> : <Search size={20}/>}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- LEFT PANEL: INTEGRATED EVIDENCE VIEWER --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#07070a] relative border-r border-white/5">
         {/* ... (Existing Left Panel Content) ... */}
         {/* Top Bar: Stats */}
         <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0a0f]">
             <div className="flex items-center gap-6 text-[10px] font-mono text-textTertiary uppercase tracking-widest">
                 <span className="flex items-center gap-1.5"><Clock size={10} className="text-primary"/> {currentTime.toFixed(3)}s / {videoDuration.toFixed(2)}s</span>
                 {analysis && <span className="flex items-center gap-1.5"><Activity size={10} className="text-primary"/> {analysis?.timeline?.length || 0} Events</span>}
                 <span className="flex items-center gap-1.5"><Video size={10} className="text-primary"/> {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight} Source</span>
             </div>
             {analysis?.confidenceReport && (
                <button 
                    onClick={() => setConfidenceModalOpen(true)}
                    className="flex items-center gap-2 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group cursor-pointer"
                >
                    <span className="text-[9px] text-textTertiary font-bold uppercase group-hover:text-white">Reliability Score</span>
                    <div className={`text-[10px] font-mono font-bold ${
                        analysis.confidenceReport.overallScore >= 80 ? 'text-emerald-400' :
                        analysis.confidenceReport.overallScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                    }`}>{analysis.confidenceReport.overallScore}/100</div>
                    <HelpCircle size={10} className="text-textTertiary" />
                </button>
             )}
         </div>

         {/* Video Viewport */}
         <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#050505] group select-none">
             <div 
                className={`relative w-full h-full max-h-full ${toolMode === 'scan' ? 'cursor-crosshair' : toolMode === 'draw' ? 'cursor-cell' : isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
             >
                 <div className="w-full h-full transition-transform duration-100 ease-out origin-center"
                      style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}>
                     <video 
                        ref={videoRef} 
                        src={videoSources[activeSourceIdx]?.url} 
                        className="w-full h-full object-contain"
                        style={{ filter: `contrast(${contrast}%)` }}
                        onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                        crossOrigin="anonymous"
                     />
                     <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                 </div>
             </div>

             {/* Judge Mode Overlay */}
             {judgeMode && <div className="absolute top-4 right-4 px-3 py-1 bg-danger/10 border border-danger/40 text-danger text-[9px] font-bold tracking-widest uppercase animate-pulse backdrop-blur-md rounded">Adjudication Mode Active</div>}
             
             {/* Multi-Source Switcher Overlay */}
             {videoSources.length > 1 && (
                 <div className="absolute top-4 left-4 flex flex-col gap-2 z-50 animate-fade-in">
                      {videoSources.map((src, idx) => (
                          <button
                            key={src.id}
                            onClick={() => setActiveSourceIdx(idx)}
                            className={`
                                w-20 h-12 rounded border overflow-hidden relative transition-all shadow-lg group
                                ${activeSourceIdx === idx ? 'border-primary ring-2 ring-primary/50' : 'border-white/20 opacity-70 hover:opacity-100'}
                            `}
                          >
                              <video src={src.url} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <span className="text-[9px] font-bold text-white shadow-black drop-shadow-md tracking-wider">CAM {idx+1}</span>
                              </div>
                          </button>
                      ))}
                 </div>
             )}
             
             {/* Integrated HUD */}
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-surfaceHighlight/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl transition-all duration-300 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 z-40">
                 <button onClick={() => handleSeek(currentTime - 1)} className="p-2 rounded-full hover:bg-white/10 text-textSecondary"><ChevronLeft size={16}/></button>
                 <button onClick={togglePlay} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">{isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button>
                 <button onClick={() => handleSeek(currentTime + 1)} className="p-2 rounded-full hover:bg-white/10 text-textSecondary"><ChevronRight size={16}/></button>
                 <div className="w-px h-4 bg-white/10 mx-2"></div>
                 
                 <button onClick={() => setZoom(Math.max(1, zoom-0.5))} className="p-2 rounded-full hover:bg-white/10 text-textSecondary"><Minimize2 size={16}/></button>
                 <span className="text-[10px] font-mono font-bold text-primary w-6 text-center">{zoom}x</span>
                 <button onClick={() => setZoom(Math.min(5, zoom+0.5))} className="p-2 rounded-full hover:bg-white/10 text-textSecondary"><ZoomIn size={16}/></button>
                 <div className="w-px h-4 bg-white/10 mx-2"></div>
                 
                 {/* TOOL TOGGLES */}
                 <button 
                    onClick={() => setToolMode(toolMode === 'draw' ? 'view' : 'draw')} 
                    className={`p-2 rounded-full transition-all ${toolMode === 'draw' ? 'bg-primary text-white shadow-glow-primary' : 'hover:bg-white/10 text-textSecondary'}`}
                    title="Annotation Tool"
                 >
                    <PenTool size={16}/>
                 </button>

                 <button 
                    onClick={() => setToolMode(toolMode === 'scan' ? 'view' : 'scan')} 
                    className={`p-2 rounded-full transition-all ${toolMode === 'scan' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'hover:bg-white/10 text-textSecondary'}`}
                    title="Deep Scan (ROI)"
                 >
                    <Scan size={16}/>
                 </button>

                 {toolMode === 'draw' && (
                     <div className="flex gap-1 ml-1 animate-fade-in">
                        {['#ef4444', '#10b981', '#3b82f6'].map(c => (
                            <button key={c} onClick={() => setAnnotationColor(c)} className={`w-3 h-3 rounded-full border border-white/20`} style={{background: c, transform: annotationColor === c ? 'scale(1.2)' : 'scale(1)'}} />
                        ))}
                     </div>
                 )}
                 <button onClick={resetTools} className="p-2 rounded-full hover:text-danger text-textSecondary ml-2"><RotateCcw size={16}/></button>
             </div>
             
             {/* Scan Instruction Overlay */}
             {toolMode === 'scan' && (
                 <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-4 py-2 rounded-full border border-cyan-500/30 text-cyan-400 text-xs flex items-center gap-2 pointer-events-none animate-pulse">
                     <Crosshair size={14}/> Drag to select region for analysis
                 </div>
             )}
         </div>

         {/* Timeline */}
         <div className="shrink-0 bg-[#0a0a0f] z-10">
             <TimelineTrack 
                duration={videoDuration} 
                currentTime={currentTime} 
                onSeek={handleSeek} 
                events={analysis?.timeline || []} 
             />
         </div>
      </div>

      {/* --- RIGHT PANEL: INTELLIGENCE HUB --- */}
      <div className="w-full lg:w-[420px] bg-surface border-l border-white/5 flex flex-col relative z-20 shadow-panel">
          
          {/* Navigation Tabs */}
          <div className="px-2 pt-2 bg-[#0c0c10] border-b border-white/5">
              <div className="flex gap-0.5 overflow-x-auto custom-scrollbar pb-1">
                  {[
                      { id: 'log', label: 'Reasoning', icon: Terminal },
                      { id: 'authenticity', label: 'Verify', icon: FileCheck },
                      { id: 'narrative', label: 'Narrative', icon: BookOpen }, // NEW TAB
                      { id: 'scene', label: 'Scene', icon: Cloud },
                      { id: 'damage', label: 'Damage', icon: Hammer },
                      { id: 'hazards', label: 'Hazards', icon: AlertTriangle }, 
                      { id: 'signals', label: 'Signals', icon: Signal },
                      { id: 'entities', label: 'Entities', icon: Truck },
                      { id: 'vehicles', label: 'Vehicles', icon: Car }, 
                      { id: 'occupants', label: 'Occupants', icon: User },
                      { id: 'debris', label: 'Debris', icon: Share2 },
                      { id: 'physics', label: 'Physics', icon: Zap },
                      { id: 'audio', label: 'Audio', icon: Waves },
                      { id: 'shadows', label: 'Shadows', icon: Sun },
                      { id: 'reflections', label: 'Reflect', icon: Sparkles },
                      { id: 'synthesis', label: 'Synth', icon: Layers },
                      { id: 'sim', label: 'Sim', icon: GitPullRequest },
                      { id: 'liability', label: 'Liability', icon: Gavel },
                  ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[50px] flex flex-col items-center justify-center gap-1 py-3 px-1 text-[9px] font-bold uppercase tracking-wider transition-all border-t-2 ${activeTab === tab.id ? 'border-primary bg-surface text-white' : 'border-transparent text-textTertiary hover:text-textSecondary hover:bg-white/5'}`}
                      >
                          <tab.icon size={14} className={activeTab === tab.id ? 'text-primary' : 'opacity-50'} /> 
                          <span className="scale-90 whitespace-nowrap">{tab.label}</span>
                      </button>
                  ))}
              </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-[#0e0e12]">
              
              {/* REASONING STREAM TAB (FORMERLY LOG) */}
              {activeTab === 'log' && (
                  <div className="space-y-4" ref={logRef}>
                      {/* ... (Log content unchanged) ... */}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold text-textTertiary uppercase flex items-center gap-2">
                           <Activity size={12} className={!analysis ? "text-primary animate-pulse" : "text-emerald-500"}/> 
                           {analysis ? "Forensic Trace Complete" : "Live Reasoning Stream"}
                        </h4>
                        {!analysis && <span className="flex items-center gap-1 text-[9px] text-primary font-mono"><Loader2 size={10} className="animate-spin"/> PROCESSING</span>}
                      </div>

                      <div className="p-4 bg-[#0a0a0f] border border-white/5 rounded-lg shadow-inner min-h-[500px]">
                         <ReasoningLogRenderer text={contentToRender || "Initializing Neural Forensics Engine..."} onSeek={handleSeek} />
                      </div>
                  </div>
              )}

              {/* NARRATIVE TAB (NEW) */}
              {activeTab === 'narrative' && analysis && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="bg-surface border border-white/10 rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-5 text-primary"><BookOpen size={100}/></div>
                          
                          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                              <h4 className="text-[10px] font-bold text-textTertiary uppercase flex items-center gap-2">
                                  <Scale size={12} className="text-primary"/> Formal Chain of Events
                              </h4>
                              <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">LEGAL FORMAT</span>
                          </div>

                          <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed text-gray-300 font-serif">
                              {/* Using TextWithTimestamps to make times interactive within the narrative */}
                              <div className="whitespace-pre-line">
                                  <TextWithTimestamps text={analysis.chainOfEvents || "Narrative generation pending..."} onSeek={handleSeek} />
                              </div>
                          </div>

                          <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
                              <button 
                                onClick={() => handleExport('Legal Brief')}
                                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-colors"
                              >
                                  <FileText size={14}/> Export to PDF
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* AUTHENTICITY TAB (NEW) */}
              {activeTab === 'authenticity' && analysis?.authenticity && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Authenticity Score Card */}
                      <div className="bg-surface border border-white/10 rounded-xl p-5 relative overflow-hidden text-center">
                          <div className="absolute top-0 right-0 p-3 opacity-5 text-emerald-500"><Lock size={120}/></div>
                          <div className="relative z-10 flex flex-col items-center">
                              <div className="text-[10px] font-bold text-textTertiary uppercase mb-2 tracking-widest">Video Integrity Score</div>
                              <div className="text-5xl font-mono font-bold text-white mb-1 tracking-tight">
                                  {analysis.authenticity.integrityScore}
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  analysis.authenticity.overallAssessment === 'Verified Authentic' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  analysis.authenticity.overallAssessment === 'Suspect' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                  {analysis.authenticity.overallAssessment}
                              </div>
                          </div>
                      </div>

                      {/* Summary Analysis */}
                      <div className="p-4 bg-surfaceHighlight/20 rounded border border-white/5">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-2 flex items-center gap-2">
                              <FileCheck size={12}/> Chain of Custody Audit
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed italic border-l-2 border-primary/50 pl-3">
                              "{analysis.authenticity.summary}"
                          </p>
                      </div>

                      {/* Consistency Checks */}
                      <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase">Forensic Consistency Checks</h4>
                          {[
                              { label: 'Temporal Continuity', data: analysis.authenticity.temporalContinuity, icon: Clock },
                              { label: 'Technical Integrity', data: analysis.authenticity.technicalConsistency, icon: Activity },
                              { label: 'Physical Logic', data: analysis.authenticity.physicalConsistency, icon: Zap },
                              { label: 'Metadata Layer', data: analysis.authenticity.metadataAnalysis, icon: Database },
                          ].map((check, i) => (
                              <div key={i} className="bg-surfaceHighlight/20 border border-white/5 rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                      <div className="flex items-center gap-2">
                                          <check.icon size={14} className="text-textTertiary"/>
                                          <span className="text-xs font-bold text-white">{check.label}</span>
                                      </div>
                                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                          check.data.status === 'Pass' ? 'text-emerald-400 bg-emerald-400/10' :
                                          check.data.status === 'Fail' ? 'text-rose-400 bg-rose-400/10' :
                                          'text-gray-400 bg-gray-500/10'
                                      }`}>{check.data.status}</div>
                                  </div>
                                  <p className="text-[10px] text-gray-400 mb-2 pl-6">{check.data.observation}</p>
                                  {check.data.anomalies && check.data.anomalies.length > 0 && (
                                      <div className="pl-6 space-y-1">
                                          {check.data.anomalies.map((anomaly, k) => (
                                              <div key={k} className="flex items-center gap-1.5 text-[9px] text-rose-300">
                                                  <AlertTriangle size={10}/> {anomaly}
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* DAMAGE ANALYSIS TAB (NEW) */}
              {activeTab === 'damage' && analysis?.damageAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Validation Status */}
                      <div className={`p-4 rounded-xl border flex items-center justify-between ${
                          analysis.damageAnalysis.validationConclusion.isConsistent ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                      }`}>
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${analysis.damageAnalysis.validationConclusion.isConsistent ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                  {analysis.damageAnalysis.validationConclusion.isConsistent ? <CheckCircle2 size={20}/> : <ShieldAlert size={20}/>}
                              </div>
                              <div>
                                  <h4 className={`text-sm font-bold ${analysis.damageAnalysis.validationConclusion.isConsistent ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {analysis.damageAnalysis.validationConclusion.isConsistent ? 'Physics Model Validated' : 'Physics Model Discrepancy'}
                                  </h4>
                                  <p className="text-[10px] text-textSecondary">{analysis.damageAnalysis.validationConclusion.reasoning}</p>
                              </div>
                          </div>
                          <ConfidenceBadge level={analysis.damageAnalysis.validationConclusion.confidence} />
                      </div>

                      {/* Physics Core */}
                      <div className="bg-surface border border-white/10 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10 text-primary"><Zap size={100}/></div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-4 flex items-center gap-2">
                              <Activity size={12}/> Impact Energy Profile
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black/20 p-3 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Kinetic Energy</div>
                                  <div className="text-xl font-mono font-bold text-white">{(analysis.damageAnalysis.physics.kineticEnergyJoule / 1000).toFixed(1)} <span className="text-sm text-textTertiary">kJ</span></div>
                              </div>
                              <div className="bg-black/20 p-3 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Impact Vector</div>
                                  <div className="text-sm font-bold text-white">{analysis.damageAnalysis.physics.forceVector}</div>
                              </div>
                          </div>
                          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded text-[10px] text-primary/80">
                              <span className="font-bold uppercase text-primary mr-2">Predicted Deformation:</span>
                              {analysis.damageAnalysis.physics.predictedCrumpleDepth}
                          </div>
                      </div>

                      {/* Zone Comparison */}
                      <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase">Predicted vs. Observed Damage</h4>
                          {(analysis.damageAnalysis.zones || []).map((zone, i) => (
                              <div key={i} className="bg-surfaceHighlight/20 border border-white/5 rounded-lg p-3">
                                  <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                          <Car size={14} className="text-textTertiary"/>
                                          <span className="text-xs font-bold text-white">{zone.vehicleId} - {zone.zone}</span>
                                      </div>
                                      <div className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                          zone.matchStatus === 'Consistent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                      }`}>{zone.matchStatus}</div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-[10px] mb-2">
                                      <div>
                                          <div className="text-textTertiary uppercase text-[8px] mb-0.5">Physics Prediction</div>
                                          <div className="font-bold text-primary">{zone.predictedSeverity}</div>
                                      </div>
                                      <div>
                                          <div className="text-textTertiary uppercase text-[8px] mb-0.5">Visual Observation</div>
                                          <div className="font-bold text-white">{zone.observedSeverity}</div>
                                      </div>
                                  </div>
                                  <p className="text-[9px] text-gray-400 border-t border-white/5 pt-2 mt-1">{zone.notes}</p>
                              </div>
                          ))}
                      </div>

                      {/* Secondary Outcomes */}
                      <div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-3">Secondary Damage Indicators</h4>
                          <div className="grid grid-cols-1 gap-2">
                              <div className="flex justify-between items-center p-3 bg-surface border border-white/5 rounded">
                                  <span className="text-[10px] text-textSecondary">Airbag Deployment</span>
                                  <span className={`text-[10px] font-bold ${analysis.damageAnalysis.secondaryOutcomes.airbagDeployment === 'Predicted' ? 'text-danger' : 'text-gray-400'}`}>
                                      {analysis.damageAnalysis.secondaryOutcomes.airbagDeployment}
                                  </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-surface border border-white/5 rounded">
                                  <span className="text-[10px] text-textSecondary">Glass Integrity</span>
                                  <span className="text-[10px] font-bold text-white text-right w-1/2 truncate">
                                      {analysis.damageAnalysis.secondaryOutcomes.glassBreakage}
                                  </span>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* ... (Other tabs: scene, signals... unchanged) ... */}
              {activeTab === 'scene' && analysis?.environmental && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Weather Card */}
                      <div className="bg-surface border border-white/10 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10 text-cyan-500"><Cloud size={80}/></div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-4 flex items-center gap-2">
                              <Cloud size={12} className="text-cyan-500"/> Environmental Context
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Weather Condition</div>
                                  <div className="text-sm font-bold text-white">{analysis.environmental.weather.condition}</div>
                              </div>
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Visibility</div>
                                  <div className="text-sm font-bold text-white">{analysis.environmental.weather.visibility}</div>
                              </div>
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Road Surface</div>
                                  <div className="text-sm font-bold text-white flex items-center gap-2">
                                      {analysis.environmental.road.condition}
                                      {analysis.environmental.road.condition.toLowerCase().includes('wet') && <Sparkles size={10} className="text-cyan-400"/>}
                                  </div>
                              </div>
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Lighting</div>
                                  <div className="text-sm font-bold text-white">{analysis.environmental.lighting}</div>
                              </div>
                          </div>
                      </div>

                      {/* Traffic Control Inventory */}
                      <div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-3 flex items-center gap-2">
                              <Signpost size={12} /> Infrastructure Inventory
                          </h4>
                          <div className="space-y-3">
                              {(analysis.environmental.trafficControls || []).map((tc, i) => (
                                  <div key={i} className="flex gap-4 p-3 bg-surface border border-white/5 hover:border-primary/40 rounded-lg group transition-colors cursor-pointer" onClick={() => {
                                      const match = tc.detectedAt.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                                      if (match) {
                                          const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                                          handleSeek(sec);
                                      }
                                  }}>
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/5 ${
                                          tc.relevance === 'Critical' ? 'bg-danger/10 text-danger border-danger/20' : 'bg-surfaceHighlight text-gray-400'
                                      }`}>
                                          <Grip size={18} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex justify-between items-center mb-1">
                                              <span className="text-xs font-bold text-white">{tc.type}</span>
                                              <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 rounded">{tc.detectedAt}</span>
                                          </div>
                                          <div className="text-[10px] text-gray-300">
                                              <span className="text-gray-500">State:</span> <span className="font-bold">{tc.state}</span>
                                          </div>
                                          <div className="text-[9px] text-textTertiary mt-0.5">{tc.location}</div>
                                      </div>
                                  </div>
                              ))}
                              {(!analysis.environmental.trafficControls || analysis.environmental.trafficControls.length === 0) && (
                                  <div className="text-center py-6 text-xs text-gray-500 italic border border-dashed border-white/10 rounded-lg">
                                      No traffic control devices detected in this sequence.
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {/* HAZARDS TAB (NEW) */}
              {activeTab === 'hazards' && analysis?.environmental && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Summary Banner */}
                      <div className="p-4 bg-surfaceHighlight/20 border-l-2 border-danger rounded-r-lg">
                          <h4 className="text-[10px] font-bold text-danger uppercase mb-1">Safety Audit Conclusion</h4>
                          <p className="text-xs text-gray-300 leading-relaxed">
                              Identified {(analysis.environmental.hazards || []).length} contributing environmental factors that may mitigate driver liability.
                          </p>
                      </div>

                      {/* Hazard Grid */}
                      <div className="grid grid-cols-1 gap-4">
                          {(analysis.environmental.hazards || []).map((haz, i) => (
                              <div key={i} className="bg-surface border border-white/10 rounded-xl overflow-hidden shadow-lg group hover:border-danger/30 transition-all">
                                  <div className="flex">
                                      {/* Icon Column */}
                                      <div className={`w-16 flex flex-col items-center justify-center p-2 border-r border-white/5 ${
                                          haz.severity === 'Critical' ? 'bg-danger/10 text-danger' : 
                                          haz.severity === 'Moderate' ? 'bg-warning/10 text-warning' : 'bg-surfaceHighlight text-gray-400'
                                      }`}>
                                          {haz.category === 'Road Surface' ? <Droplets size={24} /> :
                                           haz.category === 'Visibility' ? <EyeOff size={24} /> :
                                           haz.category === 'Infrastructure' ? <Construction size={24} /> :
                                           haz.category === 'Obstruction' ? <TreeDeciduous size={24} /> :
                                           <AlertTriangle size={24} />}
                                          <div className="text-[8px] font-bold uppercase mt-2 tracking-wider text-center">{haz.severity}</div>
                                      </div>

                                      {/* Content */}
                                      <div className="flex-1 p-4">
                                          <div className="flex justify-between items-start mb-2">
                                              <span className="text-xs font-bold text-white uppercase tracking-wide">{haz.category}</span>
                                              <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                                  haz.contribution === 'Primary Cause' ? 'bg-danger text-white' :
                                                  haz.contribution === 'Contributing Factor' ? 'bg-warning/20 text-warning' :
                                                  'bg-white/5 text-gray-500'
                                              }`}>{haz.contribution}</span>
                                          </div>
                                          
                                          <p className="text-sm text-gray-200 font-medium mb-3 leading-snug">
                                              {haz.description}
                                          </p>

                                          <div className="flex justify-between items-end border-t border-white/5 pt-3 mt-2">
                                              <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                                  <Grip size={10}/> Location: {haz.location}
                                              </div>
                                              {haz.remediation && (
                                                  <div className="text-[9px] text-emerald-400/80 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                                                      Fix: {haz.remediation}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* ... (Rest of tabs unchanged: signals, entities, vehicles, occupants, debris, physics, etc.) ... */}
              {activeTab === 'signals' && analysis?.signalInference && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Holographic Signal Card */}
                      <div className="bg-surface border border-white/10 rounded-xl p-6 relative overflow-hidden flex flex-col items-center">
                          <div className="absolute top-0 right-0 p-3 opacity-10 text-primary"><Signal size={64}/></div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase tracking-widest mb-6 w-full text-left flex items-center gap-2">
                              <Eye size={12} className="text-primary"/> Signal State Inference
                          </h4>
                          
                          {/* Traffic Light Visualization */}
                          <div className="w-24 bg-[#0a0a0f] border-2 border-[#1f1f23] rounded-lg p-2 flex flex-col gap-2 shadow-2xl relative">
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#1f1f23] rounded-t"></div>
                              {/* Red Light */}
                              <div className={`w-16 h-16 rounded-full border-4 border-[#1f1f23] flex items-center justify-center relative overflow-hidden transition-all duration-500 ${analysis.signalInference.inferredState === 'Red' ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)]' : 'bg-red-900/20'}`}>
                                  {analysis.signalInference.inferredState === 'Red' && <div className="absolute inset-0 bg-white/20 blur-md"></div>}
                              </div>
                              {/* Yellow Light */}
                              <div className={`w-16 h-16 rounded-full border-4 border-[#1f1f23] flex items-center justify-center relative overflow-hidden transition-all duration-500 ${analysis.signalInference.inferredState === 'Yellow' ? 'bg-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.6)]' : 'bg-amber-900/20'}`}>
                                  {analysis.signalInference.inferredState === 'Yellow' && <div className="absolute inset-0 bg-white/20 blur-md"></div>}
                              </div>
                              {/* Green Light */}
                              <div className={`w-16 h-16 rounded-full border-4 border-[#1f1f23] flex items-center justify-center relative overflow-hidden transition-all duration-500 ${analysis.signalInference.inferredState === 'Green' ? 'bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.6)]' : 'bg-emerald-900/20'}`}>
                                  {analysis.signalInference.inferredState === 'Green' && <div className="absolute inset-0 bg-white/20 blur-md"></div>}
                              </div>
                          </div>

                          <div className="mt-6 flex flex-col items-center gap-2">
                              <div className="text-2xl font-bold text-white tracking-tight">
                                  {analysis.signalInference.inferredState}
                              </div>
                              <ConfidenceBadge level={analysis.signalInference.confidence} />
                          </div>
                      </div>

                      {/* Inference Logic */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase">Deduction Logic</h4>
                          <div className="p-4 bg-surfaceHighlight/10 border-l-2 border-primary rounded-r-lg">
                              <p className="text-xs text-gray-300 leading-relaxed">
                                  {analysis.signalInference.reasoning}
                              </p>
                          </div>
                      </div>

                      {/* Evidence List */}
                      <div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-3">Supporting Indirect Evidence</h4>
                          <div className="space-y-3">
                              {(analysis.signalInference.evidence || []).map((ev, i) => (
                                  <div key={i} className="bg-surfaceHighlight/20 border border-white/5 rounded-lg p-3 hover:bg-surfaceHighlight/40 transition-colors cursor-pointer" onClick={() => {
                                      const match = ev.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                                      if (match) {
                                          const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                                          handleSeek(sec);
                                      }
                                  }}>
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 rounded">{ev.timestamp}</span>
                                              <span className="text-xs font-bold text-white">{ev.type}</span>
                                          </div>
                                          <ConfidenceBadge level={ev.confidence} />
                                      </div>
                                      <div className="text-[10px] text-gray-400 mb-1.5">{ev.observation}</div>
                                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary bg-primary/5 p-1.5 rounded border border-primary/10">
                                          <ChevronRight size={10}/> Implication: {ev.implication}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* VEHICLE IDENTIFICATION TAB (NEW) */}
              {activeTab === 'vehicles' && analysis?.vehicleAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Summary */}
                      <div className="p-4 bg-surfaceHighlight/20 rounded border border-white/5">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-2">Fleet Identification Summary</h4>
                          <p className="text-xs text-gray-300 leading-relaxed italic border-l-2 border-primary/50 pl-3">
                              "{analysis.vehicleAnalysis.summary}"
                          </p>
                      </div>

                      {/* Vehicle Cards */}
                      <div className="space-y-6">
                          {(analysis.vehicleAnalysis.vehicles || []).map((veh, i) => (
                              <div key={i} className="bg-surface border border-white/10 rounded-xl overflow-hidden shadow-lg">
                                  {/* Header */}
                                  <div className="bg-[#121216] border-b border-white/5 p-4 flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                              <Car size={20} />
                                          </div>
                                          <div>
                                              <div className="text-sm font-bold text-white">{veh.make} {veh.model}</div>
                                              <div className="text-[10px] text-gray-500 uppercase tracking-wide">{veh.yearRange} {veh.trimLevel}</div>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-[9px] text-gray-500 uppercase mb-1">ID Confidence</div>
                                          <ConfidenceBadge level={veh.confidence} />
                                      </div>
                                  </div>

                                  {/* Blueprint Visualization */}
                                  <div className="p-6 relative bg-gradient-to-br from-[#0a0a0f] to-[#121216]">
                                      <div className="absolute inset-0 bg-grid-pattern bg-[length:20px_20px] opacity-10 pointer-events-none"></div>
                                      
                                      {/* Schematic Representation */}
                                      <div className="relative border border-primary/20 rounded-lg p-8 flex items-center justify-center min-h-[160px]">
                                          {/* Car Outline (Abstract) */}
                                          <div className="w-48 h-24 border-2 border-primary/40 rounded-lg relative flex items-center justify-center">
                                              <div className="text-[10px] font-mono text-primary/50 uppercase tracking-widest">Chassis: {veh.entityId}</div>
                                              
                                              {/* Dimension Lines */}
                                              {/* Length */}
                                              <div className="absolute -bottom-6 left-0 right-0 h-4 border-l border-r border-b border-white/20 flex items-center justify-center">
                                                  <span className="absolute top-full mt-1 text-[9px] font-mono text-white bg-[#0a0a0f] px-1">L: {veh.specs.length}</span>
                                              </div>
                                              
                                              {/* Wheelbase */}
                                              <div className="absolute bottom-2 left-8 right-8 h-2 border-b border-dashed border-primary/50 flex items-center justify-center">
                                                  <span className="absolute top-full mt-0.5 text-[8px] font-mono text-primary">WB: {veh.specs.wheelbase}</span>
                                              </div>

                                              {/* Height */}
                                              <div className="absolute -right-6 top-0 bottom-0 w-4 border-t border-b border-r border-white/20 flex items-center justify-center">
                                                  <span className="absolute left-full ml-1 text-[9px] font-mono text-white bg-[#0a0a0f] px-1 whitespace-nowrap" style={{writingMode: 'vertical-rl'}}>H: {veh.specs.height}</span>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Specs Grid */}
                                      <div className="grid grid-cols-2 gap-4 mt-6">
                                          <div className="bg-white/5 rounded p-3 border border-white/5">
                                              <div className="text-[9px] text-textTertiary uppercase mb-1">Curb Weight</div>
                                              <div className="text-sm font-bold text-white font-mono">{veh.specs.weight}</div>
                                          </div>
                                          <div className="bg-white/5 rounded p-3 border border-white/5">
                                              <div className="text-[9px] text-textTertiary uppercase mb-1">Color/Finish</div>
                                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                                  <div className="w-3 h-3 rounded-full border border-white/20" style={{background: veh.color === 'Red' ? '#ef4444' : veh.color.toLowerCase()}}></div>
                                                  {veh.color}
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Distinctive Features */}
                                  <div className="p-4 border-t border-white/5 bg-surfaceHighlight/5">
                                      <h5 className="text-[9px] font-bold text-textTertiary uppercase mb-2 flex items-center gap-1.5">
                                          <Search size={10} /> Identified Features
                                      </h5>
                                      <ul className="space-y-1">
                                          {veh.distinctiveFeatures.map((feat, k) => (
                                              <li key={k} className="text-[10px] text-gray-400 flex items-start gap-2">
                                                  <span className="text-primary mt-0.5">•</span> {feat}
                                              </li>
                                          ))}
                                          {veh.licensePlate && (
                                              <li className="text-[10px] text-emerald-400 flex items-start gap-2 font-mono font-bold mt-1">
                                                  <span className="text-emerald-500 mt-0.5">#</span> PLATE: {veh.licensePlate}
                                              </li>
                                          )}
                                      </ul>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'entities' && (
                  <div className="space-y-4">
                      {(analysis?.entities || []).map((ent, i) => (
                          <div key={i} className="bg-surface border border-white/5 rounded-lg p-4 flex gap-4 hover:border-white/10 transition-colors">
                              <div className="w-1.5 rounded-full bg-white/20 self-stretch" style={{background: ent.color}}></div>
                              <div>
                                  <h4 className="text-sm font-bold text-white flex items-center gap-2">{ent.id} <span className="text-[9px] text-textTertiary bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wide">{ent.type}</span></h4>
                                  <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                                      <TextWithTimestamps text={ent.description} onSeek={handleSeek} />
                                  </p>
                              </div>
                          </div>
                      ))}
                      {analysis?.fleetSafety && (
                          <div className="pt-6 border-t border-white/5">
                              <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-4 flex items-center gap-2"><Truck size={12}/> Fleet Telematics Profile</h4>
                              <div className="bg-surface border border-white/5 rounded-lg p-4">
                                  <div className="w-full h-48">
                                    <RiskRadarChart data={analysis.fleetSafety.riskVectors || []} />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-4">
                                 {(analysis.fleetSafety.driverPerformance || []).map((m,i) => (
                                     <div key={i} className="p-2 bg-white/5 rounded border border-white/5">
                                         <div className="text-[9px] text-textTertiary uppercase">{m.metric}</div>
                                         <div className={`text-xs font-bold ${m.status==='Excellent'?'text-success':'text-warning'}`}>{m.status}</div>
                                     </div>
                                 ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {/* ... (Rest of the tabs: occupants, debris, physics, etc. unchanged) ... */}
              {activeTab === 'occupants' && analysis?.occupantAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Driver Status Card */}
                      <div className="bg-surface border border-white/10 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-5 text-indigo-500"><User size={120}/></div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-4 flex items-center gap-2">
                              <Eye size={12} className="text-indigo-500"/> Driver Attention Monitor
                          </h4>
                          
                          <div className="space-y-6">
                              {(analysis.occupantAnalysis.occupants || []).map((occ, i) => (
                                  <div key={i} className="bg-black/20 rounded-lg p-4 border border-white/5">
                                      <div className="flex justify-between items-center mb-4">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                  <User size={20} />
                                              </div>
                                              <div>
                                                  <div className="text-sm font-bold text-white">{occ.id}</div>
                                                  <div className="text-[10px] text-gray-500 uppercase">{occ.role}</div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-[9px] text-gray-500 uppercase mb-1">Distraction Level</div>
                                              <div className="flex items-center gap-2 justify-end">
                                                  <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                                                      <div className={`h-full rounded-full ${occ.distractionScore > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: `${occ.distractionScore}%`}}></div>
                                                  </div>
                                                  <span className={`text-xs font-mono font-bold ${occ.distractionScore > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>{occ.distractionScore}%</span>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Behavior Timeline for this occupant */}
                                      <div className="space-y-2">
                                          <div className="text-[9px] font-bold text-textTertiary uppercase mb-2">Observed Behaviors</div>
                                          {(occ.states || []).map((state, k) => (
                                              <div key={k} className="relative pl-4 border-l border-white/10 pb-4 last:pb-0" onClick={() => {
                                                  const match = state.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                                                  if (match) {
                                                      const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                                                      handleSeek(sec);
                                                  }
                                              }}>
                                                  <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border ${state.attentionStatus === 'Distracted' ? 'bg-rose-500 border-rose-600' : 'bg-surface border-white/30'}`}></div>
                                                  
                                                  <div className="flex justify-between items-start cursor-pointer hover:bg-white/5 p-1 rounded transition-colors -mt-1">
                                                      <div>
                                                          <div className="flex items-center gap-2">
                                                              <span className="text-[10px] font-mono text-primary">{state.timestamp}</span>
                                                              <span className={`text-[10px] font-bold uppercase ${state.attentionStatus === 'Distracted' ? 'text-rose-400' : 'text-gray-300'}`}>{state.attentionStatus}</span>
                                                          </div>
                                                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[10px] text-gray-400">
                                                              <div className="flex items-center gap-1.5"><Eye size={10} className="text-textTertiary"/> {state.gazeVector}</div>
                                                              <div className="flex items-center gap-1.5"><Grip size={10} className="text-textTertiary"/> {state.handAction}</div>
                                                              <div className="flex items-center gap-1.5"><UserX size={10} className="text-textTertiary"/> {state.posture}</div>
                                                              {state.facialExpression && <div className="flex items-center gap-1.5"><Scan size={10} className="text-textTertiary"/> Exp: {state.facialExpression}</div>}
                                                          </div>
                                                      </div>
                                                      <ConfidenceBadge level={state.confidence} />
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      
                      {/* Summary Analysis */}
                      <div className="p-4 bg-surfaceHighlight/20 rounded border border-white/5">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-2">Behavioral Synthesis</h4>
                          <p className="text-xs text-gray-300 leading-relaxed italic border-l-2 border-indigo-500/50 pl-3">
                              "{analysis.occupantAnalysis.summary}"
                          </p>
                      </div>
                  </div>
              )}

              {/* DEBRIS TAB (NEW) */}
              {activeTab === 'debris' && analysis?.debrisAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Scatter Field Visualization */}
                      <div className="bg-surface border border-white/10 rounded-xl p-6 relative overflow-hidden flex flex-col items-center">
                          <div className="absolute top-0 right-0 p-3 opacity-10 text-primary"><Share2 size={64}/></div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase tracking-widest mb-6 w-full text-left flex items-center gap-2">
                              <Share2 size={12} className="text-primary"/> Scatter Field Map
                          </h4>
                          
                          {/* Radial Plot */}
                          <div className="relative w-64 h-64">
                              {/* Grid Circles */}
                              {[1, 2, 3].map(i => (
                                  <div key={i} className="absolute inset-0 m-auto rounded-full border border-white/5" style={{width: `${i*33}%`, height: `${i*33}%`}}></div>
                              ))}
                              {/* Axes */}
                              <div className="absolute inset-0 m-auto w-full h-px bg-white/5"></div>
                              <div className="absolute inset-0 m-auto h-full w-px bg-white/5"></div>
                              
                              {/* Impact Center */}
                              <div className="absolute inset-0 m-auto w-3 h-3 bg-danger rounded-full shadow-[0_0_15px_rgba(244,63,94,0.8)] z-10"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-6 text-[8px] font-bold text-danger uppercase tracking-wider">Impact Zero</div>

                              {/* Debris Points */}
                              {(analysis.debrisAnalysis.items || []).map((item, i) => {
                                  // Default logic if relativePosition is missing (fallback to random scatter for demo if needed, but schema requires it)
                                  const angle = (item.relativePosition?.angle || Math.random() * 360) - 90; // Adjust so 0 is up
                                  const dist = (item.relativePosition?.distance || 50) / 2; // Scale to radius (0-50%)
                                  
                                  return (
                                      <div 
                                        key={i} 
                                        className="absolute w-2 h-2 bg-primary rounded-full hover:scale-150 transition-transform cursor-pointer group z-20"
                                        style={{
                                            top: `50%`, 
                                            left: `50%`,
                                            transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${dist * 2.5}px) rotate(${-angle}deg)` // Simple radial positioning math
                                        }}
                                        title={item.id}
                                      >
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 px-2 py-1 rounded text-[8px] text-white pointer-events-none">
                                              {item.type}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                          
                          <div className="mt-6 w-full grid grid-cols-2 gap-4">
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5 text-center">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Pattern Shape</div>
                                  <div className="text-sm font-bold text-white">{analysis.debrisAnalysis.pattern.shape}</div>
                              </div>
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5 text-center">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Principal Axis</div>
                                  <div className="text-sm font-bold text-white">{analysis.debrisAnalysis.pattern.principalAxis}</div>
                              </div>
                          </div>
                      </div>

                      {/* Item Inventory */}
                      <div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-3">Debris Inventory</h4>
                          <div className="space-y-3">
                              {(analysis.debrisAnalysis.items || []).map((item, i) => (
                                  <div key={i} className="bg-surfaceHighlight/20 border border-white/5 rounded-lg p-3 hover:bg-surfaceHighlight/40 transition-colors">
                                      <div className="flex justify-between items-start mb-2">
                                          <div>
                                              <div className="text-xs font-bold text-white">{item.id}</div>
                                              <div className="text-[9px] text-primary uppercase">{item.type}</div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-[9px] font-mono text-gray-400">{item.velocityEstimate} Vel.</div>
                                          </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 mt-2 pt-2 border-t border-white/5">
                                          <div><span className="text-textTertiary">Origin:</span> {item.originPoint}</div>
                                          <div><span className="text-textTertiary">Landing:</span> {item.landingLocation}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      
                      {/* Conclusion */}
                      <div className="p-4 bg-surfaceHighlight/10 border-l-2 border-primary rounded-r-lg">
                          <h4 className="text-[9px] font-bold text-primary uppercase mb-1">Collision Geometry Conclusion</h4>
                          <p className="text-xs text-gray-300 leading-relaxed">
                              {analysis.debrisAnalysis.collisionGeometry}
                          </p>
                      </div>
                  </div>
              )}

              {/* PHYSICS TAB */}
              {activeTab === 'physics' && (
                  <div className="space-y-6">
                      {/* Control Deck */}
                      <div className="bg-surfaceHighlight/30 border border-white/10 rounded-xl p-5 relative overflow-hidden">
                          <h4 className="text-[10px] font-bold text-primary uppercase mb-5 flex items-center gap-2"><Zap size={12}/> Variable Sandbox</h4>
                          
                          <div className="space-y-5">
                              <div>
                                  <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-2"><span>VELOCITY DELTA</span><span className="text-white font-mono bg-white/10 px-1.5 rounded">{sandboxSpeed > 0 ? '+' : ''}{sandboxSpeed} mph</span></div>
                                  <input type="range" min="-20" max="20" step="5" value={sandboxSpeed} onChange={(e) => setSandboxSpeed(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer custom-range" />
                              </div>
                              <div>
                                  <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-2"><span>FRICTION COEFF (µ)</span><span className="text-white font-mono bg-white/10 px-1.5 rounded">{sandboxFriction}</span></div>
                                  <input type="range" min="0.1" max="1.0" step="0.1" value={sandboxFriction} onChange={(e) => setSandboxFriction(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer custom-range" />
                              </div>
                          </div>
                      </div>

                      {/* Results */}
                      {(analysis?.physics?.speedEstimates || []).map((est, i) => {
                          const simSpeed = ((est.maxSpeed + est.minSpeed)/2) + sandboxSpeed;
                          const stopDist = Math.pow(simSpeed * 0.447, 2) / (2 * sandboxFriction * 9.8) * 3.28;
                          const gForce = (Math.pow(simSpeed * 0.447, 2)) / (2 * 2 * 9.8);
                          
                          return (
                              <div key={i} className="bg-surface border border-white/5 rounded-xl p-4 space-y-4">
                                  {/* Header */}
                                  <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-white flex items-center gap-2"><Truck size={12}/> {est.entity}</span>
                                      <ConfidenceBadge level={est.confidence} />
                                  </div>
                                  
                                  {/* G-Force & Speed Visualization */}
                                  <div className="flex items-center gap-4">
                                       <div className="w-16 h-16 rounded-full border-4 border-surfaceHighlight relative flex items-center justify-center shrink-0">
                                           <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#444" strokeWidth="3" />
                                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={gForce > 5 ? '#ef4444' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${Math.min(100, gForce * 5)}, 100`} />
                                           </svg>
                                           <div className="text-center">
                                               <div className="text-[10px] font-bold text-white">{gForce.toFixed(1)}</div>
                                               <div className="text-[8px] text-gray-500">G</div>
                                           </div>
                                       </div>
                                       
                                       <div className="flex-1 min-w-0">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-[9px] text-textTertiary font-bold uppercase mb-0.5">Est Speed</div>
                                                    <div className="text-lg font-mono text-white tracking-tight">{simSpeed.toFixed(0)} <span className="text-[10px] text-textSecondary">mph</span></div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-emerald-500 font-bold uppercase mb-0.5">Sim Stop Dist</div>
                                                    <div className="text-lg font-mono text-emerald-400 tracking-tight">{stopDist.toFixed(1)} <span className="text-[10px] text-emerald-600">ft</span></div>
                                                </div>
                                            </div>
                                       </div>
                                  </div>

                                  {/* Calculation Methodology Card */}
                                  {est.calculation && (
                                    <div className="mt-3 p-3 bg-surfaceHighlight/50 border border-white/5 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calculator size={12} className="text-primary"/>
                                            <span className="text-[9px] font-bold text-textTertiary uppercase">Methodology</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <Ruler size={12} className="text-gray-500 mt-0.5 shrink-0"/>
                                                <div className="text-[10px] text-gray-400">
                                                    <span className="text-gray-500">Reference:</span> {est.calculation.referenceObject}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Activity size={12} className="text-gray-500 mt-0.5 shrink-0"/>
                                                <div className="text-[10px] text-gray-400 leading-relaxed">
                                                    <span className="text-gray-500">Logic:</span> {est.calculation.reasoning}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                  )}
                              </div>
                          );
                      })}

                      {/* Motion Blur Forensics (New Section) */}
                      {(analysis?.physics?.motionBlurMetrics || []).length > 0 && (
                          <div className="bg-surface border border-white/5 rounded-xl p-4 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-3 opacity-10 text-primary"><Wind size={64}/></div>
                              <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-4 flex items-center gap-2">
                                  <Wind size={12} className="text-primary"/> Motion Blur Velocity Extraction
                              </h4>
                              
                              <div className="space-y-3">
                                  {analysis?.physics?.motionBlurMetrics?.map((blur, i) => (
                                      <div key={i} className="p-3 bg-surfaceHighlight/20 rounded border border-white/5 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => {
                                          const match = blur.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                                          if (match) {
                                              const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                                              handleSeek(sec);
                                          }
                                      }}>
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="text-xs font-bold text-white flex items-center gap-2"><Camera size={12}/> {blur.entityId}</span>
                                              <ConfidenceBadge level={blur.confidence} />
                                          </div>
                                          
                                          <div className="grid grid-cols-3 gap-2 mb-2">
                                              <div className="bg-black/20 p-2 rounded">
                                                  <div className="text-[8px] text-gray-500 uppercase">Blur Length</div>
                                                  <div className="text-xs font-mono text-primary">{blur.blurLengthPixels}px</div>
                                              </div>
                                              <div className="bg-black/20 p-2 rounded">
                                                  <div className="text-[8px] text-gray-500 uppercase">Exposure</div>
                                                  <div className="text-xs font-mono text-white">{blur.estimatedExposure}</div>
                                              </div>
                                              <div className="bg-black/20 p-2 rounded border border-primary/20">
                                                  <div className="text-[8px] text-primary uppercase">Implied V</div>
                                                  <div className="text-xs font-mono font-bold text-white">{blur.calculatedSpeed}</div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2 text-[9px] text-gray-500">
                                              <Aperture size={10}/>
                                              <span>Direction: {blur.blurDirection}</span>
                                              <span className="bg-white/10 px-1 rounded text-white">{blur.timestamp}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}
              
              {/* ... (Rest of the tabs: audio, reflections, shadows, etc. unchanged) ... */}
              {activeTab === 'audio' && analysis?.audioAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Acoustic Signature Card */}
                      <div className="bg-surface border border-white/10 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10"><Waves size={64}/></div>
                          <h4 className="text-[10px] font-bold text-primary uppercase mb-4 flex items-center gap-2">
                              <Speaker size={12} /> Acoustic Signature Analysis
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Braking Intensity</div>
                                  <div className="text-sm font-bold text-white">{analysis.audioAnalysis.acoustics.brakingIntensity || "Not Detected"}</div>
                              </div>
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Impact Energy</div>
                                  <div className="text-sm font-bold text-white">{analysis.audioAnalysis.acoustics.impactForce || "Not Detected"}</div>
                              </div>
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Horn/Warning</div>
                                  <div className="text-sm font-bold text-white">{analysis.audioAnalysis.acoustics.hornUsage || "None"}</div>
                              </div>
                              <div className="p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                  <div className="text-[9px] text-textTertiary uppercase mb-1">Voice/Speech</div>
                                  <div className="text-sm font-bold text-white truncate">{analysis.audioAnalysis.acoustics.voiceAnalysis || "None"}</div>
                              </div>
                          </div>
                      </div>

                      {/* Audio Events Timeline */}
                      <div>
                           <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-3">Detected Audio Events</h4>
                           <div className="space-y-3">
                               {(analysis.audioAnalysis.events || []).map((evt, i) => (
                                   <div key={i} className="flex gap-4 p-3 bg-surface border border-white/5 hover:border-primary/40 rounded-lg group transition-colors cursor-pointer" onClick={() => {
                                       const match = evt.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                                       if (match) {
                                           const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                                           handleSeek(sec);
                                       }
                                   }}>
                                       <div className="w-12 h-12 rounded-full bg-surfaceHighlight flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary/50 group-hover:bg-primary/10 transition-colors">
                                           {evt.type === 'Tire Squeal' ? <Activity size={20} className="text-amber-400"/> : 
                                            evt.type === 'Impact' ? <Zap size={20} className="text-danger"/> :
                                            evt.type === 'Horn' ? <Speaker size={20} className="text-primary"/> :
                                            <Waves size={20} className="text-gray-400"/>}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                           <div className="flex justify-between items-center mb-1">
                                               <span className="text-xs font-bold text-white">{evt.type}</span>
                                               <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 rounded">{evt.timestamp}</span>
                                           </div>
                                           <p className="text-[10px] text-gray-400 leading-relaxed mb-1">{evt.description}</p>
                                           <div className="text-[9px] text-textTertiary italic">"{evt.significance}"</div>
                                       </div>
                                   </div>
                               ))}
                               {(!analysis.audioAnalysis.events || analysis.audioAnalysis.events.length === 0) && (
                                   <div className="text-center py-8 text-xs text-gray-500 italic border border-dashed border-white/10 rounded-lg">
                                       No significant acoustic events detected.
                                   </div>
                               )}
                           </div>
                      </div>
                  </div>
              )}

              {/* ... (Rest of the tabs: shadows, reflections, synthesis, sim, liability... unchanged) ... */}
              {activeTab === 'reflections' && analysis?.reflectionAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Summary Card */}
                      <div className="bg-surface border border-white/10 rounded-xl p-4 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 opacity-10 text-primary"><Sparkles size={64}/></div>
                         <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-2 flex items-center gap-2">
                            <Sparkles size={12} className="text-primary"/> Indirect Evidence Analysis
                         </h4>
                         <p className="text-xs text-gray-300 leading-relaxed italic border-l-2 border-primary/50 pl-3">
                             "{analysis.reflectionAnalysis.summary}"
                         </p>
                      </div>
                      
                      {/* Artifacts List */}
                      <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase">Detected Reflection Artifacts</h4>
                          {(analysis.reflectionAnalysis.artifacts || []).map((artifact, i) => (
                              <div key={i} className="bg-surfaceHighlight/20 border border-white/5 rounded-lg p-3 hover:bg-surfaceHighlight/40 transition-colors cursor-pointer group" onClick={() => {
                                  const match = artifact.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                                  if (match) {
                                      const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                                      handleSeek(sec);
                                  }
                              }}>
                                  <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary group-hover:shadow-[0_0_8px_rgba(99,102,241,0.8)] transition-all"></div>
                                          <span className="text-xs font-bold text-white">{artifact.surface}</span>
                                      </div>
                                      <div className="flex gap-2 items-center">
                                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 rounded">{artifact.timestamp}</span>
                                          <ConfidenceBadge level={artifact.significance === 'Critical' ? 'High' : artifact.significance === 'High' ? 'High' : 'Moderate'} />
                                      </div>
                                  </div>
                                  
                                  <p className="text-[10px] text-gray-400 mb-2 pl-3.5">{artifact.description}</p>
                                  
                                  <div className="ml-3.5 bg-primary/5 border border-primary/20 rounded p-2">
                                      <div className="text-[9px] font-bold text-primary uppercase mb-0.5">Revealed Fact</div>
                                      <div className="text-[10px] text-gray-300 font-medium">{artifact.revealedInformation}</div>
                                  </div>
                              </div>
                          ))}
                          
                          {(!analysis.reflectionAnalysis.artifacts || analysis.reflectionAnalysis.artifacts.length === 0) && (
                               <div className="text-center py-8 text-xs text-gray-500 italic border border-dashed border-white/10 rounded-lg">
                                   No reflective surface artifacts detected in this footage.
                               </div>
                          )}
                      </div>
                  </div>
              )}

              {/* SHADOW GEOMETRY TAB */}
              {activeTab === 'shadows' && analysis?.shadowAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Solar Position Card */}
                      <div className="bg-surface border border-white/10 rounded-xl p-5 relative overflow-hidden flex flex-col md:flex-row gap-6 items-center">
                          <div className="absolute top-0 right-0 p-3 opacity-5 text-amber-500"><Sun size={120}/></div>
                          
                          {/* Solar Compass Graphic */}
                          <div className="w-32 h-32 relative shrink-0">
                              <svg viewBox="0 0 100 100" className="w-full h-full">
                                  <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="2" />
                                  <line x1="50" y1="5" x2="50" y2="95" stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                                  <line x1="5" y1="50" x2="95" y2="50" stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                                  <text x="50" y="15" textAnchor="middle" fill="#666" fontSize="10" fontWeight="bold">N</text>
                                  {/* Sun Indicator - position would be dynamic in real implementation */}
                                  <line x1="50" y1="50" x2="80" y2="80" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                                  <circle cx="80" cy="80" r="5" fill="#f59e0b" className="animate-pulse" />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="text-[10px] font-mono text-amber-500 bg-surface/80 px-1 rounded">Sun</div>
                              </div>
                          </div>

                          <div className="flex-1 space-y-4 w-full">
                              <div>
                                  <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-2 flex items-center gap-2">
                                      <Sun size={12} className="text-amber-500"/> Solar Geometry
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div className="bg-white/5 rounded p-2 border border-white/5">
                                          <div className="text-[9px] text-gray-500 uppercase">Azimuth</div>
                                          <div className="text-xs font-bold text-white">{analysis.shadowAnalysis.lightSource.azimuth}</div>
                                      </div>
                                      <div className="bg-white/5 rounded p-2 border border-white/5">
                                          <div className="text-[9px] text-gray-500 uppercase">Elevation</div>
                                          <div className="text-xs font-bold text-white">{analysis.shadowAnalysis.lightSource.elevation}</div>
                                      </div>
                                  </div>
                              </div>

                              <div className={`p-3 rounded border ${analysis.shadowAnalysis.timeVerification.discrepancy === 'None' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                                  <div className="flex justify-between items-center mb-1">
                                      <span className={`text-[9px] font-bold uppercase ${analysis.shadowAnalysis.timeVerification.discrepancy === 'None' ? 'text-emerald-400' : 'text-rose-400'}`}>Timestamp Verification</span>
                                      <ConfidenceBadge level={analysis.shadowAnalysis.timeVerification.confidence} />
                                  </div>
                                  <div className="flex justify-between text-xs text-white">
                                      <span>Video: <span className="font-mono">{analysis.shadowAnalysis.timeVerification.claimedTime}</span></span>
                                      <span>Solar: <span className="font-mono">{analysis.shadowAnalysis.timeVerification.calculatedTime}</span></span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Shadow Consistency */}
                      <div>
                          <div className="flex justify-between items-center mb-3">
                              <h4 className="text-[10px] font-bold text-textTertiary uppercase">Shadow Consistency Audit</h4>
                              <span className="text-[9px] font-mono text-primary">{analysis.shadowAnalysis.consistencyScore}/100 Score</span>
                          </div>
                          
                          <div className="space-y-3">
                              {(analysis.shadowAnalysis.artifacts || []).map((art, i) => (
                                  <div key={i} className="flex gap-3 items-start p-3 bg-surfaceHighlight/20 rounded border border-white/5">
                                      <div className={`mt-0.5 w-2 h-2 rounded-full ${art.consistency === 'Consistent' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                      <div>
                                          <div className="text-xs font-bold text-white mb-0.5">{art.object}</div>
                                          <div className="text-[10px] text-gray-400 mb-1">Length: {art.shadowLength}</div>
                                          <div className="text-[10px] text-gray-500 italic">"{art.implication}"</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          <p className="mt-4 text-[10px] text-gray-500 border-t border-white/5 pt-2">
                              Note: {analysis.shadowAnalysis.notes}
                          </p>
                      </div>
                  </div>
              )}
              
              {/* SYNTHESIS TAB */}
              {activeTab === 'synthesis' && analysis?.multiView && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Sync Status Card */}
                      <div className="bg-surface border border-white/10 rounded-xl p-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-10"><Layers size={48}/></div>
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-2 flex items-center gap-2">
                              <CheckCircle2 size={12} className="text-emerald-400"/> Temporal Synchronization
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed italic border-l-2 border-primary/50 pl-3">
                              "{analysis.multiView.synchronizationNotes}"
                          </p>
                      </div>

                      {/* Source Reliability */}
                      <div className="space-y-3">
                           <h4 className="text-[10px] font-bold text-textTertiary uppercase">Source Integrity Analysis</h4>
                           {(analysis.multiView.sourceAnalysis || []).map((src, i) => (
                               <div key={i} className="bg-surfaceHighlight/20 border border-white/5 rounded-lg p-3 hover:bg-surfaceHighlight/40 transition-colors">
                                   <div className="flex justify-between items-start mb-2">
                                       <span className="text-xs font-bold text-white">{src.sourceLabel}</span>
                                       <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${src.reliabilityScore === 'High' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>{src.reliabilityScore} Rel.</span>
                                   </div>
                                   <div className="grid grid-cols-2 gap-2 text-[10px] text-textSecondary mb-2">
                                       <div><span className="text-textTertiary">Coverage:</span> {src.coverageArea}</div>
                                   </div>
                                   <p className="text-[10px] text-gray-400 border-t border-white/5 pt-2 mt-1">{src.notes}</p>
                               </div>
                           ))}
                      </div>

                      {/* Unified Timeline */}
                      <div>
                           <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-3">Unified Cross-Source Timeline</h4>
                           <div className="space-y-4 pl-2 border-l border-white/10">
                               {(analysis.multiView.unifiedTimeline || []).map((evt, i) => (
                                   <div key={i} className="relative pl-4">
                                       <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-surface border border-primary/50"></div>
                                       <div className="text-xs font-bold text-primary mb-0.5">{evt.timestamp}</div>
                                       <div className="text-xs text-white mb-2">{evt.description}</div>
                                       
                                       <div className="flex gap-2">
                                          <div className="px-2 py-1 bg-white/5 rounded border border-white/5 text-[9px] text-gray-400 flex items-center gap-1.5">
                                              <MonitorPlay size={10} className="text-primary"/> 
                                              <span className="text-textTertiary uppercase">Best View:</span> {evt.bestViewSource}
                                          </div>
                                       </div>
                                   </div>
                               ))}
                           </div>
                      </div>
                  </div>
              )}

              {/* SIM & LIABILITY TABS */}
              {activeTab === 'sim' && (
                  <div className="flex flex-col h-full">
                      {/* ... (Existing Sim Content) ... */}
                      <div className="bg-surface border border-white/10 rounded-lg p-1 flex gap-2 mb-6">
                          <input 
                            value={customQuery} onChange={(e) => setCustomQuery(e.target.value)} 
                            placeholder="Type a 'What If' scenario..." 
                            className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none placeholder-textTertiary" 
                          />
                          <button 
                            onClick={() => {setIsSimulating(true); evaluateCounterfactual(analysis?.rawAnalysis||"", customQuery).then(r => {setSimResult(r); setIsSimulating(false)})}} 
                            disabled={isSimulating}
                            className="px-3 bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-50"
                          >
                             {isSimulating ? <Loader2 size={14} className="animate-spin"/> : <GitPullRequest size={14}/>}
                          </button>
                      </div>
                      
                      {simResult && <div className="p-4 bg-primary/5 border-l-2 border-primary text-xs text-textSecondary leading-relaxed mb-6 animate-fade-in"><TextWithTimestamps text={simResult} onSeek={handleSeek} /></div>}
                      
                      <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-1">Generated Counterfactuals</h4>
                          {(analysis?.counterfactuals || []).map((cf, i) => (
                              <div key={i} onClick={() => setCustomQuery(cf.question)} className="p-4 border border-white/5 hover:border-primary/30 rounded-lg bg-surface cursor-pointer transition-all group">
                                  <div className="text-xs font-bold text-white mb-1.5 group-hover:text-primary transition-colors">{cf.question}</div>
                                  <div className="text-[10px] text-textSecondary flex justify-between">
                                      <span>Outcome: {cf.outcome}</span>
                                      <span className="text-textTertiary">High Prob.</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'liability' && (
                  <div className="flex flex-col h-full space-y-8">
                      {/* Section 1: Fault Breakdown */}
                      <div className="space-y-6">
                           <div className="bg-surface border border-white/5 rounded-xl p-6 flex flex-col items-center shadow-panel relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-50"></div>
                                <h4 className="text-[10px] font-bold text-textTertiary uppercase tracking-widest mb-4">Liability Allocation Model</h4>
                                <div className="h-48 w-full">
                                    <FaultChart allocations={analysis?.fault.allocations || []} />
                                </div>
                                <p className="text-xs text-center text-gray-400 mt-4 italic max-w-sm">
                                    {analysis?.fault.summary}
                                </p>
                           </div>

                           {/* Detailed Allocations */}
                           {(analysis?.fault.allocations || []).map((alloc, i) => (
                                <div key={i} className="bg-surface border border-white/5 rounded-xl overflow-hidden animate-fade-in" style={{animationDelay: `${i*100}ms`}}>
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#121216]">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl font-mono font-bold text-white tracking-tighter">{alloc.percentage}%</div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{alloc.party}</div>
                                                <ConfidenceBadge level={alloc.confidence} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 space-y-5">
                                        {/* Violations */}
                                        {(alloc.violations || []).length > 0 && (
                                            <div className="space-y-2">
                                                <h5 className="text-[9px] font-bold text-textTertiary uppercase flex items-center gap-1.5 tracking-wider">
                                                    <AlertOctagon size={10} className="text-rose-500" /> Detected Violations
                                                </h5>
                                                {(alloc.violations || []).map((v, k) => (
                                                    <div key={k} className="bg-rose-500/5 border border-rose-500/20 rounded-md p-2.5 transition-all hover:bg-rose-500/10">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="text-xs font-bold text-rose-300">{v.rule}</span>
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${v.severity === 'Critical' ? 'bg-rose-500 text-white' : 'bg-rose-500/20 text-rose-400'}`}>{v.severity}</span>
                                                        </div>
                                                        <div className="text-[10px] text-rose-200/70 leading-relaxed">
                                                            <TextWithTimestamps text={v.description + " " + v.timestamp} onSeek={handleSeek} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Reasoning */}
                                        <div>
                                            <h5 className="text-[9px] font-bold text-textTertiary uppercase mb-1.5 tracking-wider flex items-center gap-1.5">
                                                <Layers size={10} className="text-primary"/> Forensic Logic
                                            </h5>
                                            <div className="p-3 bg-surfaceHighlight/30 rounded-lg border border-white/5">
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    <TextWithTimestamps text={alloc.reasoning} onSeek={handleSeek} />
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                           ))}
                      </div>

                      {/* Section 2: Legal Research (Existing) */}
                      <div className="pt-8 border-t border-white/5">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase mb-4 flex items-center gap-2">
                              <Search size={12}/> Legal Reference Search
                          </h4>
                          <div className="bg-surface border border-white/10 rounded-lg p-1 flex gap-2 mb-4">
                              <input 
                                value={legalQuery} onChange={(e) => setLegalQuery(e.target.value)} 
                                placeholder="Search case law & statutes..." 
                                className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none placeholder-textTertiary" 
                              />
                              <button 
                                onClick={() => {setIsSearching(true); searchSimilarCases(legalQuery).then(r => {setLegalResult(r); setIsSearching(false)})}} 
                                disabled={isSearching}
                                className="px-3 bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-50"
                              >
                                 {isSearching ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
                              </button>
                          </div>
                          {legalResult && (
                              <div className="space-y-4 animate-fade-in">
                                  <div className="text-xs text-textSecondary leading-relaxed bg-surface p-4 rounded-lg border border-white/5"><TextWithTimestamps text={legalResult.text} onSeek={handleSeek} /></div>
                                  <div className="space-y-2">
                                      <h4 className="text-[9px] font-bold text-textTertiary uppercase mb-1">Citations & Precedents</h4>
                                      {(legalResult.chunks || []).map((c, i) => c.web?.uri && (
                                          <a key={i} href={c.web.uri} target="_blank" className="block p-3 bg-surface border border-white/5 hover:border-primary/40 rounded-lg transition-colors group">
                                              <div className="text-[10px] font-bold text-primary mb-0.5 truncate group-hover:underline">{c.web.title}</div>
                                              <div className="text-[9px] text-textTertiary truncate font-mono">{c.web.uri}</div>
                                          </a>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/5 bg-[#0c0c10]">
              <div className="grid grid-cols-2 gap-2 mb-2">
                  <button 
                    onClick={() => handleExport('Executive Summary')}
                    disabled={!analysis || generatingReport === 'Executive Summary'}
                    className="flex items-center justify-center py-2 bg-surface hover:bg-surfaceHighlight border border-white/10 hover:border-white/20 rounded text-[9px] font-bold text-textSecondary hover:text-white transition-all shadow-sm disabled:opacity-50"
                  >
                      {generatingReport === 'Executive Summary' ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <FileText size={12} className="mr-1.5" />} Executive
                  </button>
                  <button 
                    onClick={() => handleExport('Technical Report')}
                    disabled={!analysis || generatingReport === 'Technical Report'}
                    className="flex items-center justify-center py-2 bg-surface hover:bg-surfaceHighlight border border-white/10 hover:border-white/20 rounded text-[9px] font-bold text-textSecondary hover:text-white transition-all shadow-sm disabled:opacity-50"
                  >
                      {generatingReport === 'Technical Report' ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <Activity size={12} className="mr-1.5" />} Technical
                  </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleExport('Insurance Claim')}
                    disabled={!analysis || generatingReport === 'Insurance Claim'}
                    className="flex items-center justify-center py-2 bg-surface hover:bg-surfaceHighlight border border-white/10 hover:border-white/20 rounded text-[9px] font-bold text-textSecondary hover:text-white transition-all shadow-sm disabled:opacity-50"
                  >
                      {generatingReport === 'Insurance Claim' ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <ShieldCheck size={12} className="mr-1.5" />} Insurance
                  </button>
                  <button 
                    onClick={() => handleExport('Legal Brief')}
                    disabled={!analysis || generatingReport === 'Legal Brief'}
                    className="flex items-center justify-center py-2 bg-surface hover:bg-surfaceHighlight border border-white/10 hover:border-white/20 rounded text-[9px] font-bold text-textSecondary hover:text-white transition-all shadow-sm disabled:opacity-50"
                  >
                      {generatingReport === 'Legal Brief' ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <Scale size={12} className="mr-1.5" />} Legal Brief
                  </button>
              </div>
          </div>
      </div>

    </div>
  );
};
