import { useState } from 'react';
import { Settings, Percent, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CaptureSettings {
  startPercent: number;
  endPercent: number;
  detectionSensitivity: number;
}

interface SettingsPanelProps {
  settings: CaptureSettings;
  onSettingsChange: (settings: CaptureSettings) => void;
}

export const SettingsPanel = ({ settings, onSettingsChange }: SettingsPanelProps) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onSettingsChange(localSettings);
    setOpen(false);
  };

  const handleStartChange = (value: number[]) => {
    const newStart = value[0];
    setLocalSettings(prev => ({
      ...prev,
      startPercent: newStart,
      endPercent: Math.max(prev.endPercent, newStart + 5), // Ensure at least 5% window
    }));
  };

  const handleEndChange = (value: number[]) => {
    const newEnd = value[0];
    setLocalSettings(prev => ({
      ...prev,
      endPercent: newEnd,
      startPercent: Math.min(prev.startPercent, newEnd - 5), // Ensure at least 5% window
    }));
  };

  const handleSensitivityChange = (value: number[]) => {
    setLocalSettings(prev => ({
      ...prev,
      detectionSensitivity: value[0],
    }));
  };

  const getSensitivityLabel = (value: number) => {
    if (value <= 0.35) return 'High (more detections)';
    if (value <= 0.45) return 'Medium';
    return 'Low (fewer false positives)';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">System Settings</DialogTitle>
          <DialogDescription>
            Configure capture window and detection sensitivity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Detection Sensitivity */}
          <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Detection Sensitivity
              </label>
              <span className="text-sm text-primary font-display font-bold">
                {(1 - localSettings.detectionSensitivity).toFixed(2)}
              </span>
            </div>
            <Slider
              value={[localSettings.detectionSensitivity]}
              onValueChange={handleSensitivityChange}
              min={0.3}
              max={0.6}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {getSensitivityLabel(localSettings.detectionSensitivity)} • 
              Lower threshold = more faces detected (may include false positives)
            </p>
          </div>

          {/* Start Percentage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Capture Start</label>
              <span className="text-sm text-primary font-display font-bold">
                {localSettings.startPercent}%
              </span>
            </div>
            <Slider
              value={[localSettings.startPercent]}
              onValueChange={handleStartChange}
              min={10}
              max={90}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Camera activates at this point of the ad
            </p>
          </div>

          {/* End Percentage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Capture End</label>
              <span className="text-sm text-accent font-display font-bold">
                {localSettings.endPercent}%
              </span>
            </div>
            <Slider
              value={[localSettings.endPercent]}
              onValueChange={handleEndChange}
              min={20}
              max={98}
              step={2}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Camera deactivates at this point of the ad
            </p>
          </div>

          {/* Preview */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Percent className="h-4 w-4 text-primary" />
              Capture Window Preview
            </div>
            <div className="relative h-3 bg-background rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-gradient-to-r from-primary to-accent"
                style={{
                  left: `${localSettings.startPercent}%`,
                  width: `${localSettings.endPercent - localSettings.startPercent}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For a 60s ad: Camera on at {Math.round(60 * localSettings.startPercent / 100)}s, 
              off at {Math.round(60 * localSettings.endPercent / 100)}s
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export type { CaptureSettings };
