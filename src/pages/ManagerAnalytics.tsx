import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import {
  Users, UserCircle2, User, Baby, Smile, Briefcase,
  Clock, TrendingUp, BarChart3, Download, Lock,
  Home, CalendarIcon, FileText, Trash2, ArrowLeft,
  LogOut, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  getAllTimeTotals,
  getHourlyTimeline,
  getLast30DaysTrend,
  getAllSessions,
  getSessionsInRange,
  exportAnalyticsJSON,
  clearAllAnalytics,
  importAnalyticsJSON,
} from '@/utils/analyticsStorage';
import type { AllTimeTotals, HourlyBucket, AnalyticsSession } from '@/types/analytics';

const MANAGER_PASSWORD = 'smartads1234';

const COLORS = {
  male: 'hsl(221, 83%, 53%)',
  female: 'hsl(330, 81%, 60%)',
  kid: 'hsl(199, 89%, 48%)',
  young: 'hsl(142, 71%, 45%)',
  adult: 'hsl(38, 92%, 50%)',
};

// ─── Login Gate ─────────────────────────────────────────────

const LoginGate = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === MANAGER_PASSWORD) {
      sessionStorage.setItem('smartads-manager-auth', 'true');
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
          <CardTitle className="font-display text-2xl">Manager Analytics</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Enter manager credentials to access analytics dashboard</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Enter manager password"
                autoFocus
              />
              {error && <p className="text-sm text-destructive">Invalid password</p>}
            </div>
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────

const ManagerAnalytics = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('smartads-manager-auth') === 'true');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Derive all data
  const totals: AllTimeTotals = useMemo(() => getAllTimeTotals(), [refreshKey]);
  const hourly: HourlyBucket[] = useMemo(() => getHourlyTimeline(selectedDate), [selectedDate, refreshKey]);
  const trend = useMemo(() => getLast30DaysTrend(), [refreshKey]);
  const sessions: AnalyticsSession[] = useMemo(() => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    return getSessionsInRange(dayStart.getTime(), dayEnd.getTime()).sort((a, b) => b.endedAt - a.endedAt);
  }, [selectedDate, refreshKey]);

  const allSessions = useMemo(() => getAllSessions(), [refreshKey]);

  const handleExportJSON = () => {
    const json = exportAnalyticsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartads-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      clearAllAnalytics();
      refresh();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('smartads-manager-auth');
    setAuthed(false);
  };

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

  // Pie data
  const genderPie = [
    { name: 'Male', value: totals.maleCount, color: COLORS.male },
    { name: 'Female', value: totals.femaleCount, color: COLORS.female },
  ].filter(d => d.value > 0);

  const agePie = [
    { name: 'Kid', value: totals.kidCount, color: COLORS.kid },
    { name: 'Young', value: totals.youngCount, color: COLORS.young },
    { name: 'Adult', value: totals.adultCount, color: COLORS.adult },
  ].filter(d => d.value > 0);

  const hasData = totals.totalSessions > 0;

  return (
    <>
      <Helmet>
        <title>Manager Analytics - SmartAds</title>
      </Helmet>

      <div className="min-h-screen bg-background print:bg-white">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40 print:hidden">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 rounded-xl hover:bg-muted transition-colors" title="Back to Dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-display font-bold">
                Manager <span className="text-primary">Analytics</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-2">
                <Download className="h-4 w-4" /> Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <FileText className="h-4 w-4" /> Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Print header */}
          <div className="hidden print:block mb-8">
            <h1 className="text-3xl font-bold">SmartAds Analytics Report</h1>
            <p className="text-muted-foreground">Generated: {format(new Date(), 'PPP p')}</p>
          </div>

          {!hasData && (
            <Card className="text-center py-16">
              <CardContent>
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-display font-semibold mb-2">No Analytics Data Yet</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Start playing ads on the dashboard with detection enabled. Audience data will appear here automatically after capture sessions complete.
                </p>
                <Link to="/dashboard">
                  <Button className="mt-6 gap-2"><Home className="h-4 w-4" /> Go to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {hasData && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={Users} label="Total Visitors" value={totals.totalVisitors} color="primary" />
                <StatCard icon={BarChart3} label="Total Sessions" value={totals.totalSessions} color="accent" />
                <StatCard icon={TrendingUp} label="Avg/Day" value={totals.avgVisitorsPerDay} color="primary" />
                <StatCard icon={Clock} label="Peak Hour" value={totals.peakHourLabel} color="accent" />
                <StatCard icon={User} label="Male" value={totals.maleCount} color="primary" />
                <StatCard icon={UserCircle2} label="Female" value={totals.femaleCount} color="accent" />
              </div>

              {/* Date Picker */}
              <div className="flex items-center gap-4 print:hidden">
                <Label className="font-display font-semibold">Timeline Date:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-[240px] justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => d && setSelectedDate(d)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
              </div>

              {/* Hourly Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Hourly Audience Timeline — {format(selectedDate, 'PPP')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <YAxis allowDecimals={false} className="fill-muted-foreground" />
                        <ReTooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                        <Bar dataKey="maleCount" name="Male" fill={COLORS.male} stackId="gender" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="femaleCount" name="Female" fill={COLORS.female} stackId="gender" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Demographics Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Gender Pie */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-base">Gender Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {genderPie.length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={genderPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {genderPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <ReTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No gender data</p>
                    )}
                  </CardContent>
                </Card>

                {/* Age Pie */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-base">Age Group Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {agePie.length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={agePie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {agePie.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <ReTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No age data</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 30-day Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Daily Visitor Trend (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                        <YAxis allowDecimals={false} className="fill-muted-foreground" />
                        <ReTooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        />
                        <Line type="monotone" dataKey="visitors" stroke={COLORS.male} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Session History Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Session History — {format(selectedDate, 'PPP')}
                    <span className="text-sm font-normal text-muted-foreground ml-2">({sessions.length} sessions)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length > 0 ? (
                    <div className="max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Viewers</TableHead>
                            <TableHead>Male</TableHead>
                            <TableHead>Female</TableHead>
                            <TableHead>Kid</TableHead>
                            <TableHead>Young</TableHead>
                            <TableHead>Adult</TableHead>
                            <TableHead>Ad Playing</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessions.map((s) => {
                            const dur = Math.round((s.endedAt - s.startedAt) / 1000);
                            return (
                              <TableRow key={s.id}>
                                <TableCell className="font-mono text-xs">{format(new Date(s.endedAt), 'HH:mm:ss')}</TableCell>
                                <TableCell>{dur}s</TableCell>
                                <TableCell className="font-semibold">{s.totalViewers}</TableCell>
                                <TableCell>{s.maleCount}</TableCell>
                                <TableCell>{s.femaleCount}</TableCell>
                                <TableCell>{s.kidCount}</TableCell>
                                <TableCell>{s.youngCount}</TableCell>
                                <TableCell>{s.adultCount}</TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate">{s.adTitle}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No sessions recorded for this date</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          header, .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
};

// ─── Stat Card ──────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'primary' | 'accent';
}

const StatCard = ({ icon: Icon, label, value, color }: StatCardProps) => (
  <Card className="overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          color === 'primary' ? 'bg-primary/10' : 'bg-accent/10'
        )}>
          <Icon className={cn('h-5 w-5', color === 'primary' ? 'text-primary' : 'text-accent')} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-display font-bold truncate">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ManagerAnalytics;
