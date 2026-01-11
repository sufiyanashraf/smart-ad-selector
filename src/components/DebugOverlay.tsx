import { DetectionDebugInfo, TrackedFace } from '@/types/detection';
import { cn } from '@/lib/utils';

interface DebugOverlayProps {
  debug: DetectionDebugInfo | null;
  trackedFaces: TrackedFace[];
  show: boolean;
}

export const DebugOverlay = ({ debug, trackedFaces, show }: DebugOverlayProps) => {
  if (!show || !debug) return null;

  const getFpsColor = (fps: number) => {
    if (fps >= 10) return 'text-success';
    if (fps >= 5) return 'text-warning';
    return 'text-destructive';
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 100) return 'text-success';
    if (ms < 300) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-2 pointer-events-none z-20">
      {/* Main debug panel */}
      <div className="bg-background/90 backdrop-blur-sm rounded-lg border border-border p-2 text-xs font-mono space-y-1 max-w-xs">
        {/* Performance row */}
        <div className="flex items-center justify-between gap-4">
          <span className={cn('font-bold', getFpsColor(debug.fps))}>
            {debug.fps.toFixed(1)} FPS
          </span>
          <span className={cn(getLatencyColor(debug.latencyMs))}>
            {debug.latencyMs.toFixed(0)}ms
          </span>
          <span className="text-primary">
            {debug.backend.toUpperCase()}
          </span>
        </div>

        {/* Detection info */}
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
          <span className="px-1.5 py-0.5 bg-primary/20 rounded text-primary">
            {debug.detectorUsed.toUpperCase()}
          </span>
          <span>Pass {debug.passUsed}</span>
          {debug.preprocessing && (
            <span className="px-1.5 py-0.5 bg-accent/20 rounded text-accent">
              PREPROC
            </span>
          )}
          {debug.upscaled && (
            <span className="px-1.5 py-0.5 bg-warning/20 rounded text-warning">
              UPSCALE
            </span>
          )}
          {debug.roiActive && (
            <span className="px-1.5 py-0.5 bg-info/20 rounded text-info">
              ROI
            </span>
          )}
        </div>

        {/* Counts */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>Raw: {debug.rawDetections}</span>
          <span>Filtered: {debug.filteredDetections}</span>
          <span className="text-foreground font-bold">
            Tracked: {debug.trackedFaces}
          </span>
        </div>

        {/* Frame size */}
        <div className="text-muted-foreground">
          Frame: {debug.frameSize.width}×{debug.frameSize.height}
        </div>

        {/* Per-face details */}
        {trackedFaces.length > 0 && (
          <div className="pt-1 border-t border-border space-y-1">
            <span className="text-muted-foreground">Tracked Faces:</span>
            {trackedFaces.slice(0, 5).map((face, i) => (
              <div 
                key={face.id} 
                className="flex items-center gap-2 text-[10px] bg-muted/50 rounded px-1 py-0.5"
              >
                <span className="text-primary font-bold">#{i + 1}</span>
                <span>{face.gender === 'male' ? '♂' : '♀'}</span>
                <span>{face.ageGroup}</span>
                <span className={cn(
                  face.faceScore >= 0.5 ? 'text-success' : 
                  face.faceScore >= 0.35 ? 'text-warning' : 'text-destructive'
                )}>
                  {(face.faceScore * 100).toFixed(0)}%
                </span>
                <span className="text-muted-foreground">
                  {face.boundingBox.width.toFixed(0)}×{face.boundingBox.height.toFixed(0)}px
                </span>
                <span className={cn(
                  'ml-auto',
                  face.detectorUsed === 'ssd' ? 'text-accent' : 'text-primary'
                )}>
                  {face.detectorUsed}
                </span>
              </div>
            ))}
            {trackedFaces.length > 5 && (
              <div className="text-muted-foreground text-[10px]">
                +{trackedFaces.length - 5} more...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
