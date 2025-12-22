import { RefObject } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebcamPreviewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
  isCapturing: boolean;
}

export const WebcamPreview = ({
  videoRef,
  isActive,
  hasPermission,
  error,
  isCapturing,
}: WebcamPreviewProps) => {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          {isActive ? (
            <Camera className="h-4 w-4 text-primary" />
          ) : (
            <CameraOff className="h-4 w-4 text-muted-foreground" />
          )}
          Webcam Feed
        </h3>
        
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
          isCapturing 
            ? "bg-destructive/20 text-destructive"
            : isActive 
              ? "bg-success/20 text-success"
              : "bg-muted text-muted-foreground"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            isCapturing 
              ? "bg-destructive animate-pulse"
              : isActive 
                ? "bg-success"
                : "bg-muted-foreground"
          )} />
          {isCapturing ? 'Scanning' : isActive ? 'Ready' : 'Off'}
        </div>
      </div>

      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        <video
          ref={videoRef}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isActive ? "opacity-100" : "opacity-0"
          )}
          playsInline
          muted
        />
        
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {error ? (
              <>
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-xs text-destructive text-center px-4">
                  {error}
                </p>
              </>
            ) : hasPermission === false ? (
              <>
                <CameraOff className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Camera access denied
                </p>
              </>
            ) : (
              <>
                <CameraOff className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Camera off (saves resources)
                </p>
              </>
            )}
          </div>
        )}

        {isCapturing && (
          <>
            <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse" />
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-destructive px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
              <span className="text-[10px] font-bold text-destructive-foreground">REC</span>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Camera activates only during capture window
      </p>
    </div>
  );
};
