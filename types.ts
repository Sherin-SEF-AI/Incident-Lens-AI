
export enum AnalysisPhase {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING_VIDEO = 'PROCESSING_VIDEO',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export type ConfidenceLevel = 'High' | 'Moderate' | 'Low' | 'Insufficient';

export interface Entity {
  id: string;
  type: string;
  description: string;
  color: string;
}

export interface TimelineEvent {
  timestamp: string;
  source?: string;
  description: string;
  type: 'info' | 'critical' | 'impact';
  confidence?: ConfidenceLevel; // Added confidence to timeline
  relatedEntityId?: string; // ID of the entity mainly involved in this event
}

export interface RuleViolation {
  rule: string; // e.g. "Failure to Yield"
  description: string; // Context specific
  timestamp: string; // Evidence citation
  severity: 'Critical' | 'Major' | 'Minor';
}

export interface FaultAllocation {
  party: string;
  percentage: number;
  reasoning: string;
  violations: RuleViolation[];
  causalContribution: string;
  confidence: ConfidenceLevel; // Strict typing
}

export interface SourceInfo {
  id: string;
  type: string;
  features: string;
}

// --- Authenticity Verification Types (New) ---

export interface ConsistencyCheck {
  status: 'Pass' | 'Fail' | 'Inconclusive';
  observation: string; // e.g. "No frame skips detected"
  anomalies: string[]; // e.g. ["Shadow jump at 00:04", "Ghosting artifact"]
  confidence: ConfidenceLevel;
}

export interface AuthenticityAnalysis {
  temporalContinuity: ConsistencyCheck;
  technicalConsistency: ConsistencyCheck;
  physicalConsistency: ConsistencyCheck;
  metadataAnalysis: ConsistencyCheck;
  overallAssessment: 'Verified Authentic' | 'Suspect' | 'Compromised' | 'Inconclusive';
  integrityScore: number; // 0-100
  summary: string;
}

// --- Environmental & Infrastructure Types (Phase 1) ---

export interface TrafficControl {
  type: string; // "Traffic Light", "Stop Sign", "Speed Limit", "Lane Marking"
  state: string; // "Red", "Green", "Solid Double Yellow", "n/a"
  location: string; // "Overhead", "Right Shoulder"
  detectedAt: string; // Timestamp
  relevance: 'Critical' | 'Contextual';
}

export interface EnvironmentalHazard {
  category: 'Road Surface' | 'Visibility' | 'Infrastructure' | 'Weather' | 'Obstruction';
  description: string; // e.g. "Sun glare blinding Eastbound traffic"
  severity: 'Critical' | 'Moderate' | 'Minor';
  contribution: 'Primary Cause' | 'Contributing Factor' | 'Negligible' | 'None';
  location: string; // e.g. "Intersection Center"
  remediation?: string; // e.g. "Install visor signals"
}

export interface EnvironmentalAnalysis {
  weather: {
    condition: string; // "Clear", "Rain", "Fog", "Snow"
    visibility: string; // "Good", "Reduced", "Poor", "Glare"
    sunAngle?: string; // "High", "Low", "Backlit"
  };
  road: {
    surfaceType: string; // "Asphalt", "Concrete", "Gravel"
    condition: string; // "Dry", "Wet", "Icy", "Debris"
    geometry: string; // "Straight", "Curved", "Intersection", "Hill"
  };
  lighting: string; // "Daylight", "Night (Streetlights)", "Dusk/Dawn"
  trafficControls: TrafficControl[];
  hazards: EnvironmentalHazard[]; // New Hazard Array
}

// --- Vehicle Identification & Spec Types (New) ---

export interface VehicleSpecs {
  length: string; // e.g. "4.6m"
  width: string;
  height: string;
  wheelbase: string; // Critical for physics calibration
  weight: string; // "1500kg"
  engine?: string; // "2.5L I4"
}

export interface IdentifiedVehicle {
  entityId: string; // Link to Entity.id (e.g. "Vehicle A")
  make: string;
  model: string;
  yearRange: string;
  trimLevel?: string; // "LE", "Sport"
  color: string;
  confidence: ConfidenceLevel;
  specs: VehicleSpecs;
  distinctiveFeatures: string[]; // "Aftermarket Rims", "Dent on fender", "Uber sticker"
  licensePlate?: string; // Partial or full reading
}

export interface VehicleAnalysis {
  vehicles: IdentifiedVehicle[];
  summary: string;
}

// --- Signal State Inference Types ---

export interface SignalEvidence {
  timestamp: string;
  type: 'Cross-Traffic' | 'Pedestrian' | 'Preceding Vehicle' | 'Opposing Traffic' | 'Shadow/Reflection' | 'Flow Logic';
  observation: string; // e.g., "Perpendicular traffic entering intersection"
  implication: string; // e.g., "Implies Subject Signal is RED"
  confidence: ConfidenceLevel;
}

export interface SignalInference {
  inferredState: 'Red' | 'Yellow' | 'Green' | 'Unknown';
  confidence: ConfidenceLevel;
  evidence: SignalEvidence[];
  reasoning: string;
  cycleEstimate?: {
    cycleDuration?: string;
    phase?: string; // e.g. "All-Red Phase"
  };
}

// --- Occupant Behavior & Micro-Expression Types ---

export interface OccupantState {
  timestamp: string;
  occupantId: string; // "Driver", "Passenger Front"
  attentionStatus: 'Focused' | 'Distracted' | 'Drowsy' | 'Incapacitated' | 'Unknown';
  gazeVector: string; // "Forward", "Down-Left (Phone)", "Rearview Mirror"
  handAction: string; // "Both on Wheel", "Right hand on device", "Gesturing"
  posture: string; // "Upright", "Leaning", "Bracing for Impact", "Whiplash Motion"
  facialExpression?: string; // "Neutral", "Surprise", "Fear", "Pain"
  confidence: ConfidenceLevel;
}

export interface OccupantAnalysis {
  summary: string;
  occupants: {
    id: string;
    role: string;
    states: OccupantState[];
    distractionScore: number; // 0-100 (0 = focused, 100 = completely distracted)
    reactionTime?: string; // "0.5s (Fast)"
  }[];
}

// --- Debris Trajectory & Scatter Analysis Types ---

export interface DebrisItem {
  id: string; // "Shard Cluster A"
  type: 'Glass' | 'Plastic' | 'Metal' | 'Fluid' | 'Dust' | 'Other';
  trajectoryVector: string; // "45 deg NE relative to vehicle heading"
  velocityEstimate: string; // "High (matches vehicle speed)"
  originPoint: string; // "Headlight Assembly"
  landingLocation: string; // "15ft North of Impact"
  // Polar coordinates for visualization (relative to impact center 0,0)
  relativePosition?: {
      angle: number; // 0-360 degrees
      distance: number; // 0-100 scale (100 = max observed distance)
  };
}

export interface ScatterPattern {
  shape: 'Cone' | 'Fan' | 'Circular' | 'Linear' | 'Chaotic';
  areaRadius: string; // "20ft"
  principalAxis: string; // "North-East"
  energyDissipation: string; // "High Kinetic Transfer"
}

export interface DebrisAnalysis {
  items: DebrisItem[];
  pattern: ScatterPattern;
  collisionGeometry: string; // e.g., "T-Bone Impact from East based on 90deg spray"
  confidence: ConfidenceLevel;
}

// --- Physics Engine Types ---

export interface PhysicsCalculation {
  method: string; // e.g. "Pixel-to-meter photogrammetry"
  referenceObject: string; // e.g. "Standard dashed lane line (10ft/3m)"
  reasoning: string; // Explanation of the math
}

export interface SpeedEstimate {
  entity: string;
  minSpeed: number;
  maxSpeed: number;
  unit: string;
  confidence: ConfidenceLevel; // Added confidence
  calculation?: PhysicsCalculation;
}

export interface MotionBlurMetric {
  entityId: string;
  timestamp: string;
  blurLengthPixels: number;
  blurDirection: string; // "Horizontal", "Diagonal"
  estimatedExposure: string; // "1/30s", "1/60s"
  calculatedSpeed: string; // "45 mph"
  confidence: ConfidenceLevel;
}

export interface StoppingAnalysis {
  entity: string;
  observedDistance: number;
  requiredDistance: number;
  unit: string;
  confidence: ConfidenceLevel; // Added confidence
  calculation?: PhysicsCalculation;
}

export interface PhysicsAnalysis {
  speedEstimates: SpeedEstimate[];
  stoppingAnalysis: StoppingAnalysis[];
  motionBlurMetrics?: MotionBlurMetric[]; 
}

// --- Predictive Damage Modeling Types (New) ---

export interface DamageZone {
  vehicleId: string;
  zone: string; // "Front Bumper", "Driver Side Door", "Rear Quarter Panel"
  predictedSeverity: 'Minor' | 'Moderate' | 'Severe' | 'Totaled'; // Based on physics
  observedSeverity: 'Minor' | 'Moderate' | 'Severe' | 'Totaled' | 'Not Visible'; // Based on visual
  matchStatus: 'Consistent' | 'Discrepancy' | 'Inconclusive';
  notes: string;
}

export interface DamagePhysics {
  kineticEnergyJoule: number; // 0.5 * m * v^2
  impactAngle: string; // "90 degrees"
  forceVector: string; // "Lateral from East"
  predictedCrumpleDepth: string; // "approx 30cm"
}

export interface DamageAnalysis {
  physics: DamagePhysics;
  zones: DamageZone[];
  secondaryOutcomes: {
      airbagDeployment: 'Predicted' | 'Not Predicted' | 'Unknown';
      glassBreakage: string; // "Side windows likely shattered"
      drivability: 'Driveable' | 'Disabled' | 'Unknown';
  };
  validationConclusion: {
      isConsistent: boolean;
      confidence: ConfidenceLevel;
      reasoning: string; // "Observed damage aligns with 45mph impact calculation"
  };
}

// --- Multi-Perspective Synthesis Types ---

export interface SourceReliability {
  sourceLabel: string;
  reliabilityScore: 'High' | 'Medium' | 'Low';
  coverageArea: string; // e.g. "Front 120-degree view"
  notes: string;
}

export interface SynthesisEvent {
  timestamp: string;
  description: string;
  bestViewSource: string; // Which camera saw it best
  corroboration: string; // "Confirmed by Source B" or "Only visible on Source A"
}

export interface MultiViewSynthesis {
  sourceAnalysis: SourceReliability[];
  unifiedTimeline: SynthesisEvent[];
  synchronizationNotes: string;
}

// --- Audio-Visual Fusion Types ---

export interface AudioEvent {
  timestamp: string;
  type: 'Tire Squeal' | 'Horn' | 'Impact' | 'Engine' | 'Voice' | 'Siren' | 'Other';
  description: string;
  significance: string; // e.g., "Indicates braking 1.2s before impact"
}

export interface AudioAnalysis {
  events: AudioEvent[];
  acoustics: {
    brakingIntensity?: string; // e.g. "Severe (Prolonged high-pitch squeal)"
    impactForce?: string; // e.g. "High Energy (Metal crunch + glass shatter)"
    hornUsage?: string; // e.g. "Repeated warning blasts"
    voiceAnalysis?: string; // e.g. "Driver shouted warning"
  };
}

// --- Reflection & Mirror Forensics Types ---

export interface ReflectionArtifact {
  timestamp: string;
  surface: 'Side Mirror' | 'Rearview Mirror' | 'Window Glass' | 'Wet Pavement' | 'Chrome/Metal' | 'Building Facade' | 'Other';
  description: string; // What surface is reflecting
  revealedInformation: string; // The forensic fact derived
  significance: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface ReflectionAnalysis {
  artifacts: ReflectionArtifact[];
  summary: string;
}

// --- Shadow Geometry & Integrity Types ---

export interface SunPosition {
  azimuth: string; // e.g. "SE (135deg)"
  elevation: string; // e.g. "45deg"
  primarySource: 'Sun' | 'Artificial' | 'Mixed';
}

export interface TimeVerification {
  claimedTime: string; // From video timestamp or metadata
  calculatedTime: string; // Derived from shadows
  discrepancy: string; // "None", "Significant (>1hr)", etc.
  confidence: ConfidenceLevel;
}

export interface ShadowArtifact {
  object: string; // "Vehicle A"
  shadowLength: string; // "1.5x object height"
  implication: string; // "Height est. 1.6m"
  consistency: 'Consistent' | 'Inconsistent' | 'Indeterminate';
}

export interface ShadowAnalysis {
  lightSource: SunPosition;
  timeVerification: TimeVerification;
  artifacts: ShadowArtifact[];
  consistencyScore: number; // 0-100
  notes: string;
}

// --- Fleet Safety & Risk Types ---

export interface DriverPerformanceMetric {
  metric: string; // e.g. "Reaction Time", "Following Distance"
  score: number; // 0-10 or 0-100
  status: 'Excellent' | 'Satisfactory' | 'Needs Improvement' | 'Critical';
  observation: string;
}

export interface TrainingRecommendation {
  module: string; // e.g. "Defensive Driving: Intersections"
  priority: 'High' | 'Medium' | 'Low';
  reason: string;
}

export interface SafetyTechnology {
  system: string; // e.g. "AEB (Autonomous Emergency Braking)"
  preventativeImpact: 'High' | 'Medium' | 'Low'; // Likelihood it would have prevented incident
  reasoning: string;
}

export interface FleetRiskPattern {
  pattern: string; // e.g. "Aggressive Merging"
  severity: 'High' | 'Medium' | 'Low';
  frequency?: string; 
}

export interface RiskVector {
  subject: string; // e.g., "Aggression", "Distraction", "Speeding", "Compliance", "Skill"
  A: number; // Score 0-100
  fullMark: number;
}

export interface FleetSafetyAnalysis {
  driverPerformance: DriverPerformanceMetric[];
  trainingRecommendations: TrainingRecommendation[];
  technologyRecommendations: SafetyTechnology[];
  riskPatterns: FleetRiskPattern[];
  riskVectors: RiskVector[]; // New for Radar Chart
  overallSafetyScore: number; // 0-100
}

// --- Confidence Engine Specific Types ---

export interface UncertaintyFactor {
  category: 'Video Quality' | 'Perspective' | 'Measurement' | 'Interpretive';
  description: string;
  impact: 'Critical' | 'Major' | 'Minor';
}

export interface AlternativeInterpretation {
  scenario: string;
  likelihood: string; // e.g. "25%"
  supportingEvidence: string;
}

export interface ConfidenceAssessment {
  overallScore: number; // 0-100
  overallLevel: ConfidenceLevel;
  confidenceStatement: string; // Summary statement
  
