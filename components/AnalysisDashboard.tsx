
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from "jspdf";
import { IncidentAnalysis, ConfidenceLevel, Entity, RoiAnalysis, VideoSource } from '../types';
import { RiskRadarChart, FaultChart } from './AnalysisCharts';
import { evaluateCounterfactual, searchSimilarCases, analyzeRegionOfInterest, generateReport } from '../services/geminiService';
import { FileText, Activity, Scale, Truck, Clock, Video, Zap, PlayCircle, Layers, GitPullRequest, Loader2, Minimize2, ZoomIn, RotateCcw, PenTool, MousePointer2, Settings, AlertTriangle, List, Search, ChevronRight, ChevronLeft, Pause, Play, Scan, Crosshair, X, Terminal, ShieldCheck, CheckCircle2, HelpCircle, AlertOctagon, Ruler, Calculator, Gavel, MonitorPlay, Speaker, Waves, Sparkles, Sun, Cloud, Thermometer, Signpost, Grip, Wind, Camera, Aperture, User, Eye, Smartphone, UserX, Share2, Circle, Signal, Car, Droplets, Construction, EyeOff, TreeDeciduous, Lock, FileCheck, Database, Hammer, ShieldAlert, BookOpen, PanelRightClose, PanelRightOpen, GripVertical, Rewind, FastForward, Globe, Library, FileDown, MoreHorizontal, Download, Printer, FileType, FileWarning, MapPin, Scale as ScaleIcon, LucideIcon, MessageSquare } from 'lucide-react';

interface AnalysisDashboardProps {
  analysis: IncidentAnalysis | null;
  streamingLog?: string;
  judgeMode: boolean;
  videoSources: VideoSource[];
}

// --- SHARED UI PRIMITIVES ---

const ensureArray = (data: any): any[] => {
    return Array.isArray(data) ? data : [];
};

const EmptyAnalysisState: React.FC<{ title: string; icon: any; message?: string }> = ({ title, icon: Icon, message }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 animate-fade-in border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
            <Icon size={24} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wide mb-2 font-mono">{title} UNAVAILABLE</h3>
        <p className="text-xs text-textSecondary max-w-xs leading-relaxed">
            {message || "The AI analysis did not generate specific data for this category based on the provided footage."}
        </p>
    </div>
);

const ConfidenceBadge: React.FC<{ level?: ConfidenceLevel }> = ({ level = 'Insufficient' }) => {
  const styles = {
    'High': 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100',
    'Moderate': 'text-amber-700 bg-amber-50 border-amber-200 ring-1 ring-amber-100',
    'Low': 'text-rose-700 bg-rose-50 border-rose-200 ring-1 ring-rose-100',
    'Insufficient': 'text-slate-500 bg-slate-50 border-slate-200'
  }[level];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles} shadow-sm`}>
      {level === 'High' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {level === 'Moderate' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      {level === 'Low' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
      {level === 'Insufficient' && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
      {level} Conf.
    </span>
  );
};

// --- ADVANCED TEXT RENDERERS ---

const InlineText: React.FC<{ text: string; onSeek?: (t: number) => void }> = ({ text, onSeek }) => {
  if (!text) return null;
  // Regex for **bold**, `code`, and [timestamp]
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[\d{1,2}:\d{2}(?:\.\d+)?\])/g);
  
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} className="font-bold text-textPrimary">{part.slice(2, -2)}</span>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-slate-100 border border-slate-200 rounded px-1 text-[0.9em] font-mono text-rose-600">{part.slice(1, -1)}</code>;
        }
        const tsMatch = part.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d+))?\]$/);
        if (tsMatch) {
           const seconds = parseInt(tsMatch[1]) * 60 + parseInt(tsMatch[2]) + (tsMatch[3] ? parseFloat(`0.${tsMatch[3]}`) : 0);
           return (
            <button key={i} onClick={(e) => { e.stopPropagation(); onSeek?.(seconds); }}
              className="inline-flex items-center gap-1 text-primary hover:text-white hover:bg-primary cursor-pointer font-mono font-bold mx-0.5 px-1.5 py-0 rounded transition-colors text-[0.85em] bg-primaryLight/40 border border-primary/10 align-baseline select-none"
              title={`Jump to ${part}`}
            >
              <Clock size={10} className="inline opacity-70"/> {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const FormattedMarkdown: React.FC<{ text: string; onSeek?: (t: number) => void; className?: string }> = ({ text, onSeek, className = "" }) => {
  if (!text) return null;
  const lines = text.split('\n');
  
  return (
    <div className={`space-y-3 font-sans text-xs ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />; 
        
        // Headers (### or ##)
        if (trimmed.startsWith('#')) {
            const level = trimmed.match(/^#+/)?.[0].length || 0;
            const content = trimmed.replace(/^#+\s*/, '');
            const style = level === 1 
                ? 'text-sm font-bold text-textPrimary uppercase tracking-widest border-b border-border pb-2 mt-6 mb-3' 
                : 'text-xs font-bold text-primary uppercase tracking-wider mt-4 mb-2 flex items-center gap-2';
            
            return (
                <div key={i} className={style}>
                    {level > 1 && <div className="w-1 h-3 bg-primary rounded-full shrink-0"></div>}
                    {content}
                </div>
            );
        }
        
        // List items
        if (trimmed.match(/^[-*]\s/)) {
            const content = trimmed.replace(/^[-*]\s+/, '');
            return (
                <div key={i} className="flex items-start gap-3 pl-2 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0 group-hover:bg-primary transition-colors" />
                    <p className="text-textSecondary leading-relaxed">
                        <InlineText text={content} onSeek={onSeek} />
                    </p>
                </div>
            );
        }

        // Numbered lists
        if (trimmed.match(/^\d+\.\s/)) {
             const [num, ...rest] = trimmed.split('.');
             const content = rest.join('.').trim();
             return (
                <div key={i} className="flex items-start gap-3 pl-2 group">
                    <span className="font-mono font-bold text-primary/70 mt-0.5 shrink-0">{num}.</span>
                    <p className="text-textSecondary leading-relaxed">
                        <InlineText text={content} onSeek={onSeek} />
                    </p>
                </div>
             );
        }
        
        // Standard Paragraph
        return (
            <p key={i} className="text-textSecondary leading-relaxed">
                <InlineText text={trimmed} onSeek={onSeek} />
            </p>
        );
      })}
    </div>
  );
};

