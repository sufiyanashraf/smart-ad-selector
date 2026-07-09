import { DemographicCounts } from '@/types/ad';
import { Users, User, UserCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAudienceWeights } from '@/hooks/useAdQueue';

interface CrowdCompositionProps {
  demographics: DemographicCounts;
  viewerCount: number;
}

const ageLabels: Record<string, { label: string; emoji: string; color: string }> = {
  child: { label: 'Child', emoji: '👶', color: 'bg-info text-info' },
  teen: { label: 'Teen', emoji: '🧑', color: 'bg-accent text-accent' },
  youngAdult: { label: 'Young', emoji: '🧑‍💼', color: 'bg-success text-success' },
  middleAged: { label: 'Mid', emoji: '👔', color: 'bg-warning text-warning' },
  senior: { label: 'Senior', emoji: '👴', color: 'bg-destructive text-destructive' },
};

export const CrowdComposition = ({ demographics, viewerCount }: CrowdCompositionProps) => {
  const weights = getAudienceWeights(demographics);
  const hasViewers = viewerCount > 0;

  // Summary text
  const getSummary = () => {
    if (!hasViewers) return 'Waiting for viewers...';
    if (viewerCount === 1) return '1 viewer detected';

    const genderDesc = weights.genderWeights.male > 0.65
      ? 'mostly male'
      : weights.genderWeights.female > 0.65
        ? 'mostly female'
        : 'mixed gender';

    const ageDesc = weights.ageWeights[weights.dominantAge] > 0.6
      ? ageLabels[weights.dominantAge]?.label.toLowerCase() || weights.dominantAge
      : 'mixed age';

    return `${viewerCount} viewers • ${genderDesc} • ${ageDesc}`;
  };

  return (
    <div className="glass-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <Users className={cn("h-4 w-4", hasViewers ? "text-primary" : "text-muted-foreground")} />
          Crowd Composition
        </h3>
        {hasViewers && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span className="text-xs font-display font-bold text-primary">{viewerCount}</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <p className={cn(
        "text-xs",
        hasViewers ? "text-foreground" : "text-muted-foreground"
      )}>
        {getSummary()}
      </p>

      {/* Gender Split Bar */}
      {hasViewers && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-primary font-medium">
              <User className="h-3 w-3" />
              Male {(weights.genderWeights.male * 100).toFixed(0)}%
            </span>
            <span className="flex items-center gap-1 text-accent font-medium">
              Female {(weights.genderWeights.female * 100).toFixed(0)}%
              <UserCircle2 className="h-3 w-3" />
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-l-full"
              style={{ width: `${weights.genderWeights.male * 100}%` }}
            />
            <div
              className="h-full bg-accent transition-all duration-500 ease-out rounded-r-full"
              style={{ width: `${weights.genderWeights.female * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Age Distribution Pills */}
      {hasViewers && (
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(ageLabels) as [string, typeof ageLabels[string]][]).map(([key, { label, emoji, color }]) => {
            const weight = weights.ageWeights[key as keyof typeof weights.ageWeights];
            const count = demographics[key as keyof DemographicCounts];
            const isActive = count > 0;
            const isDominant = key === weights.dominantAge && isActive;

            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-300 border",
                  isDominant
                    ? `${color.split(' ')[0]}/20 ${color.split(' ')[1]} border-current/30 ring-1 ring-current/20`
                    : isActive
                      ? `${color.split(' ')[0]}/10 ${color.split(' ')[1]} border-transparent`
                      : "bg-muted/30 text-muted-foreground border-transparent opacity-50"
                )}
              >
                <span>{emoji}</span>
                <span>{label}</span>
                {isActive && (
                  <span className="font-display font-bold ml-0.5">
                    {count}
                    <span className="text-[9px] font-normal opacity-70 ml-0.5">
                      ({(weight * 100).toFixed(0)}%)
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No viewers state */}
      {!hasViewers && (
        <div className="py-3 text-center">
          <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">No viewers in frame</p>
        </div>
      )}
    </div>
  );
};
