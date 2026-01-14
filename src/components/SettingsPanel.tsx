import { useState } from 'react';
import { Settings, Percent, Eye, Zap, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DetectionMode = 'fast' | 'accurate' | 'max';
export type VideoQuality = 'hd' | 'lowQuality' | 'nightIR' | 'crowd';

interface CaptureSettings {
  startPercent: number;
  endPercent: number;
  detectionSensitivity: number;
  detectionMode: DetectionMode;
  videoQuality: VideoQuality;
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

  const handleSensitivityChange = (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, detectionSensitivity: value[0] }));
  };

  const handleStartChange = (value: number[]) => {
    const newStart = value[0];
    setLocalSettings(prev => ({
      ...prev,
      startPercent: newStart,
      endPercent: Math.max(prev.endPercent, newStart + 5),
    }));
  };

  const handleEndChange = (value: number[]) => {
    const newEnd = value[0];
    setLocalSettings(prev => ({
      ...prev,
      endPercent: newEnd,
      startPercent: Math.min(prev.startPercent, newEnd - 5),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">System Settings</DialogTitle>
          <DialogDescription>
            Configure detection mode, sensitivity, and capture window.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Detection Mode */}
          <div className="space-y-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              Detection Mode
            </Label>
            <Select
              value={localSettings.detectionMode}
              onValueChange={(value: DetectionMode) => 
                setLocalSettings(prev => ({ ...prev, detectionMode: value }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast (Webcam)</SelectItem>
                <SelectItem value="accurate">Accurate (CCTV)</SelectItem>
                <SelectItem value="max">Maximum (Crowd)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Video Quality */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Label className="flex items-center gap-2">
              <MonitorPlay className="h-4 w-4 text-primary" />
              Video Quality Preset
            </Label>
            <Select
              value={localSettings.videoQuality}
              onValueChange={(value: VideoQuality) => 
                setLocalSettings(prev => ({ ...prev, videoQuality: value }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hd">HD (720p+)</SelectItem>
                <SelectItem value="lowQuality">Low Quality CCTV</SelectItem>
                <SelectItem value="nightIR">Night/IR Camera</SelectItem>
                <SelectItem value="crowd">Crowd Detection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sensitivity */}
          <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Sensitivity
              </Label>
              <span className="text-sm text-primary font-bold">
                {(1 - localSettings.detectionSensitivity).toFixed(2)}
              </span>
            </div>
            <Slider
              value={[localSettings.detectionSensitivity]}
              onValueChange={handleSensitivityChange}
              min={0.2} max={0.6} step={0.05}
            />
          </div>

          {/* Capture Window */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Capture Start</Label>
              <span className="text-sm text-primary font-bold">{localSettings.startPercent}%</span>
            </div>
            <Slider value={[localSettings.startPercent]} onValueChange={handleStartChange} min={10} max={90} step={5} />
            
            <div className="flex items-center justify-between">
              <Label>Capture End</Label>
              <span className="text-sm text-accent font-bold">{localSettings.endPercent}%</span>
            </div>
            <Slider value={[localSettings.endPercent]} onValueChange={handleEndChange} min={20} max={98} step={2} />
          </div>

          {/* Preview */}
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Percent className="h-4 w-4 text-primary" />
              Capture Window
            </div>
            <div className="relative h-2 bg-background rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-gradient-to-r from-primary to-accent"
                style={{ left: `${localSettings.startPercent}%`, width: `${localSettings.endPercent - localSettings.startPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export type { CaptureSettings };
