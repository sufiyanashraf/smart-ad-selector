import { RefObject, useRef, useEffect, useState, useMemo } from 'react';
import { Camera, CameraOff, AlertCircle, Monitor, FileVideo, ZoomIn, ZoomOut, Maximize2, Check, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetectionResult } from '@/types/ad';
import { DetectionDebugInfo, TrackedFace } from '@/types/detection';
import { GroundTruthEntry } from '@/types/evaluation';
import { InputSourceMode } from '@/hooks/useWebcam';
import { Button } from '@/components/ui/button';
import { DebugOverlay } from '@/components/DebugOverlay';

interface WebcamPreviewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
  isCapturing: boolean;
  detections?: DetectionResult[];
  inputMode?: InputSourceMode;
  videoFileName?: string | null;
  debugMode?: boolean;
  debugInfo?: DetectionDebugInfo | null;
  trackedFaces?: TrackedFace[];
  /** Enable labeling mode for evaluation */
  labelingMode?: boolean;
  /** Callback when user labels a detection */
  onLabelDetection?: (entry: GroundTruthEntry) => void;
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
  debugMode = false,
  debugInfo = null,
  trackedFaces = [],
  labelingMode = false,
  onLabelDetection,
}: WebcamPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomMode, setZoomMode] = useState<'none' | 'auto' | 'manual'>('none');
  const [manualZoom, setManualZoom] = useState(1);
  const [labelingFace, setLabelingFace] = useState<string | null>(null);

  // Calculate zoom transform to focus on detected faces
  const zoomTransform = useMemo(() => {
    if (zoomMode === 'none' || detections.length === 0) {
      return { transform: 'none', origin: 'center center' };
    }

    const video = videoRef.current;
    if (!video) return { transform: 'none', origin: 'center center' };

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Find bounding box that encompasses all faces
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    detections.forEach(d => {
      if (d.boundingBox) {
        minX = Math.min(minX, d.boundingBox.x);
        minY = Math.min(minY, d.boundingBox.y);
        maxX = Math.max(maxX, d.boundingBox.x + d.boundingBox.width);
        maxY = Math.max(maxY, d.boundingBox.y + d.boundingBox.height);
      }
    });

    if (minX === Infinity) return { transform: 'none', origin: 'center center' };

    // Add padding around faces (20%)
    const padding = 0.2;
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    minX = Math.max(0, minX - faceWidth * padding);
    minY = Math.max(0, minY - faceHeight * padding);
    maxX = Math.min(videoWidth, maxX + faceWidth * padding);
    maxY = Math.min(videoHeight, maxY + faceHeight * padding);

    // Calculate center and zoom level
    const centerX = ((minX + maxX) / 2) / videoWidth * 100;
    const centerY = ((minY + maxY) / 2) / videoHeight * 100;

    let zoom = zoomMode === 'auto' 
      ? Math.min(3, Math.max(1.5, videoWidth / (maxX - minX)))
      : manualZoom;

    return {
      transform: `scale(${zoom})`,
      origin: `${centerX}% ${centerY}%`
    };
  }, [detections, zoomMode, manualZoom, videoRef]);

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
        
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          {isActive && (
            <div className="flex items-center gap-1">
              <Button
                variant={zoomMode === 'none' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setZoomMode('none')}
                title="No zoom"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant={zoomMode === 'auto' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setZoomMode('auto')}
                title="Auto-zoom to faces"
              >
                <ZoomIn className="h-3 w-3" />
                <span className="ml-1">Auto</span>
              </Button>
              {zoomMode === 'none' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setZoomMode('manual');
                    setManualZoom(2);
                  }}
                  title="Manual zoom"
                >
                  2x
                </Button>
              )}
              {zoomMode === 'manual' && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setManualZoom(m => Math.max(1, m - 0.5))}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <span className="text-xs w-8 text-center">{manualZoom.toFixed(1)}x</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setManualZoom(m => Math.min(4, m + 0.5))}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

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
      </div>

      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        {/* Debug Overlay */}
        <DebugOverlay 
          debug={debugInfo} 
          trackedFaces={trackedFaces} 
          show={debugMode && isActive} 
        />
        
        <div 
          className="w-full h-full transition-transform duration-300 ease-out"
          style={{
            transform: zoomTransform.transform,
            transformOrigin: zoomTransform.origin
          }}
        >
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
          
          {/* Labeling buttons overlay */}
          {labelingMode && isActive && detections.map((detection, idx) => {
            if (!detection.boundingBox || !videoRef.current) return null;
            
            const video = videoRef.current;
            const rect = video.getBoundingClientRect();
            const videoWidth = video.videoWidth || 640;
            const videoHeight = video.videoHeight || 480;
            const scaleX = rect.width / videoWidth;
            const scaleY = rect.height / videoHeight;
            
            const scaledX = detection.boundingBox.x * scaleX;
            const scaledY = detection.boundingBox.y * scaleY;
            const scaledWidth = detection.boundingBox.width * scaleX;
            const scaledHeight = detection.boundingBox.height * scaleY;
            const faceId = detection.trackingId || `face_${idx}`;
            
            const isLabeling = labelingFace === faceId;
            
            return (
              <div
                key={faceId}
                className="absolute"
                style={{
                  left: `${scaledX}px`,
                  top: `${scaledY + scaledHeight + 4}px`,
                  width: `${Math.max(scaledWidth, 120)}px`,
                }}
              >
                {!isLabeling ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full h-6 text-[10px] gap-1 opacity-90 hover:opacity-100"
                    onClick={() => setLabelingFace(faceId)}
                  >
                    <Tag className="h-3 w-3" />
                    Label
                  </Button>
                ) : (
                  <div className="bg-background/95 border rounded-md p-2 space-y-2 shadow-lg">
                    <div className="text-[10px] font-medium text-center">Correct Gender?</div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={detection.gender === 'male' ? 'default' : 'outline'}
                        className="flex-1 h-6 text-[10px]"
                        onClick={() => {
                          if (onLabelDetection && detection.boundingBox) {
                            onLabelDetection({
                              id: `${Date.now()}_${idx}`,
                              timestamp: Date.now(),
                              boundingBox: detection.boundingBox,
                              detectedGender: detection.gender,
                              detectedAgeGroup: detection.ageGroup,
                              detectedConfidence: detection.confidence,
                              detectedFaceScore: detection.faceScore,
                              actualGender: 'male',
                              actualAgeGroup: detection.ageGroup,
                              isFalsePositive: false,
                            });
                          }
                          setLabelingFace(null);
                        }}
                      >
                        ♂ Male
                      </Button>
                      <Button
                        size="sm"
                        variant={detection.gender === 'female' ? 'default' : 'outline'}
                        className="flex-1 h-6 text-[10px]"
                        onClick={() => {
                          if (onLabelDetection && detection.boundingBox) {
                            onLabelDetection({
                              id: `${Date.now()}_${idx}`,
                              timestamp: Date.now(),
                              boundingBox: detection.boundingBox,
                              detectedGender: detection.gender,
                              detectedAgeGroup: detection.ageGroup,
                              detectedConfidence: detection.confidence,
                              detectedFaceScore: detection.faceScore,
                              actualGender: 'female',
                              actualAgeGroup: detection.ageGroup,
                              isFalsePositive: false,
                            });
                          }
                          setLabelingFace(null);
                        }}
                      >
                        ♀ Female
                      </Button>
                    </div>
                    <div className="text-[10px] font-medium text-center">Correct Age?</div>
                    <div className="flex gap-1">
                      {(['kid', 'young', 'adult'] as const).map(age => (
                        <Button
                          key={age}
                          size="sm"
                          variant={detection.ageGroup === age ? 'default' : 'outline'}
                          className="flex-1 h-6 text-[10px] px-1"
                          onClick={() => {
                            if (onLabelDetection && detection.boundingBox) {
                              onLabelDetection({
                                id: `${Date.now()}_${idx}`,
                                timestamp: Date.now(),
                                boundingBox: detection.boundingBox,
                                detectedGender: detection.gender,
                                detectedAgeGroup: detection.ageGroup,
                                detectedConfidence: detection.confidence,
                                detectedFaceScore: detection.faceScore,
                                actualGender: detection.gender,
                                actualAgeGroup: age,
                                isFalsePositive: false,
                              });
                            }
                            setLabelingFace(null);
                          }}
                        >
                          {age}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-6 text-[10px]"
                        onClick={() => {
                          if (onLabelDetection && detection.boundingBox) {
                            onLabelDetection({
                              id: `${Date.now()}_${idx}`,
                              timestamp: Date.now(),
                              boundingBox: detection.boundingBox,
                              detectedGender: detection.gender,
                              detectedAgeGroup: detection.ageGroup,
                              detectedConfidence: detection.confidence,
                              detectedFaceScore: detection.faceScore,
                              actualGender: detection.gender,
                              actualAgeGroup: detection.ageGroup,
                              isFalsePositive: true,
                            });
                          }
                          setLabelingFace(null);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Not Face
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 h-6 text-[10px] bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          if (onLabelDetection && detection.boundingBox) {
                            onLabelDetection({
                              id: `${Date.now()}_${idx}`,
                              timestamp: Date.now(),
                              boundingBox: detection.boundingBox,
                              detectedGender: detection.gender,
                              detectedAgeGroup: detection.ageGroup,
                              detectedConfidence: detection.confidence,
                              detectedFaceScore: detection.faceScore,
                              actualGender: detection.gender,
                              actualAgeGroup: detection.ageGroup,
                              isFalsePositive: false,
                            });
                          }
                          setLabelingFace(null);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Correct
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-5 text-[10px]"
                      onClick={() => setLabelingFace(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
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