const ReasoningLogRenderer: React.FC<{ text: string; onSeek: (t: number) => void }> = ({ text, onSeek }) => {
  const displayText = text.replace(/```json[\s\S]*$/, '').replace(/```json[\s\S]*```/, '').replace(/<<<JSON_START>>>[\s\S]*?<<<JSON_END>>>/, '').trim();
  const lines = displayText.split('\n');

  return (
    <div className="font-mono text-xs leading-relaxed space-y-2 text-textSecondary">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('###')) {
           return (
             <div key={i} className="mt-6 mb-3 flex items-center gap-3 text-primary border-b border-border pb-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"/>
                <span className="font-bold tracking-wider uppercase text-textPrimary">{trimmed.replace(/#/g, '').trim()}</span>
             </div>
           );
        }
        if (trimmed.startsWith('-')) {
            return (
                <div key={i} className="pl-4 flex gap-2 border-l-2 border-border ml-1 hover:border-primary/30 transition-colors group">
                    <div className="text-textSecondary group-hover:text-textPrimary transition-colors">
                        <InlineText text={trimmed.substring(1).trim()} onSeek={onSeek} />
                    </div>
                </div>
            )
        }
        if (trimmed === '') return <div key={i} className="h-2"></div>;
        
        return (
            <div key={i} className="text-textSecondary pl-0">
                <InlineText text={line} onSeek={onSeek} />
            </div>
        );
      })}
      <div className="h-4 w-2 bg-primary animate-pulse inline-block mt-2"/>
    </div>
  );
};

// --- TIMELINE COMPONENT ---

const TimelineTrack: React.FC<{ duration: number; currentTime: number; onSeek: (t: number) => void; events: any[] }> = ({ duration, currentTime, onSeek, events }) => {
    return (
        <div className="relative h-16 w-full bg-background border-t border-border flex items-center px-4 select-none">
            {/* Ticks */}
            <div className="absolute inset-0 pointer-events-none flex justify-between px-4 opacity-40">
                {Array.from({ length: 21 }).map((_, i) => (
                    <div key={i} className={`h-full w-px relative ${i % 2 === 0 ? 'bg-borderStrong h-3/4 mt-2' : 'bg-border h-1/2 mt-4'}`}>
                        {i % 2 === 0 && <span className="absolute bottom-1 left-1 text-[9px] font-mono text-textTertiary font-bold">{Math.round((duration/20)*i)}s</span>}
                    </div>
                ))}
            </div>

            {/* Scrubber Area */}
            <div 
                className="relative w-full h-8 cursor-pointer group z-10"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onSeek(((e.clientX - rect.left) / rect.width) * duration);
                }}
            >
                {/* Track Line */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-border rounded-full group-hover:bg-borderStrong transition-colors overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 bg-primary" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                </div>
                
                {/* Event Markers */}
                {ensureArray(events).map((evt, i) => {
                     const match = evt.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                     if (!match) return null;
                     const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                     const pct = (sec / duration) * 100;
                     return (
                         <div key={i} 
                            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-2 border-white shadow-sm ${evt.type === 'impact' ? 'bg-danger z-20 scale-125' : 'bg-primary z-10 hover:bg-primaryHover'} transition-all cursor-help`} 
                            style={{ left: `${pct}%`, marginTop: '-3px' }}
                            title={evt.description}
                         />
                     );
                })}

                {/* Playhead */}
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-12 bg-danger z-30 pointer-events-none transition-transform duration-75 shadow-sm" 
                    style={{ left: `${(currentTime/duration)*100}%` }}
                >
                    <div className="absolute -top-1.5 -left-2 w-4 h-4 bg-danger rounded-full border-2 border-white shadow-md"></div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD ---

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ analysis, streamingLog = "", judgeMode, videoSources }) => {
  const [activeTab, setActiveTab] = useState<'log' | 'reports' | 'chat' | 'authenticity' | 'narrative' | 'scene' | 'damage' | 'hazards' | 'signals' | 'entities' | 'vehicles' | 'occupants' | 'debris' | 'physics' | 'sim' | 'liability' | 'synthesis' | 'audio' | 'reflections' | 'shadows' | 'fleet'>('log');
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [videoDuration, setVideoDuration] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Resizing State
  const [rightPanelWidth, setRightPanelWidth] = useState(550);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Tools
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [contrast, setContrast] = useState(100);
  const [toolMode, setToolMode] = useState<'view' | 'draw' | 'scan' | 'measure' | 'calibrate'>('view');
  
  // Drawing & Annotation
  const [isPanning, setIsPanning] = useState(false);
  const [annotations, setAnnotations] = useState<{points: {x:number, y:number}[], color: string}[]>([]);
  const [currentPath, setCurrentPath] = useState<{x:number, y:number}[]>([]);
  const [annotationColor, setAnnotationColor] = useState('#ef4444');
  
  // Photogrammetry / Measurement State
  const [calibrationLine, setCalibrationLine] = useState<{start: {x:number, y:number}, end: {x:number, y:number}, distance: number} | null>(null);
  const [measurements, setMeasurements] = useState<{start: {x:number, y:number}, end: {x:number, y:number}, pxLen: number, realLen: number}[]>([]);
  const [tempMeasureStart, setTempMeasureStart] = useState<{x:number, y:number} | null>(null);
  const [tempMeasureCurrent, setTempMeasureCurrent] = useState<{x:number, y:number} | null>(null);
  const [calibrationFactor, setCalibrationFactor] = useState<number | null>(null); // px per meter

  // Scan / ROI
  const [roiSelection, setRoiSelection] = useState<{start: {x:number, y:number}, end: {x:number, y:number}} | null>(null);
  const [isSelectingRoi, setIsSelectingRoi] = useState(false);
  const [roiModalOpen, setRoiModalOpen] = useState(false);
  const [roiImage, setRoiImage] = useState<string | null>(null);
  const [roiQuery, setRoiQuery] = useState('');
  const [roiResult, setRoiResult] = useState<RoiAnalysis | null>(null);
  const [isRoiAnalyzing, setIsRoiAnalyzing] = useState(false);

  // Report Generation State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState('');

  // Confidence Audit
  const [confidenceModalOpen, setConfidenceModalOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Sim
  const [sandboxSpeed, setSandboxSpeed] = useState(0);
  const [sandboxFriction, setSandboxFriction] = useState(0.7);
  const [customQuery, setCustomQuery] = useState('');
  const [simResult, setSimResult] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Legal
  const [legalQuery, setLegalQuery] = useState('');
  const [legalResult, setLegalResult] = useState<{text: string, chunks: any[]} | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (activeTab === 'log' && logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [streamingLog, analysis, activeTab]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat' && chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatHistory, activeTab]);

  // --- RESIZE LOGIC ---
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
        if (newWidth > 350 && newWidth < document.body.clientWidth * 0.7) {
            setRightPanelWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

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

  // Sync Playback Speed
  useEffect(() => {
      if (videoRef.current) {
          videoRef.current.playbackRate = playbackSpeed;
      }
  }, [playbackSpeed]);

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
      const coords = getCoords(e);
      if (toolMode === 'draw') {
        isDrawing.current = true;
        setCurrentPath([coords]);
      } else if (toolMode === 'scan') {
        setIsSelectingRoi(true);
        setRoiSelection({ start: coords, end: coords });
      } else if (toolMode === 'calibrate' || toolMode === 'measure') {
          setTempMeasureStart(coords);
          setTempMeasureCurrent(coords);
      } else if (zoom > 1) {
        setIsPanning(true);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const coords = getCoords(e);
      if (toolMode === 'draw' && isDrawing.current) {
          setCurrentPath(p => [...p, coords]);
      } else if (toolMode === 'scan' && isSelectingRoi && roiSelection) {
          setRoiSelection(prev => ({ ...prev!, end: coords }));
      } else if ((toolMode === 'calibrate' || toolMode === 'measure') && tempMeasureStart) {
          setTempMeasureCurrent(coords);
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
          captureRoi();
          setToolMode('view');
      } else if (toolMode === 'calibrate' && tempMeasureStart && tempMeasureCurrent) {
          const pxDist = Math.hypot(tempMeasureCurrent.x - tempMeasureStart.x, tempMeasureCurrent.y - tempMeasureStart.y);
          if (pxDist > 5) {
              const realDist = parseFloat(prompt("Enter real world distance for this line (meters):", "1.0") || "0");
              if (realDist > 0) {
                  setCalibrationLine({ start: tempMeasureStart, end: tempMeasureCurrent, distance: realDist });
                  setCalibrationFactor(pxDist / realDist);
              }
          }
          setTempMeasureStart(null);
          setTempMeasureCurrent(null);
          setToolMode('measure'); // Auto switch to measure
      } else if (toolMode === 'measure' && tempMeasureStart && tempMeasureCurrent && calibrationFactor) {
          const pxDist = Math.hypot(tempMeasureCurrent.x - tempMeasureStart.x, tempMeasureCurrent.y - tempMeasureStart.y);
          if (pxDist > 5) {
              setMeasurements(p => [...p, { 
                  start: tempMeasureStart, 
                  end: tempMeasureCurrent, 
                  pxLen: pxDist, 
                  realLen: pxDist / calibrationFactor 
              }]);
          }
          setTempMeasureStart(null);
          setTempMeasureCurrent(null);
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

      if (w < 10 || h < 10) return;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w; tempCanvas.height = h;
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

      // Draw Calibration Line
      if (calibrationLine) {
          ctx.beginPath(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
          ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
          ctx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
          ctx.stroke();
          // Text
          ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 12px monospace';
          ctx.fillText(`${calibrationLine.distance}m`, (calibrationLine.start.x + calibrationLine.end.x)/2, (calibrationLine.start.y + calibrationLine.end.y)/2 - 5);
      }

      // Draw Temp Measure Line
      if (tempMeasureStart && tempMeasureCurrent) {
          ctx.beginPath(); ctx.strokeStyle = toolMode === 'calibrate' ? '#f59e0b' : '#10b981'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
          ctx.moveTo(tempMeasureStart.x, tempMeasureStart.y);
          ctx.lineTo(tempMeasureCurrent.x, tempMeasureCurrent.y);
          ctx.stroke(); ctx.setLineDash([]);
          if (toolMode === 'measure' && calibrationFactor) {
              const d = Math.hypot(tempMeasureCurrent.x - tempMeasureStart.x, tempMeasureCurrent.y - tempMeasureStart.y) / calibrationFactor;
              ctx.fillStyle = '#10b981'; ctx.font = 'bold 14px monospace';
              ctx.fillText(`${d.toFixed(2)}m`, tempMeasureCurrent.x + 10, tempMeasureCurrent.y);
          }
      }

      // Draw Measurements
      measurements.forEach(m => {
          ctx.beginPath(); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2;
          ctx.moveTo(m.start.x, m.start.y);
          ctx.lineTo(m.end.x, m.end.y);
          ctx.stroke();
          ctx.fillStyle = '#10b981'; ctx.font = 'bold 12px monospace';
          ctx.fillText(`${m.realLen.toFixed(2)}m`, (m.start.x + m.end.x)/2, (m.start.y + m.end.y)/2 - 5);
      });

      // Draw ROI Box
      if (roiSelection) {
          const { start, end } = roiSelection;
          const w = end.x - start.x;
          const h = end.y - start.y;
          ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
          ctx.strokeRect(start.x, start.y, w, h); ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.2)'; ctx.fillRect(start.x, start.y, w, h);
      }

  }, [annotations, currentPath, annotationColor, roiSelection, toolMode, calibrationLine, tempMeasureStart, tempMeasureCurrent, measurements]);

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
  
  const stepFrame = (frames: number) => {
      if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
          videoRef.current.currentTime += (frames * 0.033); // approx 30fps
      }
  };

  const resetTools = () => {
      setZoom(1); setPan({x:0,y:0}); setContrast(100); setAnnotations([]); setToolMode('view');
      setMeasurements([]); setCalibrationLine(null); setCalibrationFactor(null);
  };

  const handleChat = async () => {
      if(!chatInput.trim() || !analysis) return;
      const userMsg = chatInput;
      setChatInput('');
      setChatHistory(prev => [...prev, {role: 'user', text: userMsg}]);
      setIsChatting(true);

      const response = await evaluateCounterfactual(analysis.rawAnalysis, userMsg);
      
      setChatHistory(prev => [...prev, {role: 'ai', text: response}]);
      setIsChatting(false);
  };

  const generateReportPDF = async (type: 'Summary' | 'Technical' | 'Insurance' | 'Legal' | 'Full') => {
      if (!analysis) return;
      
      setIsGeneratingReport(true);
      setReportProgress('Drafting professional narrative via Gemini...');

      try {
        const aiNarrative = await generateReport(analysis.rawAnalysis, type);
        setReportProgress('Compiling forensics data structures...');

        const doc = new jsPDF();
        let y = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);

        const checkPageBreak = (neededHeight: number = 20) => {
            if (y + neededHeight > pageHeight - margin) {
                doc.addPage();
                y = 20;
            }
        };

        const addText = (text: string, size: number = 10, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
            doc.setFontSize(size);
            doc.setFont("helvetica", isBold ? "bold" : "normal");
            doc.setTextColor(...color);
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, margin, y);
            y += (lines.length * size * 0.4) + 4; 
            checkPageBreak();
        };

        const addHeader = (text: string) => {
            checkPageBreak(30);
            y += 5;
            doc.setFillColor(240, 240, 245);
            doc.setDrawColor(200, 200, 200);
            doc.rect(margin, y - 5, maxWidth, 10, 'FD');
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 60);
            doc.text(text.toUpperCase(), margin + 3, y + 2);
            y += 12;
        };

        const addSeparator = () => {
            y += 5;
            doc.setDrawColor(220, 220, 220);
            doc.line(margin, y, pageWidth - margin, y);
            y += 8;
        };

        doc.setFillColor(79, 70, 229); 
        doc.circle(margin + 5, 25, 5, 'F');
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Incident Lens AI", margin + 15, 28);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("FORENSIC VIDEO ANALYSIS SUITE", margin + 15, 33);

        y = 50;
        doc.setFontSize(10);
        doc.setTextColor(0,0,0);
        addText(`REPORT TYPE: ${type.toUpperCase()} DOSSIER`, 12, true);
        addText(`DATE GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
        addText(`CASE REFERENCE: ${analysis.vehicleAnalysis?.vehicles[0]?.entityId || 'UNK'}-${Math.floor(Math.random()*10000)}`);
        addSeparator();

        addHeader("Professional Analysis Narrative");
        const cleanNarrative = aiNarrative.replace(/\*\*/g, "").replace(/#/g, "");
        addText(cleanNarrative, 10, false, [50, 50, 50]);
        y += 10;

        addHeader("Reconstructed Timeline");
        ensureArray(analysis.timeline).forEach(evt => {
            const timeColor: [number, number, number] = evt.type === 'impact' ? [220, 38, 38] : [50, 50, 50];
            const prefix = evt.type === 'impact' ? ">>> IMPACT: " : "";
            addText(`[${evt.timestamp}] ${prefix}${evt.description}`, 9, evt.type === 'impact', timeColor);
        });

        if (analysis.fault) {
            addHeader("Liability Determination");
            analysis.fault.allocations.forEach(alloc => {
                addText(`${alloc.party}: ${alloc.percentage}% Fault`, 10, true, [220, 38, 38]);
                addText(`Proximate Cause: ${alloc.causalContribution}`, 9);
                if (alloc.violations.length > 0) {
                    addText("Violations Cited:", 9, true);
                    alloc.violations.forEach(v => addText(`  - ${v.rule} (${v.severity})`, 9));
                }
                y += 2;
            });
        }

        if ((type === 'Technical' || type === 'Full') && analysis.physics?.speedEstimates) {
            addHeader("Physics & Dynamics");
            analysis.physics.speedEstimates.forEach(est => {
                addText(`Target: ${est.entity}`, 10, true, [79, 70, 229]);
                addText(`Estimated Speed: ${est.minSpeed} - ${est.maxSpeed} ${est.unit}`, 9, true);
                if (est.calculation) {
                    addText(`Methodology: ${est.calculation.method}`, 8, false, [100, 100, 100]);
                }
                y += 2;
            });
        }

        addHeader("Forensic Authenticity Audit");
        if (analysis.authenticity) {
            addText(`Integrity Score: ${analysis.authenticity.integrityScore}/100`, 10, true);
            addText(`Assessment: ${analysis.authenticity.overallAssessment}`, 9);
            addText(`Metadata Check: ${analysis.authenticity.metadataAnalysis?.status}`, 9);
        } else {
            addText("No authenticity data available.", 9);
        }

        const totalPages = doc.internal.pages.length;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generated by Incident Lens AI - Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text("CONFIDENTIAL - FORENSIC WORK PRODUCT", margin, pageHeight - 10);
        }

        doc.save(`IncidentLens_${type}_Report.pdf`);

      } catch (e) {
          console.error("PDF Generation failed", e);
          alert("Failed to generate report. Please try again.");
      } finally {
          setIsGeneratingReport(false);
          setReportProgress('');
      }
  };

  const contentToRender = analysis ? analysis.rawAnalysis : streamingLog;

  return (
    <div className="flex flex-col lg:flex-row h-full bg-background overflow-hidden animate-fade-in relative selection:bg-primaryLight selection:text-primary">
      
      {/* --- CONFIDENCE AUDIT MODAL --- */}
      {confidenceModalOpen && analysis?.confidenceReport && (
          <div className="absolute inset-0 z-[100] bg-textPrimary/20 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-border flex justify-between items-center bg-surfaceHighlight">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              analysis.confidenceReport.overallLevel === 'High' ? 'bg-emerald-100 text-emerald-600' :
                              analysis.confidenceReport.overallLevel === 'Moderate' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                          }`}>
                              <ShieldCheck size={20} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-textPrimary font-sans">Forensic Confidence Audit</h3>
                              <p className="text-xs text-textSecondary font-mono">Reliability assessment of automated findings</p>
                          </div>
                      </div>
                      <button onClick={() => setConfidenceModalOpen(false)} className="text-textTertiary hover:text-textPrimary p-2 rounded-full hover:bg-border"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                     <div className="p-4 bg-background rounded-lg border border-border text-sm text-textSecondary leading-relaxed">{analysis.confidenceReport.confidenceStatement}</div>
                  </div>
              </div>
          </div>
      )}

      {/* --- ROI MODAL --- */}
      {roiModalOpen && roiImage && (
          <div className="absolute inset-0 z-[100] bg-textPrimary/20 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in">
              <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[80vh]">
                  <div className="md:w-1/2 bg-black flex items-center justify-center p-6 border-r border-border relative overflow-hidden group">
                      <div className="absolute top-4 left-4 text-[10px] font-mono text-white bg-slate-800/80 px-2 py-1 rounded border border-white/10 z-20">Source Crop</div>
                      <img src={roiImage} className="max-w-full max-h-full object-contain shadow-lg relative z-10" />
                      {/* Scan Line Animation */}
                      {isRoiAnalyzing && (
                        <div className="absolute inset-0 z-30 pointer-events-none">
                            <div className="w-full h-full bg-primary/10 absolute inset-0"></div>
                            <div className="w-full h-12 bg-gradient-to-b from-transparent via-primary/40 to-transparent absolute top-0 left-0 animate-[scan_1.5s_linear_infinite] shadow-[0_0_20px_rgba(79,70,229,0.5)]"></div>
                        </div>
                      )}
                  </div>
                  <div className="md:w-1/2 p-6 flex flex-col bg-surface relative">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2"><Scan size={20} className="text-primary"/> Deep Scan Analysis</h3>
                          <button onClick={() => { setRoiModalOpen(false); setRoiResult(null); setRoiQuery(''); }} className="text-textTertiary hover:text-textPrimary"><X size={20}/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 relative">
                          {isRoiAnalyzing ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface z-20">
                                <div className="relative w-20 h-20 mb-6">
                                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
                                    <div className="absolute inset-4 bg-primaryLight/30 rounded-full flex items-center justify-center animate-pulse">
                                        <Search size={24} className="text-primary" />
                                    </div>
                                </div>
                                <h4 className="text-sm font-bold text-primary font-mono uppercase tracking-widest animate-pulse">Running Forensic Query</h4>
                                <p className="text-xs text-textSecondary mt-2 font-mono">Analyzing visual vectors...</p>
                              </div>
                          ) : roiResult ? (
                              <div className="space-y-4 animate-fade-in">
                                  <div className="p-4 bg-primaryLight/50 border border-primaryLight rounded-lg">
                                      <h4 className="text-xs font-bold text-primary uppercase mb-2 font-mono">Analysis Result</h4>
                                      <p className="text-sm text-textPrimary leading-relaxed font-sans">{roiResult.answer}</p>
                                  </div>
                                  {roiResult.details && (
                                     <div className="p-3 bg-background border border-border rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Activity size={12} className="text-textTertiary"/>
                                            <h4 className="text-[10px] font-bold text-textTertiary uppercase font-mono">Confidence & Details</h4>
                                        </div>
                                        <p className="text-xs text-textSecondary font-mono leading-relaxed">{roiResult.details}</p>
                                     </div>
                                  )}
                              </div>
                          ) : <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                                <Crosshair size={48} className="text-textTertiary mb-3" />
                                <p className="text-xs text-textSecondary font-mono">Select region & ask questions<br/>to extract specific details</p>
                              </div>}
                      </div>
                      <div className="mt-auto flex gap-2">
                              <input 
                                type="text" 
                                value={roiQuery} 
                                onChange={(e) => setRoiQuery(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && !isRoiAnalyzing && roiQuery && (() => { setIsRoiAnalyzing(true); analyzeRegionOfInterest(roiImage.split(',')[1], roiQuery).then(res => { setRoiResult(res); setIsRoiAnalyzing(false); }) })()}
                                placeholder="Investigate area..." 
                                className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" 
                                disabled={isRoiAnalyzing}
                              />
                              <button onClick={() => { if(!roiQuery) return; setIsRoiAnalyzing(true); analyzeRegionOfInterest(roiImage.split(',')[1], roiQuery).then(res => { setRoiResult(res); setIsRoiAnalyzing(false); }) }} disabled={isRoiAnalyzing || !roiQuery} className="px-4 bg-primary text-white rounded-lg hover:bg-primaryHover disabled:opacity-50 transition-colors shadow-sm">
                                {isRoiAnalyzing ? <Loader2 size={18} className="animate-spin"/> : <Search size={18}/>}
                              </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- LEFT PANEL: VIDEO PLAYER --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 relative border-r border-border transition-all duration-75">
         {/* Top Bar: Stats Overlay */}
         <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/95 backdrop-blur-md relative z-20 shadow-sm">
             <div className="flex items-center gap-6 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                 <span className="flex items-center gap-1.5"><Clock size={12} className="text-primary"/> <span className="text-white font-bold">{currentTime.toFixed(3)}s</span> / {videoDuration.toFixed(2)}s</span>
                 {analysis && <span className="flex items-center gap-1.5"><Activity size={12} className="text-primary"/> <span className="text-white font-bold">{ensureArray(analysis.timeline).length}</span> Events</span>}
                 <span className="flex items-center gap-1.5"><Video size={12} className="text-primary"/> {videoRef.current?.videoWidth || 'Source'}</span>
             </div>
             {analysis?.confidenceReport && (
                <button onClick={() => setConfidenceModalOpen(true)} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors group">
                    <ShieldCheck size={12} className="text-emerald-400 group-hover:text-emerald-300" />
                    <span className="text-[10px] text-slate-300 font-bold uppercase group-hover:text-white">Confidence</span>
                    <div className="text-[10px] font-mono font-bold text-white">{analysis.confidenceReport.overallScore}%</div>
                </button>
             )}
         </div>

         {/* Video Viewport */}
         <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black group select-none">
             <div 
                className={`relative w-full h-full max-h-full ${toolMode === 'scan' || toolMode === 'calibrate' || toolMode === 'measure' ? 'cursor-crosshair' : toolMode === 'draw' ? 'cursor-cell' : isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
             >
                 <div className="w-full h-full transition-transform duration-100 ease-out origin-center" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}>
                     <video ref={videoRef} src={videoSources[activeSourceIdx]?.url} className="w-full h-full object-contain" style={{ filter: `contrast(${contrast}%)` }} onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} crossOrigin="anonymous" />
                     <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                 </div>
             </div>

             {/* Advanced HUD */}
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-300 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 z-40">
                 {calibrationFactor && (
                     <div className="bg-slate-900/90 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-mono border border-emerald-500/30 shadow-lg mb-1 flex items-center gap-2 backdrop-blur-md">
                         <Ruler size={10} /> Scale: {(1/calibrationFactor).toFixed(3)} m/px
                     </div>
                 )}
                 <div className="flex items-center gap-2 p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-full shadow-2xl">
                    <div className="flex items-center gap-1 pr-3 border-r border-slate-700/50">
                        <button onClick={() => stepFrame(-1)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Prev Frame"><ChevronLeft size={16}/></button>
                        <button onClick={togglePlay} className="p-3 rounded-full bg-white text-black hover:bg-primary hover:text-white transition-all shadow-glow mx-1">{isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}</button>
                        <button onClick={() => stepFrame(1)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Next Frame"><ChevronRight size={16}/></button>
                    </div>
                    <div className="flex items-center gap-1 px-2 border-r border-slate-700/50">
                        <button onClick={() => setPlaybackSpeed(0.25)} className={`text-[10px] font-bold px-1.5 py-1 rounded ${playbackSpeed === 0.25 ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}>0.25x</button>
                        <button onClick={() => setPlaybackSpeed(0.5)} className={`text-[10px] font-bold px-1.5 py-1 rounded ${playbackSpeed === 0.5 ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}>0.5x</button>
                        <button onClick={() => setPlaybackSpeed(1)} className={`text-[10px] font-bold px-1.5 py-1 rounded ${playbackSpeed === 1 ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}>1x</button>
                    </div>
                    <div className="flex items-center gap-1 pl-1">
                        <button onClick={() => setZoom(Math.max(1, zoom-0.5))} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"><Minimize2 size={16}/></button>
                        <span className="text-[10px] font-mono font-bold text-white w-8 text-center bg-white/10 rounded px-1">{zoom}x</span>
                        <button onClick={() => setZoom(Math.min(5, zoom+0.5))} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"><ZoomIn size={16}/></button>
                    </div>
                    <div className="w-px h-6 bg-slate-700/50 mx-1"></div>
                    <div className="flex gap-1">
                        <button onClick={() => setToolMode(toolMode === 'draw' ? 'view' : 'draw')} className={`p-2 rounded-full transition-all ${toolMode === 'draw' ? 'bg-primary text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`} title="Annotate"><PenTool size={16}/></button>
                        <button onClick={() => setToolMode(toolMode === 'scan' ? 'view' : 'scan')} className={`p-2 rounded-full transition-all ${toolMode === 'scan' ? 'bg-primary text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`} title="AI Scan"><Scan size={16}/></button>
                        <button onClick={() => setToolMode('calibrate')} className={`p-2 rounded-full transition-all ${toolMode === 'calibrate' ? 'bg-amber-500 text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`} title="Calibrate Scale"><Ruler size={16}/></button>
                        <button onClick={() => setToolMode('measure')} disabled={!calibrationFactor} className={`p-2 rounded-full transition-all ${toolMode === 'measure' ? 'bg-emerald-500 text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30'}`} title="Measure"><Calculator size={16}/></button>
                    </div>
                    <button onClick={resetTools} className="p-2 rounded-full hover:text-danger text-slate-400 ml-1"><RotateCcw size={16}/></button>
                 </div>
             </div>
         </div>

         {/* Timeline */}
         <div className="shrink-0 bg-surface z-10 border-t border-border relative">
             <TimelineTrack duration={videoDuration} currentTime={currentTime} onSeek={handleSeek} events={ensureArray(analysis?.timeline)} />
         </div>
      </div>

      {/* --- RESIZE HANDLE --- */}
      {!isPanelCollapsed && (
          <div className="hidden lg:flex w-1 bg-background hover:bg-primaryLight cursor-col-resize items-center justify-center transition-all z-30 group relative border-l border-r border-border" onMouseDown={startResizing}>
              <div className="absolute inset-y-0 -left-2 -right-2 z-10" /> 
              <div className="w-0.5 h-12 bg-borderStrong rounded-full group-hover:bg-primary transition-colors" />
          </div>
      )}

      {/* --- RIGHT PANEL: INTELLIGENCE HUB --- */}
      <div 
        className={`bg-surface border-l border-border flex flex-col relative z-20 shadow-panel transition-[width] duration-75 ease-linear ${isPanelCollapsed ? 'hidden' : 'flex'}`}
        style={{ width: isPanelCollapsed ? 0 : window.innerWidth >= 1024 ? rightPanelWidth : '100%' }}
      >
          {/* Header */}
          <div className="px-2 bg-surfaceHighlight border-b border-border flex items-center h-12 justify-between">
              <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-1 h-full items-end pb-0">
                  {[
                      { id: 'log', label: 'Reasoning', icon: Terminal },
                      { id: 'reports', label: 'Reports', icon: FileType },
                      { id: 'chat', label: 'Investigate', icon: MessageSquare },
                      { id: 'authenticity', label: 'Verify', icon: FileCheck },
                      { id: 'narrative', label: 'Narrative', icon: BookOpen },
                      { id: 'entities', label: 'Entities', icon: User },
                      { id: 'scene', label: 'Scene', icon: Cloud },
                      { id: 'damage', label: 'Damage', icon: Hammer },
                      { id: 'signals', label: 'Signals', icon: Signal },
                      { id: 'vehicles', label: 'Vehicles', icon: Car },
                      { id: 'occupants', label: 'Occupants', icon: User },
                      { id: 'physics', label: 'Physics', icon: Zap },
                      { id: 'liability', label: 'Liability', icon: Gavel },
                      { id: 'debris', label: 'Debris', icon: Share2 },
                      { id: 'audio', label: 'Audio', icon: Waves },
                      { id: 'shadows', label: 'Shadows', icon: Sun },
                      { id: 'sim', label: 'Sim', icon: GitPullRequest },
                      { id: 'synthesis', label: 'Synth', icon: Layers },
                      { id: 'reflections', label: 'Reflect', icon: Sparkles },
                      { id: 'fleet', label: 'Safety', icon: ShieldAlert },
                  ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            group flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all h-10 mb-[-1px] rounded-t-md border-t border-l border-r min-w-fit
                            ${activeTab === tab.id 
                                ? 'bg-surface text-primary border-border border-b-transparent relative z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.02)]' 
                                : 'bg-transparent text-textTertiary hover:text-textPrimary hover:bg-background border-transparent'}
                        `}
                      >
                          <tab.icon size={13} className={activeTab === tab.id ? 'text-primary' : 'opacity-70'} /> 
                          <span className="whitespace-nowrap">{tab.label}</span>
                      </button>
                  ))}
              </div>
              <div className="flex items-center gap-1 pl-2">
                  <button 
                      onClick={() => generateReportPDF('Full')} 
                      className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primaryHover text-white rounded-lg text-[10px] font-bold uppercase tracking-wider mr-2 transition-all shadow-md hover:shadow-glow transform hover:-translate-y-0.5"
                      title="Download Full Master Dossier"
                  >
                      <FileDown size={14} /> Export Case
                  </button>
                  <button onClick={() => setIsPanelCollapsed(true)} className="p-2 text-textTertiary hover:text-textPrimary"><PanelRightClose size={16} /></button>
              </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface">
              
              {/* REPORTS GENERATION TAB */}
              {activeTab === 'reports' && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 gap-4">
                          {[
                              { id: 'Summary', title: 'Executive Summary', icon: FileText, desc: 'High-level overview covering facts, fault, and key evidence.', color: 'text-blue-600 bg-blue-50 border-blue-100' },
                              { id: 'Technical', title: 'Technical Reconstruction', icon: Activity, desc: 'Detailed physics analysis, speed calculations, and environmental data.', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                              { id: 'Insurance', title: 'Insurance Claim Form', icon: FileCheck, desc: 'Standardized liability breakdown, party details, and damage assessment.', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                              { id: 'Legal', title: 'Legal Brief', icon: Scale, desc: 'Formal argumentation, rule citations, and chain of custody verification.', color: 'text-slate-700 bg-slate-50 border-slate-200' },
                          ].map((report) => (
                              <div key={report.id} className="bg-surface border border-border rounded-xl p-5 shadow-card hover:shadow-soft transition-all flex items-center justify-between group">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.color}`}>
                                          <report.icon size={24} />
                                      </div>
                                      <div>
                                          <h4 className="text-sm font-bold text-textPrimary mb-1">{report.title}</h4>
                                          <p className="text-[11px] text-textSecondary max-w-[280px] leading-snug font-mono">{report.desc}</p>
                                          <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-textTertiary uppercase tracking-wider">
                                              <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Ready to export
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                      <button 
                                        onClick={() => generateReportPDF(report.id as any)}
                                        disabled={isGeneratingReport}
                                        className="flex items-center gap-2 px-4 py-2 bg-background border border-border hover:border-primary/50 hover:text-primary rounded-lg text-xs font-bold text-textSecondary transition-colors shadow-sm disabled:opacity-50"
                                      >
                                          {isGeneratingReport ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14}/>}
                                          {isGeneratingReport ? 'Processing' : 'PDF'}
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                      {isGeneratingReport && (
                          <div className="p-4 bg-primaryLight/20 border border-primaryLight rounded-xl flex items-center gap-3 animate-fade-in">
                              <Loader2 className="animate-spin text-primary" size={20} />
                              <div>
                                  <h4 className="text-xs font-bold text-primary">Generating Professional Report</h4>
                                  <p className="text-[10px] text-textSecondary font-mono">{reportProgress}</p>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {/* CHAT TAB */}
              {activeTab === 'chat' && (
                  <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 p-4 mb-4 bg-background border border-border rounded-xl" ref={chatRef}>
                          {chatHistory.length === 0 && (
                              <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                                  <MessageSquare size={48} className="text-textTertiary mb-2" />
                                  <p className="text-xs text-textSecondary">Ask the Investigator AI about specific details<br/>or hypothetical scenarios.</p>
                              </div>
                          )}
                          {chatHistory.map((msg, idx) => (
                              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed shadow-sm transition-all ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-surface border border-border rounded-tl-none'}`}>
                                      {msg.role === 'user' ? (
                                          <p>{msg.text}</p>
                                      ) : (
                                          <FormattedMarkdown text={msg.text} onSeek={handleSeek} className="prose-sm" />
                                      )}
                                  </div>
                              </div>
                          ))}
                          {isChatting && (
                              <div className="flex justify-start">
                                  <div className="bg-surface border border-border rounded-xl p-3 rounded-tl-none shadow-sm flex gap-2 items-center">
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                  </div>
                              </div>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <input 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                            placeholder="Ask a question about the incident..." 
                            className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm" 
                          />
                          <button onClick={handleChat} disabled={isChatting || !chatInput} className="bg-primary text-white px-4 rounded-lg hover:bg-primaryHover disabled:opacity-50 transition-colors shadow-sm">
                              <ChevronRight size={18} />
                          </button>
                      </div>
                  </div>
              )}

              {/* REASONING STREAM TAB */}
              {activeTab === 'log' && (
                  <div className="space-y-4 h-full flex flex-col" ref={logRef}>
                      <div className="flex items-center justify-between mb-2 shrink-0">
                        <h4 className="text-[10px] font-bold text-textSecondary uppercase flex items-center gap-2 font-mono tracking-widest">
                           <Activity size={12} className={!analysis ? "text-primary animate-pulse" : "text-success"}/> 
                           {analysis ? "FORENSIC TRACE LOG" : "LIVE ANALYSIS STREAM"}
                        </h4>
                        {!analysis && <span className="flex items-center gap-1.5 text-[9px] text-primary font-mono bg-primaryLight/50 px-2 py-0.5 rounded border border-primaryLight"><Loader2 size={10} className="animate-spin"/> PROCESSING</span>}
                      </div>
                      <div className="flex-1 p-5 bg-background border border-border rounded-xl shadow-inner font-mono text-xs overflow-y-auto custom-scrollbar relative">
                         <ReasoningLogRenderer text={contentToRender || "Initializing Neural Forensics Engine..."} onSeek={handleSeek} />
                      </div>
                  </div>
              )}
              {/* AUTHENTICITY TAB */}
              {activeTab === 'authenticity' && analysis?.authenticity && (
                  <div className="space-y-6 animate-fade-in">
                      <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center space-y-3 ${analysis.authenticity.overallAssessment === 'Verified Authentic' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${analysis.authenticity.overallAssessment === 'Verified Authentic' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                             {analysis.authenticity.overallAssessment === 'Verified Authentic' ? <CheckCircle2 size={32}/> : <AlertOctagon size={32}/>}
                          </div>
                          <div>
                              <div className="text-2xl font-bold text-textPrimary">{analysis.authenticity.integrityScore}/100</div>
                              <div className="text-xs font-bold uppercase tracking-widest text-textSecondary">{analysis.authenticity.overallAssessment}</div>
                          </div>
                      </div>
                      <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-textTertiary uppercase font-mono tracking-wider">Chain of Custody Checks</h4>
                          {[ { label: "Temporal Continuity", data: analysis.authenticity.temporalContinuity }, { label: "Technical Consistency", data: analysis.authenticity.technicalConsistency }, { label: "Physical Consistency", data: analysis.authenticity.physicalConsistency }, { label: "Metadata Analysis", data: analysis.authenticity.metadataAnalysis }, ].map((check, i) => (
                              <div key={i} className="flex justify-between items-center p-3 bg-surface border border-border rounded-lg shadow-sm">
                                  <div> <div className="text-xs font-bold text-textPrimary">{check.label}</div> <div className="text-[10px] text-textSecondary">{check.data?.observation || 'Pending...'}</div> </div>
                                  <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${check.data?.status === 'Pass' ? 'bg-emerald-50 text-emerald-700' : check.data?.status === 'Fail' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}> {check.data?.status || 'N/A'} </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              
              {/* ENTITIES TAB */}
              {activeTab === 'entities' && ensureArray(analysis?.entities).length > 0 ? (
                  <div className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 gap-4">
                          {ensureArray(analysis?.entities).map((entity, i) => (
                              <div key={i} className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl shadow-card hover:shadow-soft transition-all">
                                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{backgroundColor: entity.color || '#64748b'}}> {entity.id.substring(0, 2)} </div>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-start"> <h4 className="text-sm font-bold text-textPrimary">{entity.id}</h4> <span className="text-[10px] bg-background text-textSecondary px-2 py-0.5 rounded-full border border-border uppercase font-bold tracking-wider">{entity.type}</span> </div>
                                      <p className="text-xs text-textSecondary mt-1">{entity.description}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : activeTab === 'entities' && <EmptyAnalysisState title="Entity Tracking" icon={User} />}
              
              {/* NARRATIVE TAB - ENHANCED */}
              {activeTab === 'narrative' && analysis && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="bg-surface border border-border rounded-xl p-8 relative overflow-hidden shadow-card">
                          <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
                              <h4 className="text-[10px] font-bold text-textSecondary uppercase flex items-center gap-2 font-mono tracking-widest"> <Scale size={14} className="text-primary"/> Formal Chain of Events </h4>
                              <span className="text-[9px] font-mono text-textSecondary bg-background px-2 py-1 rounded border border-border">LEGAL FORMAT</span>
                          </div>
                          <div className="prose prose-sm max-w-none text-textPrimary font-serif pl-2 leading-relaxed">
                              <FormattedMarkdown text={analysis.chainOfEvents || "Narrative generation pending..."} onSeek={handleSeek} className="space-y-4" />
                          </div>
                      </div>
                  </div>
              )}
              {/* SCENE (ENVIRONMENTAL) TAB */}
              {activeTab === 'scene' && analysis?.environmental && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="bg-background border border-border rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5 text-primary"><Cloud size={80}/></div>
                          <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-4 flex items-center gap-2 font-mono tracking-widest"> <Cloud size={14} className="text-primary"/> Environmental Context </h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-surface rounded-lg border border-border shadow-sm"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Weather</div> <div className="text-sm font-bold text-textPrimary font-sans">{analysis.environmental.weather?.condition || "N/A"}</div> </div>
                              <div className="p-4 bg-surface rounded-lg border border-border shadow-sm"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Visibility</div> <div className="text-sm font-bold text-textPrimary font-sans">{analysis.environmental.weather?.visibility || "N/A"}</div> </div>
                              <div className="p-4 bg-surface rounded-lg border border-border shadow-sm"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Road Surface</div> <div className="text-sm font-bold text-textPrimary flex items-center gap-2 font-sans"> {analysis.environmental.road?.condition || "N/A"} {analysis.environmental.road?.condition?.toLowerCase().includes('wet') && <Droplets size={12} className="text-primary"/>} </div> </div>
                              <div className="p-4 bg-surface rounded-lg border border-border shadow-sm"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Lighting</div> <div className="text-sm font-bold text-textPrimary font-sans">{analysis.environmental.lighting || "N/A"}</div> </div>
                          </div>
                      </div>
                      <div>
                          <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-3 flex items-center gap-2 font-mono tracking-widest"> <AlertTriangle size={14} className="text-warning"/> Environmental Hazards </h4>
                          <div className="space-y-3">
                              {ensureArray(analysis.environmental.hazards).map((haz, i) => (
                                  <div key={i} className="flex bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                                      <div className={`w-12 flex items-center justify-center ${ haz.severity === 'Critical' ? 'bg-rose-50 text-danger' : 'bg-amber-50 text-warning' }`}> <AlertTriangle size={18}/> </div>
                                      <div className="p-3 flex-1"> <div className="flex justify-between items-start mb-1"> <span className="text-xs font-bold text-textPrimary font-mono">{haz.category}</span> <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${ haz.severity === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700' }`}>{haz.contribution}</span> </div> <p className="text-sm text-textSecondary leading-snug font-sans">{haz.description}</p> </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}
              {/* DAMAGE TAB */}
              {activeTab === 'damage' && analysis?.damageAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      <div className={`p-4 rounded-xl border flex items-center justify-between ${analysis.damageAnalysis.validationConclusion?.isConsistent ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                          <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${analysis.damageAnalysis.validationConclusion?.isConsistent ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}> {analysis.damageAnalysis.validationConclusion?.isConsistent ? <CheckCircle2 size={24}/> : <ShieldAlert size={24}/>} </div>
                              <div> <h4 className={`text-sm font-bold ${analysis.damageAnalysis.validationConclusion?.isConsistent ? 'text-emerald-800' : 'text-rose-800'}`}> {analysis.damageAnalysis.validationConclusion?.isConsistent ? 'Physics Model Validated' : 'Physics Model Discrepancy'} </h4> <p className="text-[10px] text-textSecondary font-mono mt-1">{analysis.damageAnalysis.validationConclusion?.reasoning}</p> </div>
                          </div>
                      </div>
                      <div className="bg-background border border-border rounded-xl p-6 relative overflow-hidden">
                          <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-6 flex items-center gap-2 font-mono tracking-widest"> <Activity size={12}/> Impact Energy Profile </h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-surface p-4 rounded-lg border border-border shadow-sm"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Kinetic Energy</div> <div className="text-2xl font-mono font-bold text-textPrimary tracking-tighter">{(analysis.damageAnalysis.physics?.kineticEnergyJoule / 1000).toFixed(1)} <span className="text-sm text-textSecondary">kJ</span></div> </div>
                              <div className="bg-surface p-4 rounded-lg border border-border shadow-sm"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Impact Vector</div> <div className="text-sm font-bold text-textPrimary font-mono mt-1">{analysis.damageAnalysis.physics?.forceVector}</div> </div>
                          </div>
                      </div>
                  </div>
              )}
              {/* VEHICLE IDENTIFICATION TAB */}
              {activeTab === 'vehicles' && analysis?.vehicleAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="p-4 bg-background rounded-lg border border-border shadow-sm"> <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-2 font-mono">Fleet Identification Summary</h4> <p className="text-xs text-textSecondary leading-relaxed italic border-l-2 border-primary/50 pl-3 font-serif"> "{analysis.vehicleAnalysis.summary}" </p> </div>
                      <div className="space-y-6">
                          {ensureArray(analysis.vehicleAnalysis.vehicles).map((veh, i) => (
                              <div key={i} className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
                                  <div className="bg-background border-b border-border p-4 flex justify-between items-center"> <div className="flex items-center gap-3"> <div className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center text-primary border border-primary/20"> <Car size={20} /> </div> <div> <div className="text-sm font-bold text-textPrimary">{veh.make} {veh.model}</div> <div className="text-[10px] text-textSecondary uppercase font-mono">{veh.yearRange} {veh.trimLevel}</div> </div> </div> <ConfidenceBadge level={veh.confidence} /> </div>
                                  <div className="p-6 relative bg-surface">
                                      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none"></div>
                                      <div className="relative border border-borderStrong rounded-lg p-8 flex items-center justify-center min-h-[160px] bg-background">
                                          <div className="w-48 h-24 border-2 border-textSecondary rounded-lg relative flex items-center justify-center bg-surface shadow-sm"> <div className="text-[10px] font-mono text-textTertiary uppercase tracking-widest">Chassis: {veh.entityId}</div> <div className="absolute -bottom-6 left-0 right-0 h-4 border-l border-r border-b border-textSecondary flex items-center justify-center"> <span className="absolute top-full mt-1 text-[9px] font-mono text-textSecondary bg-surface px-1 border border-border rounded">L: {veh.specs?.length || "N/A"}</span> </div> <div className="absolute bottom-2 left-8 right-8 h-2 border-b border-dashed border-textSecondary flex items-center justify-center"> <span className="absolute top-full mt-0.5 text-[8px] font-mono text-textTertiary">WB: {veh.specs?.wheelbase || "N/A"}</span> </div> <div className="absolute -right-6 top-0 bottom-0 w-4 border-t border-b border-r border-textSecondary flex items-center justify-center"> <span className="absolute left-full ml-1 text-[9px] font-mono text-textSecondary bg-surface px-1 border border-border rounded whitespace-nowrap" style={{writingMode: 'vertical-rl'}}>H: {veh.specs?.height || "N/A"}</span> </div> </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 mt-6"> <div className="bg-background rounded p-3 border border-border"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Curb Weight</div> <div className="text-sm font-bold text-textPrimary font-mono">{veh.specs?.weight || "N/A"}</div> </div> <div className="bg-background rounded p-3 border border-border"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Color/Finish</div> <div className="text-sm font-bold text-textPrimary flex items-center gap-2"> <div className="w-3 h-3 rounded-full border border-borderStrong shadow-sm" style={{background: veh.color === 'Red' ? '#ef4444' : veh.color?.toLowerCase()}}></div> {veh.color} </div> </div> </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              {/* OCCUPANTS TAB */}
              {activeTab === 'occupants' && analysis?.occupantAnalysis && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="p-4 bg-primaryLight/30 rounded-lg border border-primaryLight text-primary text-xs font-medium leading-relaxed font-sans"> {analysis.occupantAnalysis.summary} </div>
                      {ensureArray(analysis.occupantAnalysis.occupants).map((occ, i) => (
                          <div key={i} className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                              <div className="p-4 border-b border-border flex justify-between items-center bg-background"> <div className="flex items-center gap-3"> <div className="w-10 h-10 bg-border rounded-full flex items-center justify-center text-textSecondary"> <User size={20}/> </div> <div> <div className="text-sm font-bold text-textPrimary">{occ.id}</div> <div className="text-[10px] text-textSecondary uppercase">{occ.role}</div> </div> </div> <div className="flex items-center gap-3"> <div className="text-right"> <div className="text-[9px] text-textTertiary uppercase font-bold">Distraction</div> <div className="h-1.5 w-16 bg-border rounded-full mt-1"> <div className="h-full bg-danger rounded-full" style={{width: `${occ.distractionScore}%`}}></div> </div> </div> <div className="text-right"> <div className="text-[9px] text-textTertiary uppercase font-bold">Reaction</div> <div className="text-xs font-mono font-bold text-textPrimary">{occ.reactionTime}</div> </div> </div> </div>
                              <div className="p-4 space-y-3"> {ensureArray(occ.states).map((state, k) => ( <div key={k} className="flex gap-3 text-xs border-l-2 border-border pl-3 py-1 relative"> <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-borderStrong border-2 border-surface"></div> <div className="w-12 shrink-0 font-mono text-textSecondary">{state.timestamp}</div> <div className="flex-1"> <div className="flex justify-between"> <span className="font-bold text-textPrimary">{state.attentionStatus}</span> <ConfidenceBadge level={state.confidence} /> </div> <div className="text-textSecondary mt-1"> Gaze: {state.gazeVector} • Hands: {state.handAction} </div> </div> </div> ))} </div>
                          </div>
                      ))}
                  </div>
              )}
              {/* SIGNALS TAB */}
              {activeTab === 'signals' && analysis?.signalInference && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden flex flex-col items-center shadow-card"> <div className="absolute top-0 right-0 p-3 opacity-5 text-primary"><Signal size={64}/></div> <h4 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-6 w-full text-left flex items-center gap-2 font-mono"> <Eye size={12} className="text-primary"/> Signal State Inference </h4> <div className="w-24 bg-slate-800 border-2 border-slate-700 rounded-lg p-2 flex flex-col gap-2 shadow-xl relative"> <div className={`w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center relative overflow-hidden transition-all duration-500 ${analysis.signalInference.inferredState === 'Red' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-red-900/20'}`}></div> <div className={`w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center relative overflow-hidden transition-all duration-500 ${analysis.signalInference.inferredState === 'Yellow' ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]' : 'bg-amber-900/20'}`}></div> <div className={`w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center relative overflow-hidden transition-all duration-500 ${analysis.signalInference.inferredState === 'Green' ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-emerald-900/20'}`}></div> </div> <div className="mt-6 flex flex-col items-center gap-2"> <div className="text-2xl font-bold text-textPrimary tracking-tight font-sans"> {analysis.signalInference.inferredState} </div> <ConfidenceBadge level={analysis.signalInference.confidence} /> </div> </div>
                      <div> <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-3 font-mono tracking-wider">Supporting Evidence</h4> <div className="space-y-3"> {ensureArray(analysis.signalInference.evidence).map((ev, i) => ( <div key={i} className="bg-background border border-border rounded-lg p-3 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => { const match = ev.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/); if (match) { const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0); handleSeek(sec); } }}> <div className="flex justify-between items-start mb-2"> <div className="flex items-center gap-2"> <span className="text-[10px] font-mono text-primary bg-primaryLight/30 px-1.5 rounded border border-primaryLight">{ev.timestamp}</span> <span className="text-xs font-bold text-textPrimary font-sans">{ev.type}</span> </div> <ConfidenceBadge level={ev.confidence} /> </div> <div className="text-[10px] text-textSecondary mb-1.5 font-sans">{ev.observation}</div> <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary bg-primaryLight/30 p-1.5 rounded border border-primaryLight font-mono"> <ChevronRight size={10}/> Implication: {ev.implication} </div> </div> ))} </div> </div>
                  </div>
              )}
              {/* LIABILITY TAB */}
              {activeTab === 'liability' && (
                  <div className="flex flex-col h-full space-y-8 animate-fade-in">
                       <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center shadow-card relative overflow-hidden"> <h4 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-4 font-mono">Liability Allocation</h4> <div className="h-48 w-full"> <FaultChart allocations={ensureArray(analysis?.fault?.allocations)} /> </div> <p className="text-xs text-center text-textSecondary mt-4 italic max-w-sm font-serif"> {analysis?.fault.summary} </p> </div>
                       <div className="bg-primaryLight/20 border border-primaryLight/50 rounded-xl p-4"> <h4 className="text-[10px] font-bold text-primary uppercase mb-3 font-mono flex items-center gap-2"> <Library size={12}/> Legal Precedent Research </h4> <div className="flex gap-2 mb-4"> <input type="text" placeholder="Search case law (e.g. 'Left Turn Yield California')" className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-all" value={legalQuery} onChange={(e) => setLegalQuery(e.target.value)} /> <button onClick={() => { setIsSearching(true); searchSimilarCases(legalQuery).then(res => { setLegalResult(res); setIsSearching(false); }); }} disabled={isSearching || !legalQuery} className="bg-primary text-white px-3 py-2 rounded-lg hover:bg-primaryHover disabled:opacity-50 transition-colors shadow-sm"> {isSearching ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>} </button> </div> {legalResult && ( 
                         <div className="bg-surface rounded-lg border border-primaryLight shadow-sm animate-fade-in overflow-hidden mt-4">
                           <div className="bg-primaryLight/30 px-4 py-2 border-b border-primaryLight flex justify-between items-center">
                              <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider">Research Findings</h5>
                              <span className="text-[9px] text-primary font-mono">GEMINI GROUNDING</span>
                           </div>
                           <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                              <FormattedMarkdown text={legalResult.text} />
                           </div>
                           {legalResult.chunks && legalResult.chunks.length > 0 && (
                             <div className="bg-background border-t border-border p-3 space-y-1.5">
                               <div className="text-[9px] font-bold text-textTertiary uppercase mb-2">Citations & Sources</div>
                               {legalResult.chunks.map((chunk, i) => (
                                 <a key={i} href={chunk.web?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-surface border border-border rounded hover:border-primary/50 hover:shadow-sm transition-all group">
                                     <div className="bg-background p-1 rounded text-textTertiary group-hover:text-primary group-hover:bg-primaryLight transition-colors"><Globe size={10}/></div>
                                     <div className="flex-1 min-w-0">
                                         <div className="text-[10px] font-bold text-textSecondary truncate group-hover:text-primary transition-colors">{chunk.web?.title}</div>
                                         <div className="text-[9px] text-textTertiary truncate font-mono">{chunk.web?.uri}</div>
                                     </div>
                                 </a>
                               ))}
                             </div>
                           )}
                         </div>
                       )} </div>
                       {ensureArray(analysis?.fault?.allocations).map((alloc, i) => ( <div key={i} className="bg-background border border-border rounded-xl overflow-hidden"> <div className="p-4 border-b border-border flex justify-between items-center bg-surface"> <div className="flex items-center gap-3"> <div className="text-3xl font-mono font-bold text-textPrimary tracking-tighter">{alloc.percentage}%</div> <div> <div className="text-sm font-bold text-textPrimary font-sans">{alloc.party}</div> <ConfidenceBadge level={alloc.confidence} /> </div> </div> </div> <div className="p-5 space-y-5"> {ensureArray(alloc.violations).map((v, k) => ( <div key={k} className="bg-rose-50 border border-rose-100 rounded-md p-3"> <div className="flex justify-between mb-1"> <span className="text-xs font-bold text-danger font-sans">{v.rule}</span> <span className="text-[8px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{v.severity}</span> </div> <div className="text-[10px] text-rose-600 font-mono"> <InlineText text={v.description + " " + v.timestamp} onSeek={handleSeek} /> </div> </div> ))} <div className="p-4 bg-surface rounded-lg border border-border shadow-sm"> <p className="text-xs text-textSecondary leading-relaxed font-sans"> <InlineText text={alloc.reasoning} onSeek={handleSeek} /> </p> </div> </div> </div> ))}
                  </div>
              )}
              {/* PHYSICS TAB */}
              {activeTab === 'physics' && (
                  <div className="space-y-6 animate-fade-in">
                      <div className="bg-background border border-border rounded-xl p-5 relative overflow-hidden"> <h4 className="text-[10px] font-bold text-primary uppercase mb-5 flex items-center gap-2 font-mono tracking-widest"><Zap size={12}/> Variable Sandbox</h4> <div className="space-y-5"> <div> <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-2"><span>VELOCITY DELTA</span><span className="text-textPrimary font-mono bg-surface border border-border px-1.5 rounded shadow-sm">{sandboxSpeed > 0 ? '+' : ''}{sandboxSpeed} mph</span></div> <input type="range" min="-20" max="20" step="5" value={sandboxSpeed} onChange={(e) => setSandboxSpeed(parseInt(e.target.value))} className="w-full h-1 bg-borderStrong rounded-lg appearance-none cursor-pointer custom-range" /> </div> <div> <div className="flex justify-between text-[10px] font-bold text-textSecondary mb-2"><span>FRICTION COEFF (µ)</span><span className="text-textPrimary font-mono bg-surface border border-border px-1.5 rounded shadow-sm">{sandboxFriction}</span></div> <input type="range" min="0.1" max="1.0" step="0.1" value={sandboxFriction} onChange={(e) => setSandboxFriction(parseFloat(e.target.value))} className="w-full h-1 bg-borderStrong rounded-lg appearance-none cursor-pointer custom-range" /> </div> </div> </div>
                      <h4 className="text-xs font-bold text-textSecondary uppercase mb-2 font-mono">Kinematic Reconstruction</h4>
                      {ensureArray(analysis?.physics?.speedEstimates).map((est, i) => { const simSpeed = ((est.maxSpeed + est.minSpeed)/2) + sandboxSpeed; const stopDist = Math.pow(simSpeed * 0.447, 2) / (2 * sandboxFriction * 9.8) * 3.28; return ( <div key={i} className="bg-surface border border-border rounded-xl p-4 shadow-card"> <div className="flex justify-between items-center mb-4"> <span className="text-sm font-bold text-textPrimary">{est.entity}</span> <ConfidenceBadge level={est.confidence}/> </div> <div className="grid grid-cols-2 gap-4"> <div> <div className="text-[10px] text-textTertiary uppercase font-bold mb-1">Est. Speed</div> <div className="text-2xl font-mono font-bold text-primary"> {simSpeed.toFixed(0)} <span className="text-sm text-textSecondary">mph</span> </div> </div> <div> <div className="text-[10px] text-emerald-600 uppercase font-bold mb-1">Sim Stop Dist</div> <div className="text-2xl font-mono font-bold text-success"> {stopDist.toFixed(1)} <span className="text-sm text-emerald-600">ft</span> </div> </div> </div> {est.calculation && ( <div className="mt-3 p-3 bg-background border border-border rounded-lg text-xs font-mono text-textSecondary"> <strong className="text-textPrimary">Method:</strong> {est.calculation.method} <br/> <span className="italic">{est.calculation.reasoning}</span> </div> )} </div> ); })}
                  </div>
              )}
              {/* SHADOWS TAB */}
              {activeTab === 'shadows' && (
                  analysis?.shadowAnalysis ? (
                      <div className="space-y-6 animate-fade-in">
                          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex items-center gap-6"> <div className="w-24 h-24 relative shrink-0 border-2 border-border rounded-full bg-background"> <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-textTertiary">N</div> <div className="absolute w-1 h-10 bg-warning top-2 left-1/2 -translate-x-1/2 origin-bottom rotate-45 rounded-full shadow-sm"></div> <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-textPrimary rounded-full -translate-x-1/2 -translate-y-1/2"></div> </div> <div className="flex-1 space-y-3"> <h4 className="text-xs font-bold text-textPrimary font-mono uppercase tracking-wide flex items-center gap-2"> <Sun size={14} className="text-warning"/> Solar Geometry </h4> <div className="grid grid-cols-2 gap-3"> <div className="bg-background p-2 rounded border border-border"> <div className="text-[9px] text-textTertiary uppercase">Azimuth</div> <div className="text-sm font-bold text-textPrimary">{analysis.shadowAnalysis.lightSource.azimuth}</div> </div> <div className="bg-background p-2 rounded border border-border"> <div className="text-[9px] text-textTertiary uppercase">Elevation</div> <div className="text-sm font-bold text-textPrimary">{analysis.shadowAnalysis.lightSource.elevation}</div> </div> </div> </div> </div>
                          <div className="space-y-2"> <h4 className="text-[10px] font-bold text-textSecondary uppercase font-mono">Shadow Consistency</h4> {ensureArray(analysis.shadowAnalysis.artifacts).map((art, i) => ( <div key={i} className="flex gap-3 items-center p-3 bg-surface border border-border rounded-lg shadow-sm"> <div className={`w-2 h-2 rounded-full ${art.consistency === 'Consistent' ? 'bg-success' : 'bg-danger'}`}></div> <div className="flex-1"> <div className="text-xs font-bold text-textPrimary">{art.object}</div> <div className="text-[10px] text-textSecondary">{art.implication}</div> </div> </div> ))} </div>
                      </div>
                  ) : (
                      <EmptyAnalysisState title="Shadow Analysis" icon={Sun} />
                  )
              )}
              {/* SIMULATION TAB */}
              {activeTab === 'sim' && (
                  <div className="flex flex-col h-full">
                      <div className="bg-surface border border-border rounded-lg p-1 flex gap-2 mb-6 shadow-sm"> <input value={customQuery} onChange={(e) => setCustomQuery(e.target.value)} placeholder="Type a 'What If' scenario..." className="flex-1 bg-transparent px-3 py-2 text-xs text-textPrimary focus:outline-none placeholder-textTertiary font-sans" /> <button onClick={() => {setIsSimulating(true); evaluateCounterfactual(analysis?.rawAnalysis||"", customQuery).then(r => {setSimResult(r); setIsSimulating(false)})}} disabled={isSimulating} className="px-3 bg-primaryLight text-primary rounded hover:bg-indigo-200 disabled:opacity-50 transition-colors"> {isSimulating ? <Loader2 size={14} className="animate-spin"/> : <GitPullRequest size={14}/>} </button> </div>
                      {simResult && ( <div className="p-4 bg-primaryLight/30 border-l-4 border-primary text-xs text-textSecondary leading-relaxed mb-6 animate-fade-in shadow-sm rounded-r-lg font-sans"> <FormattedMarkdown text={simResult} onSeek={handleSeek} /> </div> )}
                      <div className="space-y-3"> <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-1 font-mono tracking-wider">Generated Counterfactuals</h4> {ensureArray(analysis?.counterfactuals).map((cf, i) => ( <div key={i} onClick={() => setCustomQuery(cf.question)} className="p-4 border border-border hover:border-primary/30 rounded-lg bg-surface cursor-pointer transition-all group shadow-card hover:shadow-soft"> <div className="text-xs font-bold text-textPrimary mb-1.5 group-hover:text-primary transition-colors font-sans">{cf.question}</div> <div className="text-[10px] text-textSecondary flex justify-between font-mono"> <span>Outcome: <span className="font-bold text-textPrimary">{cf.outcome}</span></span> <span className="text-emerald-600 bg-emerald-50 px-1.5 rounded">{cf.probability} Prob.</span> </div> </div> ))} </div>
                  </div>
              )}
              {/* AUDIO TAB */}
              {activeTab === 'audio' && (
                  analysis?.audioAnalysis ? (
                      <div className="space-y-6 animate-fade-in">
                          <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden shadow-card"> <div className="absolute top-0 right-0 p-4 opacity-5 text-primary"><Speaker size={80}/></div> <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-4 flex items-center gap-2 font-mono tracking-widest"> <Waves size={14} className="text-primary"/> Acoustic Signatures </h4> <div className="grid grid-cols-2 gap-4"> <div className="p-3 bg-background rounded border border-border"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Braking Intensity</div> <div className="text-sm font-bold text-textPrimary">{analysis.audioAnalysis.acoustics.brakingIntensity || "Not Detected"}</div> </div> <div className="p-3 bg-background rounded border border-border"> <div className="text-[9px] text-textTertiary uppercase mb-1 font-mono">Impact Sound</div> <div className="text-sm font-bold text-textPrimary">{analysis.audioAnalysis.acoustics.impactForce || "Not Detected"}</div> </div> </div> </div>
                          <div> <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-3 font-mono">Audio Events Timeline</h4> <div className="space-y-3"> {ensureArray(analysis.audioAnalysis.events).map((evt, i) => ( <div key={i} className="flex gap-4 p-3 bg-surface border border-border rounded-lg group transition-all hover:shadow-md cursor-pointer" onClick={() => { const match = evt.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/); if (match) { const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0); handleSeek(sec); } }}> <div className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center shrink-0 border border-primary/20 text-primary"> <Waves size={18}/> </div> <div className="flex-1 min-w-0"> <div className="flex justify-between items-center mb-1"> <span className="text-xs font-bold text-textPrimary">{evt.type}</span> <span className="text-[10px] font-mono text-primary bg-primaryLight px-1.5 rounded">{evt.timestamp}</span> </div> <p className="text-[10px] text-textSecondary leading-relaxed mb-1">{evt.description}</p> </div> </div> ))} </div> </div>
                      </div>
                  ) : (
                      <EmptyAnalysisState title="Audio Analysis" icon={Waves} />
                  )
              )}
              {/* DEBRIS TAB */}
              {activeTab === 'debris' && (
                  analysis?.debrisAnalysis ? (
                      <div className="space-y-6 animate-fade-in">
                          <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden flex flex-col items-center shadow-card"> <h4 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-6 w-full text-left flex items-center gap-2 font-mono"> <Share2 size={12} className="text-primary"/> Scatter Field Map </h4> <div className="relative w-64 h-64 border-2 border-borderStrong rounded-full bg-background"> {[1, 2, 3].map(i => ( <div key={i} className="absolute inset-0 m-auto rounded-full border border-border" style={{width: `${i*33}%`, height: `${i*33}%`}}></div> ))} <div className="absolute inset-0 m-auto w-full h-px bg-border"></div> <div className="absolute inset-0 m-auto h-full w-px bg-border"></div> <div className="absolute inset-0 m-auto w-3 h-3 bg-danger rounded-full shadow-lg z-10 border-2 border-white"></div> {ensureArray(analysis.debrisAnalysis.items).map((item, i) => { const angle = (item.relativePosition?.angle || Math.random() * 360) - 90; const dist = (item.relativePosition?.distance || 50) / 2; return ( <div key={i} className="absolute w-2 h-2 bg-textSecondary rounded-full cursor-pointer hover:scale-150 transition-transform z-20 shadow-sm hover:bg-textPrimary" style={{ top: `50%`, left: `50%`, transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${dist * 2.5}px) rotate(${-angle}deg)` }} title={item.id} /> ); })} </div> </div>
                          <div className="space-y-3"> <h4 className="text-[10px] font-bold text-textSecondary uppercase font-mono">Debris Inventory</h4> {ensureArray(analysis.debrisAnalysis.items).map((item, i) => ( <div key={i} className="bg-background border border-border rounded-lg p-3"> <div className="flex justify-between items-start"> <span className="text-xs font-bold text-textPrimary">{item.id}</span> <span className="text-[9px] font-mono text-textSecondary bg-white px-1.5 rounded border border-border">{item.velocityEstimate} Vel</span> </div> <div className="text-[10px] text-textTertiary mt-1">Origin: {item.originPoint}</div> </div> ))} </div>
                      </div>
                  ) : (
                      <EmptyAnalysisState title="Debris Analysis" icon={Share2} />
                  )
              )}
              {/* SYNTHESIS TAB */}
              {activeTab === 'synthesis' && (
                  analysis?.multiView ? (
                      <div className="space-y-6 animate-fade-in">
                          <div className="p-4 bg-background rounded-lg border border-border shadow-sm"> <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-2 font-mono flex items-center gap-2"> <Layers size={12}/> Synchronization Status </h4> <p className="text-xs text-textSecondary leading-relaxed"> {analysis.multiView.synchronizationNotes} </p> </div>
                          <div className="space-y-4"> {ensureArray(analysis.multiView.unifiedTimeline).map((ev, i) => ( <div key={i} className="flex gap-4"> <div className="flex flex-col items-center"> <div className="w-2 h-2 bg-primary rounded-full ring-4 ring-primaryLight/50"></div> {i < (ensureArray(analysis.multiView!.unifiedTimeline).length - 1) && <div className="w-0.5 flex-1 bg-border my-1"></div>} </div> <div className="pb-4 flex-1"> <div className="flex justify-between items-center mb-1"> <span className="text-[10px] font-mono font-bold text-textSecondary">{ev.timestamp}</span> <span className="text-[9px] bg-background text-textSecondary px-2 py-0.5 rounded-full border border-border">{ev.bestViewSource}</span> </div> <div className="bg-surface border border-border rounded-lg p-3 shadow-sm hover:border-primary/30 transition-colors"> <p className="text-xs text-textPrimary font-medium mb-2">{ev.description}</p> <div className="flex items-center gap-1.5 text-[9px] text-success"> <CheckCircle2 size={10}/> Corroboration: {ev.corroboration} </div> </div> </div> </div> ))} </div>
                      </div>
                  ) : (
                      <EmptyAnalysisState title="Multi-View Synthesis" icon={Layers} />
                  )
              )}
              {/* REFLECTIONS TAB */}
              {activeTab === 'reflections' && (
                  analysis?.reflectionAnalysis ? (
                      <div className="space-y-6 animate-fade-in">
                          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-5 text-primary"><Sparkles size={80}/></div>
                              <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-2 font-mono flex items-center gap-2">
                                  <Sparkles size={14} className="text-primary"/> Indirect Visual Evidence
                              </h4>
                              <p className="text-xs text-textPrimary leading-relaxed font-serif border-l-2 border-primary/50 pl-4 italic">
                                  "{analysis.reflectionAnalysis.summary}"
                              </p>
                          </div>
                          <div className="space-y-4">
                              {ensureArray(analysis.reflectionAnalysis.artifacts).map((art, i) => (
                                  <div key={i} className="bg-background border border-border rounded-lg p-4 hover:border-primary/30 transition-all cursor-pointer group" onClick={() => {
                                      const match = art.timestamp.match(/(\d{1,2}):(\d{2})(?:\.(\d+))?/);
                                      if (match) {
                                          const sec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseFloat(`0.${match[3]}`) : 0);
                                          handleSeek(sec);
                                      }
                                  }}>
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-mono text-primary bg-primaryLight/30 px-1.5 rounded border border-primaryLight">{art.timestamp}</span>
                                              <span className="text-xs font-bold text-textPrimary">{art.surface}</span>
                                          </div>
                                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                                              art.significance === 'Critical' ? 'bg-rose-100 text-rose-700' : 
                                              art.significance === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                          }`}>{art.significance}</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                              <div className="text-[9px] text-textTertiary uppercase font-bold mb-1">Observation</div>
                                              <p className="text-[11px] text-textSecondary leading-snug">{art.description}</p>
                                          </div>
                                          <div className="bg-surface rounded border border-border p-2">
                                              <div className="text-[9px] text-primary uppercase font-bold mb-1 flex items-center gap-1"><Search size={10}/> Forensic Insight</div>
                                              <p className="text-[11px] text-textPrimary font-medium leading-snug">{art.revealedInformation}</p>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : (
                      <EmptyAnalysisState title="Reflection Analysis" icon={Sparkles} />
                  )
              )}
              {/* FLEET SAFETY TAB */}
              {activeTab === 'fleet' && (
                  analysis?.fleetSafety ? (
                      <div className="space-y-6 animate-fade-in">
                          <div className="bg-surface border border-border rounded-xl p-6 shadow-card flex items-center justify-between"> <div> <h4 className="text-xs font-bold text-textSecondary uppercase font-mono tracking-wider mb-1">Overall Safety Score</h4> <div className="text-4xl font-mono font-bold text-textPrimary tracking-tighter">{analysis.fleetSafety.overallSafetyScore}<span className="text-lg text-textTertiary font-sans font-normal">/100</span></div> </div> <div className="h-16 w-16"> <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90"> <path className="text-background" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" /> <path className={`${analysis.fleetSafety.overallSafetyScore > 80 ? 'text-success' : analysis.fleetSafety.overallSafetyScore > 50 ? 'text-warning' : 'text-danger'}`} strokeDasharray={`${analysis.fleetSafety.overallSafetyScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" /> </svg> </div> </div>
                          {analysis.fleetSafety.riskVectors && ( <div className="bg-surface border border-border rounded-xl p-4 shadow-sm h-64 flex flex-col flex-1"> <h4 className="text-[10px] font-bold text-textSecondary uppercase mb-2 font-mono text-center">Driver Risk Profile</h4> <div className="flex-1 w-full min-h-0"><RiskRadarChart data={analysis.fleetSafety.riskVectors} /></div> </div> )}
                          <div className="space-y-3"> <h4 className="text-[10px] font-bold text-textSecondary uppercase font-mono">Corrective Actions</h4> {ensureArray(analysis.fleetSafety.trainingRecommendations).map((rec, i) => ( <div key={i} className="bg-background border-l-2 border-primary p-3 rounded-r-lg"> <div className="flex justify-between items-center mb-1"> <span className="text-xs font-bold text-textPrimary">{rec.module}</span> <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${rec.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>{rec.priority} Priority</span> </div> <p className="text-[10px] text-textSecondary">{rec.reason}</p> </div> ))} </div>
                      </div>
                  ) : (
                      <EmptyAnalysisState title="Fleet Safety" icon={ShieldAlert} />
                  )
              )}
          </div>
      </div>
    </div>
  );
};
