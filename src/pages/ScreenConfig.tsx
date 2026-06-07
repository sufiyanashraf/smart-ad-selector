import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Lock, Settings, Monitor, Building2, Save, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CONFIG_PASSWORD = 'smartads-config-2024';
const CONFIG_STORAGE_KEY = 'smartads-screen-config';

interface ScreenConfigData {
  outlet_id: string;
  outlet_name: string;
  screen_id: string;
  screen_name: string;
  configured_at: string;
}

interface Outlet {
  id: string;
  name: string;
}

interface Screen {
  id: string;
  name: string;
  outlet_id: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────

function getSavedConfig(): ScreenConfigData | null {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveConfig(config: ScreenConfigData) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

// ─── Login Gate ────────────────────────────────────────────────

const LoginGate = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CONFIG_PASSWORD) {
      sessionStorage.setItem('smartads-config-auth', 'true');
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Screen Configuration</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Enter configuration password to access screen setup</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="config-password">Password</Label>
              <Input
                id="config-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Enter configuration password"
                autoFocus
              />
              {error && <p className="text-sm text-destructive">Invalid password</p>}
            </div>
            <Button type="submit" className="w-full">Authenticate</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Main Config Page ──────────────────────────────────────────

const ScreenConfig = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('smartads-config-auth') === 'true');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('');
  const [selectedScreenId, setSelectedScreenId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ScreenConfigData | null>(null);

  // Load saved config and outlets on mount
  useEffect(() => {
    if (!authed) return;

    const config = getSavedConfig();
    setCurrentConfig(config);
    if (config) {
      setSelectedOutletId(config.outlet_id);
      setSelectedScreenId(config.screen_id);
    }

    // Fetch outlets
    supabase.from('outlets').select('id, name').order('name').then(({ data, error: err }) => {
      if (err) {
        setError(`Failed to fetch outlets: ${err.message}`);
      } else if (data) {
        setOutlets(data as Outlet[]);
      }
      setLoading(false);
    });
  }, [authed]);

  // Fetch screens when outlet changes
  useEffect(() => {
    if (!selectedOutletId || !authed) {
      setScreens([]);
      return;
    }

    supabase
      .from('screens')
      .select('id, name, outlet_id')
      .eq('outlet_id', selectedOutletId)
      .order('name')
      .then(({ data, error: err }) => {
        if (err) {
          setError(`Failed to fetch screens: ${err.message}`);
        } else if (data) {
          setScreens(data as Screen[]);
          // If previously selected screen isn't in this outlet, clear it
          if (data && !data.some(s => s.id === selectedScreenId)) {
            setSelectedScreenId('');
          }
        }
      });
  }, [selectedOutletId, authed]);

  const handleOutletChange = useCallback((outletId: string) => {
    setSelectedOutletId(outletId);
    setSelectedScreenId(''); // Reset screen when outlet changes
    setSaved(false);
  }, []);

  const handleScreenChange = useCallback((screenId: string) => {
    setSelectedScreenId(screenId);
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedOutletId || !selectedScreenId) return;

    const outlet = outlets.find(o => o.id === selectedOutletId);
    const screen = screens.find(s => s.id === selectedScreenId);

    if (!outlet || !screen) return;

    setSaving(true);
    const config: ScreenConfigData = {
      outlet_id: selectedOutletId,
      outlet_name: outlet.name,
      screen_id: selectedScreenId,
      screen_name: screen.name,
      configured_at: new Date().toISOString(),
    };

    saveConfig(config);
    setCurrentConfig(config);
    setSaving(false);
    setSaved(true);

    // Auto-hide success after 3 seconds
    setTimeout(() => setSaved(false), 3000);
  }, [selectedOutletId, selectedScreenId, outlets, screens]);

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

  // Get env fallback values for display
  const envOutletId = import.meta.env.VITE_OUTLET_ID || '';
  const envScreenId = import.meta.env.VITE_SCREEN_ID || '';

  return (
    <>
      <Helmet>
        <title>Screen Configuration - SmartAds</title>
      </Helmet>

      <div className="min-h-screen bg-background p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl hover:bg-muted transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">
              Screen <span className="text-primary">Configuration</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure which outlet and screen this device is assigned to. Changes take effect on the next sync cycle (within 60 seconds).
          </p>
        </header>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Current Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <CheckCircle className="h-5 w-5 text-primary" />
                Current Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentConfig ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Outlet:</span>
                    </div>
                    <span className="text-sm font-medium">{currentConfig.outlet_name}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Screen:</span>
                    </div>
                    <span className="text-sm font-medium">{currentConfig.screen_name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    Configured: {new Date(currentConfig.configured_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {envOutletId && envScreenId
                      ? `Using .env defaults (Outlet: ${envOutletId.slice(0, 8)}…, Screen: ${envScreenId.slice(0, 8)}…)`
                      : 'No configuration set. Select an outlet and screen below.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Settings className="h-5 w-5 text-primary" />
                Update Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading outlets...</div>
              ) : (
                <>
                  {/* Outlet Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Select Outlet
                    </Label>
                    <Select value={selectedOutletId} onValueChange={handleOutletChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an outlet..." />
                      </SelectTrigger>
                      <SelectContent>
                        {outlets.map((outlet) => (
                          <SelectItem key={outlet.id} value={outlet.id}>
                            {outlet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {outlets.length === 0 && (
                      <p className="text-xs text-muted-foreground">No outlets found in database. Create outlets in the admin panel first.</p>
                    )}
                  </div>

                  {/* Screen Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-primary" />
                      Select Screen
                    </Label>
                    <Select
                      value={selectedScreenId}
                      onValueChange={handleScreenChange}
                      disabled={!selectedOutletId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedOutletId ? "Choose a screen..." : "Select an outlet first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {screens.map((screen) => (
                          <SelectItem key={screen.id} value={screen.id}>
                            {screen.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedOutletId && screens.length === 0 && (
                      <p className="text-xs text-muted-foreground">No screens found for this outlet. Create screens in the admin panel first.</p>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={!selectedOutletId || !selectedScreenId || saving}
                      className="gap-2"
                    >
                      {saving ? (
                        <>Saving...</>
                      ) : saved ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Configuration
                        </>
                      )}
                    </Button>
                    {saved && (
                      <span className="text-sm text-green-600 dark:text-green-400">
                        ✓ Configuration saved. Will take effect on next sync cycle.
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">How it works:</strong> This configuration is saved locally on this device.
                The sync system will use these values when sending analytics data and heartbeat pings to the cloud.
                If no configuration is set, the system falls back to the values in the <code className="bg-muted px-1 rounded">.env.local</code> file.
                Changes take effect within 60 seconds (next sync cycle).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ScreenConfig;
