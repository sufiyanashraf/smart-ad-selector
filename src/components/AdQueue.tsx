import { AdMetadata, AdScore } from '@/types/ad';
import { List, Play, User, UserCircle2, Baby, Briefcase, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdQueueProps {
  queue: AdMetadata[];
  currentAdId: string | null;
  adScores?: AdScore[];
}

export const AdQueue = ({ queue, currentAdId, adScores = [] }: AdQueueProps) => {
  // Build a score lookup map
  const scoreMap = new Map<string, AdScore>();
  for (const s of adScores) {
    scoreMap.set(s.ad.id, s);
  }

  // Compute max score for normalization (score → percentage)
  const maxScore = adScores.length > 0
    ? Math.max(...adScores.map(s => s.score), 1)
    : 1;

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          Ad Queue
        </h3>
        <span className="text-sm text-muted-foreground">
          {queue.length} ads
        </span>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin">
        {queue.map((ad, index) => {
          const isPlaying = ad.id === currentAdId;
          const adScore = scoreMap.get(ad.id);
          const matchPercent = adScore ? Math.max(0, Math.round((adScore.score / maxScore) * 100)) : null;
          const isTopMatch = index === 0 && adScores.length > 0;
          
          return (
            <div
              key={ad.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                isPlaying 
                  ? "bg-primary/20 border border-primary/40" 
                  : isTopMatch
                    ? "bg-success/10 border border-success/30"
                    : "bg-muted/50 hover:bg-muted"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold",
                isPlaying 
                  ? "bg-primary text-primary-foreground" 
                  : isTopMatch
                    ? "bg-success text-success-foreground"
                    : "bg-secondary text-secondary-foreground"
              )}>
                {isPlaying ? (
                  <Play className="h-4 w-4 fill-current" />
                ) : isTopMatch ? (
                  <Target className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium truncate",
                  isPlaying && "text-primary",
                  isTopMatch && !isPlaying && "text-success"
                )}>
                  {ad.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <TargetBadge 
                    type="gender" 
                    value={ad.gender} 
                  />
                  <TargetBadge 
                    type="age" 
                    value={ad.ageGroup} 
                  />
                  <span className="text-xs text-muted-foreground">
                    {ad.duration}s
                  </span>
                </div>
              </div>

              {/* Match Score Badge */}
              {matchPercent !== null && (
                <div
                  className={cn(
                    "flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-display font-bold",
                    matchPercent >= 80
                      ? "bg-success/20 text-success"
                      : matchPercent >= 50
                        ? "bg-warning/20 text-warning"
                        : "bg-muted text-muted-foreground"
                  )}
                  title={adScore?.reasons.join('\n')}
                >
                  {matchPercent}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Ads ranked by weighted audience match — proportional crowd targeting
        </p>
      </div>
    </div>
  );
};

interface TargetBadgeProps {
  type: 'gender' | 'age';
  value: string;
}

const TargetBadge = ({ type, value }: TargetBadgeProps) => {
  const getIcon = () => {
    if (type === 'gender') {
      return value === 'male' ? <User className="h-3 w-3" /> 
           : value === 'female' ? <UserCircle2 className="h-3 w-3" />
           : null;
    }
    return value === 'child' ? <Baby className="h-3 w-3" />
         : value === 'teen' ? <Baby className="h-3 w-3" />
         : value === 'youngAdult' ? <Baby className="h-3 w-3" /> 
         : value === 'middleAged' ? <Briefcase className="h-3 w-3" />
         : value === 'senior' ? <Briefcase className="h-3 w-3" />
         : null;
  };

  const getColor = () => {
    if (type === 'gender') {
      return value === 'male' ? 'bg-primary/20 text-primary'
           : value === 'female' ? 'bg-accent/20 text-accent'
           : 'bg-muted text-muted-foreground';
    }
    return value === 'child' ? 'bg-info/20 text-info'
         : value === 'teen' ? 'bg-accent/20 text-accent'
         : value === 'youngAdult' ? 'bg-success/20 text-success'
         : value === 'middleAged' ? 'bg-warning/20 text-warning'
         : value === 'senior' ? 'bg-destructive/20 text-destructive'
         : 'bg-muted text-muted-foreground';
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
      getColor()
    )}>
      {getIcon()}
      <span className="capitalize">{value}</span>
    </div>
  );
};
