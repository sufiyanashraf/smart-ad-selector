import { DemographicCounts, DetectionResult } from '@/types/ad';
import { Users, User, UserCircle2, Baby, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemographicStatsProps {
  demographics: DemographicCounts;
  recentDetections: DetectionResult[];
  isCapturing: boolean;
}

export const DemographicStats = ({
  demographics,
  recentDetections,
  isCapturing,
}: DemographicStatsProps) => {
  const totalGender = demographics.male + demographics.female;
  const totalAge = demographics.young + demographics.adult;

  const malePercent = totalGender > 0 ? (demographics.male / totalGender) * 100 : 50;
  const youngPercent = totalAge > 0 ? (demographics.young / totalAge) * 100 : 50;

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
            {totalGender} detected
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<User className="h-5 w-5" />}
            label="Male"
            value={demographics.male}
            color="primary"
            isActive={demographics.male >= demographics.female}
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
            {totalAge} detected
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Baby className="h-5 w-5" />}
            label="Young"
            sublabel="< 35 years"
            value={demographics.young}
            color="success"
            isActive={demographics.young >= demographics.adult}
          />
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Adult"
            sublabel="≥ 35 years"
            value={demographics.adult}
            color="warning"
            isActive={demographics.adult > demographics.young}
          />
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-success to-warning transition-all duration-500"
            style={{ width: `${youngPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{youngPercent.toFixed(0)}% Young</span>
          <span>{(100 - youngPercent).toFixed(0)}% Adult</span>
        </div>
      </div>

      {/* Recent Detections */}
      {recentDetections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm text-muted-foreground">Recent Detections</h4>
          <div className="flex flex-wrap gap-2">
            {recentDetections.slice(0, 5).map((det, i) => (
              <div
                key={i}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 animate-slide-up",
                  det.gender === 'male' 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-accent/20 text-accent'
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Users className="h-3 w-3" />
                <span className="capitalize">{det.gender}</span>
                <span className="text-muted-foreground">•</span>
                <span>{det.age}y</span>
                <span className="text-muted-foreground/60">
                  ({(det.confidence * 100).toFixed(0)}%)
                </span>
              </div>
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
  color: 'primary' | 'accent' | 'success' | 'warning';
  isActive: boolean;
}

const StatCard = ({ icon, label, sublabel, value, color, isActive }: StatCardProps) => {
  const colorClasses = {
    primary: 'text-primary bg-primary/10 border-primary/30',
    accent: 'text-accent bg-accent/10 border-accent/30',
    success: 'text-success bg-success/10 border-success/30',
    warning: 'text-warning bg-warning/10 border-warning/30',
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all duration-300",
      isActive 
        ? colorClasses[color]
        : "bg-muted/50 border-border text-muted-foreground"
    )}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <div>
          <span className="font-medium">{label}</span>
          {sublabel && (
            <span className="block text-[10px] opacity-70">{sublabel}</span>
          )}
        </div>
      </div>
      <div className={cn(
        "text-3xl font-display font-bold",
        isActive && "animate-count"
      )}>
        {value}
      </div>
    </div>
  );
};