  // Breakdown by key analytical dimension
  metrics: {
    identification: ConfidenceLevel;
    timing: ConfidenceLevel;
    physics: ConfidenceLevel;
    causation: ConfidenceLevel;
  };

  uncertaintyFactors: UncertaintyFactor[];
  cascadeAnalysis: string; // Explain weakest link logic
  alternatives: AlternativeInterpretation[];
  improvementRecommendations: string[];
}

// --- Counterfactual Simulator Types ---

export interface CounterfactualScenario {
  question: string;
  outcome: string; // e.g. "Collision Avoided"
  reasoning: string;
  probability: 'High' | 'Moderate' | 'Low';
}

// --- Report Generator Specific Types ---

export interface GeneratedReports {
  executiveSummary: string; // Markdown content
  technicalReport: string; // Markdown content
  insuranceClaimReport: string; // Markdown content
  legalBrief: string; // Markdown content
  fleetSafetyReport: string; // Markdown content
}

// -------------------------------------

export interface RoiAnalysis {
  question: string;
  answer: string;
  confidence: string;
  details: string;
}

export interface IncidentAnalysis {
  sources: SourceInfo[];
  timeline: TimelineEvent[];
  entities: Entity[];
  fault: {
    allocations: FaultAllocation[];
    confidence: ConfidenceLevel;
    summary: string;
  };
  
