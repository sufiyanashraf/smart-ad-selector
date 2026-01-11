import { RefObject, useRef, useEffect } from 'react';
import { Camera, CameraOff, AlertCircle, Monitor, FileVideo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetectionResult } from '@/types/ad';
import { InputSourceMode } from '@/hooks/useWebcam';

interface WebcamPreviewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
  isCapturing: boolean;
  detections?: DetectionResult[];
  inputMode?: InputSourceMode;
  videoFileName?: string | null;
}

export const WebcamPreview = ({
  videoRef,
  isActive,
  hasPermission,
  error,
  isCapturing,
  detections = [],
  inputMode = 'webcam',
  videoFileName,
}: WebcamPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getSourceIcon = () => {
    if (!isActive) return <CameraOff className="h-4 w-4 text-muted-foreground" />;
    switch (inputMode) {
      case 'webcam':
        return <Camera className="h-4 w-4 text-primary" />;
      case 'video':
        return <FileVideo className="h-4 w-4 text-primary" />;
      case 'screen':
        return <Monitor className="h-4 w-4 text-primary" />;
    }
  };

  const getSourceLabel = () => {
    switch (inputMode) {
      case 'webcam':
        return 'Webcam Feed';
      case 'video':
        return videoFileName ? `Video: ${videoFileName.slice(0, 20)}${videoFileName.length > 20 ? '...' : ''}` : 'Video File';
      case 'screen':
        return 'Screen Capture';
    }
  };

  // Draw bounding boxes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to video dimensions
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isActive || detections.length === 0) return;

    // Get scale factors
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const scaleX = rect.width / videoWidth;
    const scaleY = rect.height / videoHeight;

    // Draw bounding boxes for each detection
    detections.forEach((detection) => {
      if (!detection.boundingBox) return;

      const { x, y, width, height } = detection.boundingBox;
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;

      const css = getComputedStyle(document.documentElement);
      const getHsl = (varName: string, fallback: string) => {
        const v = css.getPropertyValue(varName).trim();
        return v ? `hsl(${v})` : fallback;
      };
      const getHslA = (varName: string, alpha: number, fallback: string) => {
        const v = css.getPropertyValue(varName).trim();
        return v ? `hsl(${v} / ${alpha})` : fallback;
      };

      // Determine color based on confidence
      const isLowConfidence = detection.confidence < 0.75;
      const isMedConfidence = detection.confidence >= 0.75 && detection.confidence < 0.85;

      const highColor = getHsl('--success', 'hsl(142 71% 45%)');
      const midColor = getHsl('--primary', 'hsl(220 90% 60%)');
      const lowColor = getHsl('--destructive', 'hsl(0 84% 60%)');

      const boxColor = isLowConfidence ? lowColor : isMedConfidence ? midColor : highColor;
      const bgColor = isLowConfidence
        ? getHslA('--destructive', 0.2, 'hsl(0 84% 60% / 0.2)')
        : isMedConfidence
          ? getHslA('--primary', 0.2, 'hsl(220 90% 60% / 0.2)')
          : getHslA('--success', 0.2, 'hsl(142 71% 45% / 0.2)');

      // Draw bounding box
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw semi-transparent fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw label background
      const label = `${detection.gender === 'male' ? '♂' : '♀'} ${detection.ageGroup} ${(detection.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 12px sans-serif';
      const labelWidth = ctx.measureText(label).width + 10;
      const labelHeight = 20;

      ctx.fillStyle = boxColor;
      ctx.fillRect(scaledX, scaledY - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = getHsl('--primary-foreground', 'hsl(0 0% 100%)');
      ctx.textBaseline = 'middle';
      ctx.fillText(label, scaledX + 5, scaledY - labelHeight / 2);

      // Draw gender icon at bottom
      const genderIcon = detection.gender === 'male' ? 'MALE' : 'FEMALE';
      const ageGroup = detection.ageGroup.toUpperCase();
      const bottomLabel = `${genderIcon} • ${ageGroup}`;

      const bottomLabelWidth = ctx.measureText(bottomLabel).width + 10;
      ctx.fillStyle = getHslA('--background', 0.7, 'hsl(0 0% 0% / 0.7)');
      ctx.fillRect(scaledX, scaledY + scaledHeight, bottomLabelWidth, labelHeight);

      ctx.fillStyle = boxColor;
      ctx.fillText(bottomLabel, scaledX + 5, scaledY + scaledHeight + labelHeight / 2);
    });
  }, [detections, isActive, videoRef]);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          {getSourceIcon()}
          {getSourceLabel()}
          {detections.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
              {detections.length} face{detections.length !== 1 ? 's' : ''}
            </span>
          )}
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
        
        {/* Canvas overlay for bounding boxes */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
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
        {isActive && detections.length > 0 
          ? `Detecting ${detections.length} person(s) with bounding boxes`
          : inputMode === 'webcam' 
            ? 'Use dropdown to select webcam, video file, or screen capture'
            : `${inputMode === 'video' ? 'Video file' : 'Screen capture'} mode - select source from dropdown`
        }
      </p>
    </div>
  );
};
