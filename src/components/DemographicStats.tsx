import { DemographicCounts, DetectionResult, EmotionType } from '@/types/ad';
import { Users, User, UserCircle2, Baby, Briefcase, AlertTriangle, Smile, Heart, Frown, Angry, Zap, Eye, EyeOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDwellTime } from '@/utils/headPoseEstimation';

interface DemographicStatsProps {
  demographics: DemographicCounts;
  recentDetections: DetectionResult[];
  isCapturing: boolean;
  enableAdvancedAI?: boolean;
}

export const DemographicStats = ({
  demographics,
  recentDetections,
  isCapturing,
  enableAdvancedAI = true,
}: DemographicStatsProps) => {
  const totalGender = demographics.male + demographics.female;
  const totalAge = demographics.child + demographics.teen + demographics.youngAdult + demographics.middleAged + demographics.senior;

  const malePercent = totalGender > 0 ? (demographics.male / totalGender) * 100 : 50;
  const childPercent = totalAge > 0 ? (demographics.child / totalAge) * 100 : 20;
  const teenPercent = totalAge > 0 ? (demographics.teen / totalAge) * 100 : 20;
  const youngAdultPercent = totalAge > 0 ? (demographics.youngAdult / totalAge) * 100 : 20;
  const middleAgedPercent = totalAge > 0 ? (demographics.middleAged / totalAge) * 100 : 20;
  const seniorPercent = totalAge > 0 ? (demographics.senior / totalAge) * 100 : 20;

  // Get average confidence
  const avgConfidence = recentDetections.length > 0 
    ? recentDetections.reduce((sum, d) => sum + d.confidence, 0) / recentDetections.length
    : 0;

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Audience Demographics</h3>
        <div className={cn(
          "flex items-center gap-2 transition-colors",
          isCapturing ? "text-primary" : "text-muted-foreground"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isCapturing ? "bg-primary animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="text-sm font-medium">
            {isCapturing ? 'Live' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Gender Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Gender Distribution</span>
          <span className="font-display font-medium">
            {totalGender} viewer{totalGender !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<User className="h-5 w-5" />}
            label="Male"
            value={demographics.male}
            color="primary"
            isActive={demographics.male >= demographics.female && totalGender > 0}
          />
          <StatCard
            icon={<UserCircle2 className="h-5 w-5" />}
            label="Female"
            value={demographics.female}
            color="accent"
            isActive={demographics.female > demographics.male}
          />
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${malePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{malePercent.toFixed(0)}% Male</span>
          <span>{(100 - malePercent).toFixed(0)}% Female</span>
        </div>
      </div>

      {/* Age Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Age Distribution</span>
          <span className="font-display font-medium">
            {totalAge} viewer{totalAge !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          <StatCard
            icon={<Smile className="h-5 w-5" />}
            label="Child"
            sublabel="< 13 yrs"
            value={demographics.child}
            color="info"
            isActive={demographics.child > 0 && demographics.child >= demographics.teen && demographics.child >= demographics.youngAdult && demographics.child >= demographics.middleAged && demographics.child >= demographics.senior}
          />
          <StatCard
            icon={<Baby className="h-5 w-5" />}
            label="Teen"
            sublabel="13-17 yrs"
            value={demographics.teen}
            color="accent"
            isActive={demographics.teen > 0 && demographics.teen >= demographics.child && demographics.teen >= demographics.youngAdult && demographics.teen >= demographics.middleAged && demographics.teen >= demographics.senior}
          />
          <StatCard
            icon={<Baby className="h-5 w-5" />}
            label="Young"
            sublabel="18-34 yrs"
            value={demographics.youngAdult}
            color="success"
            isActive={demographics.youngAdult > 0 && demographics.youngAdult >= demographics.child && demographics.youngAdult >= demographics.teen && demographics.youngAdult >= demographics.middleAged && demographics.youngAdult >= demographics.senior}
          />
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Mid-Age"
            sublabel="35-54 yrs"
            value={demographics.middleAged}
            color="warning"
            isActive={demographics.middleAged > 0 && demographics.middleAged >= demographics.child && demographics.middleAged >= demographics.teen && demographics.middleAged >= demographics.youngAdult && demographics.middleAged >= demographics.senior}
          />
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Senior"
            sublabel="55+ yrs"
            value={demographics.senior}
            color="warning"
            isActive={demographics.senior > 0 && demographics.senior >= demographics.child && demographics.senior >= demographics.teen && demographics.senior >= demographics.youngAdult && demographics.senior >= demographics.middleAged}
          />
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-info transition-all duration-500"
            style={{ width: `${childPercent}%` }}
          />
          <div 
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${teenPercent}%` }}
          />
          <div 
            className="h-full bg-success transition-all duration-500"
            style={{ width: `${youngAdultPercent}%` }}
          />
          <div 
            className="h-full bg-warning transition-all duration-500"
            style={{ width: `${middleAgedPercent}%` }}
          />
          <div 
            className="h-full bg-destructive transition-all duration-500"
            style={{ width: `${seniorPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{childPercent.toFixed(0)}% Child</span>
          <span>{teenPercent.toFixed(0)}% Teen</span>
          <span>{youngAdultPercent.toFixed(0)}% Young</span>
          <span>{middleAgedPercent.toFixed(0)}% Mid</span>
          <span>{seniorPercent.toFixed(0)}% Senior</span>
        </div>
      </div>

      {/* Emotion Stats - Only show if Advanced AI is enabled */}
      {enableAdvancedAI && <EmotionDistribution detections={recentDetections} />}

      {/* Attention Metrics - Only show if Advanced AI is enabled */}
      {enableAdvancedAI && <AttentionMetricsSection detections={recentDetections} />}

      {/* Recent Detections with Confidence */}
      {recentDetections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-muted-foreground">Current Viewers</h4>
            <ConfidenceBadge confidence={avgConfidence} />
          </div>
          <div className="flex flex-wrap gap-2">
            {recentDetections.map((det, i) => (
              <DetectionBadge key={i} detection={det} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  value: number;
  color: 'primary' | 'accent' | 'success' | 'warning' | 'info';
  isActive: boolean;
}

const StatCard = ({ icon, label, sublabel, value, color, isActive }: StatCardProps) => {
  const colorClasses = {
    primary: 'text-primary bg-primary/10 border-primary/30',
    accent: 'text-accent bg-accent/10 border-accent/30',
    success: 'text-success bg-success/10 border-success/30',
    warning: 'text-warning bg-warning/10 border-warning/30',
    info: 'text-info bg-info/10 border-info/30',
  };

  return (
    <div className={cn(
      "p-3 rounded-xl border-2 transition-all duration-300",
      isActive 
        ? colorClasses[color]
        : "bg-muted/50 border-border text-muted-foreground"
    )}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <div>
          <span className="font-medium text-sm">{label}</span>
          {sublabel && (
            <span className="block text-[10px] opacity-70">{sublabel}</span>
          )}
        </div>
      </div>
      <div className={cn(
        "text-2xl font-display font-bold",
        isActive && "animate-count"
      )}>
        {value}
      </div>
    </div>
  );
};

interface DetectionBadgeProps {
  detection: DetectionResult;
  index: number;
}

const DetectionBadge = ({ detection, index }: DetectionBadgeProps) => {
  const isLowConfidence = detection.confidence < 0.75;
  const isMediumConfidence = detection.confidence >= 0.75 && detection.confidence < 0.85;
  
  const getAgeGroupColor = () => {
    switch (detection.ageGroup) {
      case 'child': return 'text-info';
      case 'teen': return 'text-accent';
      case 'youngAdult': return 'text-success';
      case 'middleAged': return 'text-warning';
      case 'senior': return 'text-destructive';
    }
  };

  return (
    <div
      className={cn(
        "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 animate-slide-up border",
        detection.gender === 'male' 
          ? 'bg-primary/10 border-primary/30' 
          : 'bg-accent/10 border-accent/30',
        isLowConfidence && 'opacity-60 border-dashed',
        isMediumConfidence && 'opacity-80'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isLowConfidence && (
        <AlertTriangle className="h-3 w-3 text-warning" />
      )}
      <Users className={cn(
        "h-3 w-3",
        detection.gender === 'male' ? 'text-primary' : 'text-accent'
      )} />
      <span className={cn(
        "capitalize",
        detection.gender === 'male' ? 'text-primary' : 'text-accent'
      )}>
        {detection.gender}
      </span>
      <span className="text-muted-foreground">•</span>
      <span className={cn("capitalize", getAgeGroupColor())}>
        {detection.ageGroup}
      </span>
      {detection.emotion && detection.emotion !== 'neutral' && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className="text-xs" title={`Emotion: ${detection.emotion}`}>
            {getEmotionEmojiSmall(detection.emotion)}
          </span>
        </>
      )}
      <span className={cn(
        "ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
        detection.confidence >= 0.85 
          ? 'bg-success/20 text-success'
          : detection.confidence >= 0.75
            ? 'bg-warning/20 text-warning'
            : 'bg-destructive/20 text-destructive'
      )}>
        {(detection.confidence * 100).toFixed(0)}%
      </span>
    </div>
  );
};

interface ConfidenceBadgeProps {
  confidence: number;
}

const ConfidenceBadge = ({ confidence }: ConfidenceBadgeProps) => {
  const getLabel = () => {
    if (confidence >= 0.85) return 'High Confidence';
    if (confidence >= 0.75) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      confidence >= 0.85 
        ? 'bg-success/20 text-success'
        : confidence >= 0.75
          ? 'bg-warning/20 text-warning'
          : 'bg-destructive/20 text-destructive'
    )}>
      {confidence < 0.75 && <AlertTriangle className="h-3 w-3" />}
      <span>{getLabel()}</span>
      <span className="font-bold">{(confidence * 100).toFixed(0)}%</span>
    </div>
  );
};

// Emotion emoji helper for detection badges
const getEmotionEmojiSmall = (emotion?: EmotionType): string => {
  switch (emotion) {
    case 'happy': return '😊';
    case 'sad': return '😢';
    case 'angry': return '😠';
    case 'fearful': return '😨';
    case 'disgusted': return '🤢';
    case 'surprised': return '😲';
    case 'neutral': return '😐';
    default: return '';
  }
};

// Emotion Distribution sub-component
const EmotionDistribution = ({ detections }: { detections: DetectionResult[] }) => {
  if (detections.length === 0) return null;

  // Count emotions from current viewers
  const emotionCounts: Record<EmotionType, number> = {
    neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0,
  };

  detections.forEach(d => {
    if (d.emotion) {
      emotionCounts[d.emotion]++;
    }
  });

  const total = detections.length;
  const emotionEntries: { key: EmotionType; count: number; emoji: string; color: string }[] = [
    { key: 'happy', count: emotionCounts.happy, emoji: '😊', color: 'bg-green-500' },
    { key: 'neutral', count: emotionCounts.neutral, emoji: '😐', color: 'bg-gray-400' },
    { key: 'surprised', count: emotionCounts.surprised, emoji: '😲', color: 'bg-yellow-500' },
    { key: 'sad', count: emotionCounts.sad, emoji: '😢', color: 'bg-blue-500' },
    { key: 'angry', count: emotionCounts.angry, emoji: '😠', color: 'bg-red-500' },
    { key: 'fearful', count: emotionCounts.fearful, emoji: '😨', color: 'bg-purple-500' },
    { key: 'disgusted', count: emotionCounts.disgusted, emoji: '🤢', color: 'bg-emerald-700' },
  ];

  // Find dominant emotion
  const dominant = emotionEntries.reduce((a, b) => a.count >= b.count ? a : b);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Emotion Distribution</span>
        <span className="font-display font-medium flex items-center gap-1">
          <span className="text-lg">{dominant.emoji}</span>
          <span className="capitalize">{dominant.key}</span>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {emotionEntries.map(({ key, count, emoji }) => (
          <div
            key={key}
            className={cn(
              "p-2 rounded-lg text-center transition-all duration-300 border",
              count > 0
                ? "bg-primary/10 border-primary/30"
                : "bg-muted/50 border-border text-muted-foreground"
            )}
          >
            <div className="text-lg">{emoji}</div>
            <div className={cn(
              "text-lg font-display font-bold",
              count > 0 && "animate-count"
            )}>
              {count}
            </div>
            <div className="text-[9px] capitalize text-muted-foreground">{key}</div>
          </div>
        ))}
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        {emotionEntries.map(({ key, count, color }) => (
          <div
            key={key}
            className={cn("h-full transition-all duration-500", color)}
            style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {emotionEntries.filter(e => e.count > 0).map(({ key, count, emoji }) => (
          <span key={key}>{emoji} {total > 0 ? ((count / total) * 100).toFixed(0) : 0}%</span>
        ))}
      </div>
    </div>
  );
};

// Attention Metrics sub-component
const AttentionMetricsSection = ({ detections }: { detections: DetectionResult[] }) => {
  if (detections.length === 0) return null;

  const attending = detections.filter(d => d.attentionState === 'attending').length;
  const distracted = detections.filter(d => d.attentionState === 'distracted').length;
  const away = detections.filter(d => d.attentionState === 'away').length;
  const total = detections.length;

  // Average dwell time
  const avgDwell = detections.reduce((sum, d) => sum + (d.dwellTimeMs || 0), 0) / total;
  
  // Average attention percentage
  const avgAttention = detections.reduce((sum, d) => sum + (d.attentionPercent || 0), 0) / total;

  const attendPercent = total > 0 ? (attending / total) * 100 : 0;
  const distractedPercent = total > 0 ? (distracted / total) * 100 : 0;
  const awayPercent = total > 0 ? (away / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Attention Metrics</span>
        <span className="font-display font-medium flex items-center gap-1">
          <Eye className="h-4 w-4 text-green-500" />
          <span>{attending}/{total} attending</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className={cn(
          "p-2.5 rounded-lg text-center border transition-all duration-300",
          attending > 0 ? "bg-green-500/10 border-green-500/30" : "bg-muted/50 border-border"
        )}>
          <div className="text-lg">👀</div>
          <div className={cn("text-xl font-display font-bold", attending > 0 && "text-green-500")}>
            {attending}
          </div>
          <div className="text-[10px] text-muted-foreground">Attending</div>
        </div>
        <div className={cn(
          "p-2.5 rounded-lg text-center border transition-all duration-300",
          distracted > 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-muted/50 border-border"
        )}>
          <div className="text-lg">👁️</div>
          <div className={cn("text-xl font-display font-bold", distracted > 0 && "text-yellow-500")}>
            {distracted}
          </div>
          <div className="text-[10px] text-muted-foreground">Distracted</div>
        </div>
        <div className={cn(
          "p-2.5 rounded-lg text-center border transition-all duration-300",
          away > 0 ? "bg-red-500/10 border-red-500/30" : "bg-muted/50 border-border"
        )}>
          <div className="text-lg">🚫</div>
          <div className={cn("text-xl font-display font-bold", away > 0 && "text-red-500")}>
            {away}
          </div>
          <div className="text-[10px] text-muted-foreground">Away</div>
        </div>
      </div>

      {/* Dwell Time & Attention % */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            Avg Dwell Time
          </div>
          <div className="text-sm font-display font-bold">
            {formatDwellTime(Math.round(avgDwell))}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Eye className="h-3 w-3" />
            Avg Attention
          </div>
          <div className="text-sm font-display font-bold">
            {avgAttention.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Attention bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${attendPercent}%` }}
        />
        <div
          className="h-full bg-yellow-500 transition-all duration-500"
          style={{ width: `${distractedPercent}%` }}
        />
        <div
          className="h-full bg-red-500 transition-all duration-500"
          style={{ width: `${awayPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>👀 {attendPercent.toFixed(0)}%</span>
        <span>👁️ {distractedPercent.toFixed(0)}%</span>
        <span>🚫 {awayPercent.toFixed(0)}%</span>
      </div>
    </div>
  );
};