  // Specific Engine Outputs
  reports?: GeneratedReports;
  confidenceReport?: ConfidenceAssessment;
  physics?: PhysicsAnalysis;
  damageAnalysis?: DamageAnalysis; // NEW: Predictive Damage
  multiView?: MultiViewSynthesis;
  audioAnalysis?: AudioAnalysis; 
  reflectionAnalysis?: ReflectionAnalysis; 
  shadowAnalysis?: ShadowAnalysis;
  environmental?: EnvironmentalAnalysis; 
  occupantAnalysis?: OccupantAnalysis; 
  debrisAnalysis?: DebrisAnalysis;
  signalInference?: SignalInference; 
  vehicleAnalysis?: VehicleAnalysis; 
  fleetSafety?: FleetSafetyAnalysis; 
  counterfactuals?: CounterfactualScenario[];
  authenticity?: AuthenticityAnalysis; 
  chainOfEvents?: string; // NEW: Formal Narrative
  
  executiveSummary: string; // Legacy/Quick summary
  rawAnalysis: string;
  groundingMetadata?: any; // For Search Tool results
  
  // Optional Legacy/Other Engine Fields for compatibility
  legal?: any;
  synchronization?: any;
  multiPerspectiveInsights?: string;
}

export interface VideoFrame {
  data: string; // Base64
  timestamp: number;
}

export interface VideoSource {
  id: string;
  url: string;
  file?: File;
  name: string;
}
