import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Trash2, 
  BarChart3, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  EvaluationSession,
  GroundTruthEntry,
  EvaluationMetrics,
  ConfusionMatrix,
  calculateMetrics,
  calculateConfusionMatrix,
} from '@/types/evaluation';

const STORAGE_KEY = 'smartads-evaluation-sessions';

const ModelEvaluation = () => {
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [confusionMatrix, setConfusionMatrix] = useState<ConfusionMatrix | null>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch {
        console.error('Failed to load evaluation sessions');
      }
    }
  }, []);

  // Calculate metrics when active session changes
  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session && session.entries.length > 0) {
        setMetrics(calculateMetrics(session.entries));
        setConfusionMatrix(calculateConfusionMatrix(session.entries));
      } else {
        setMetrics(null);
        setConfusionMatrix(null);
      }
    }
  }, [activeSessionId, sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const allEntries = sessions.flatMap(s => s.entries);

  const handleExportCSV = useCallback(() => {
    if (!activeSession) return;
    
    const headers = [
      'ID', 'Timestamp', 'Detected Gender', 'Actual Gender', 
      'Detected Age', 'Actual Age', 'Confidence', 'Face Score', 'False Positive'
    ];
    
    const rows = activeSession.entries.map(e => [
      e.id,
      new Date(e.timestamp).toISOString(),
      e.detectedGender,
      e.actualGender,
      e.detectedAgeGroup,
      e.actualAgeGroup,
      e.detectedConfidence.toFixed(2),
      e.detectedFaceScore.toFixed(2),
      e.isFalsePositive ? 'Yes' : 'No',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation-${activeSession.name}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSession]);

  const handleClearSession = useCallback(() => {
    if (!activeSessionId) return;
    
    const updated = sessions.map(s => 
      s.id === activeSessionId ? { ...s, entries: [] } : s
    );
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [activeSessionId, sessions]);

  const handleDeleteSession = useCallback(() => {
    if (!activeSessionId) return;
    
    const updated = sessions.filter(s => s.id !== activeSessionId);
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setActiveSessionId(updated.length > 0 ? updated[0].id : null);
  }, [activeSessionId, sessions]);

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold">Model Evaluation Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Analyze detection accuracy and demographic classification performance
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Admin Only
          </Badge>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{allEntries.length}</div>
              <p className="text-xs text-muted-foreground">
                Across {sessions.length} sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Gender Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics ? formatPercent(metrics.genderAccuracy) : 'N/A'}
              </div>
              <Progress 
                value={metrics ? metrics.genderAccuracy * 100 : 0} 
                className="h-2 mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Female Recall
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics ? formatPercent(metrics.femaleRecall) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                % of females correctly detected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                False Positive Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics ? formatPercent(metrics.falsePositiveRate) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Non-face detections
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gender Confusion Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gender Confusion Matrix</CardTitle>
              <CardDescription>
                Rows = Predicted, Columns = Actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confusionMatrix ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead className="text-center">Actual Male</TableHead>
                      <TableHead className="text-center">Actual Female</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Predicted Male</TableCell>
                      <TableCell className="text-center bg-green-500/10">
                        <span className="font-bold text-green-600">
                          {confusionMatrix.gender.maleAsMale}
                        </span>
                      </TableCell>
                      <TableCell className="text-center bg-destructive/10">
                        <span className="font-bold text-destructive">
                          {confusionMatrix.gender.maleAsFemale}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Predicted Female</TableCell>
                      <TableCell className="text-center bg-destructive/10">
                        <span className="font-bold text-destructive">
                          {confusionMatrix.gender.femaleAsMale}
                        </span>
                      </TableCell>
                      <TableCell className="text-center bg-green-500/10">
                        <span className="font-bold text-green-600">
                          {confusionMatrix.gender.femaleAsFemale}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No evaluation data yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Age Confusion Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Age Group Confusion Matrix</CardTitle>
              <CardDescription>
                Rows = Predicted, Columns = Actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confusionMatrix ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead className="text-center">Kid</TableHead>
                      <TableHead className="text-center">Young</TableHead>
                      <TableHead className="text-center">Adult</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Pred. Kid</TableCell>
                      <TableCell className="text-center bg-green-500/10">
                        {confusionMatrix.age.kidAsKid}
                      </TableCell>
                      <TableCell className="text-center">
                        {confusionMatrix.age.kidAsYoung}
                      </TableCell>
                      <TableCell className="text-center">
                        {confusionMatrix.age.kidAsAdult}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Pred. Young</TableCell>
                      <TableCell className="text-center">
                        {confusionMatrix.age.youngAsKid}
                      </TableCell>
                      <TableCell className="text-center bg-green-500/10">
                        {confusionMatrix.age.youngAsYoung}
                      </TableCell>
                      <TableCell className="text-center">
                        {confusionMatrix.age.youngAsAdult}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Pred. Adult</TableCell>
                      <TableCell className="text-center">
                        {confusionMatrix.age.adultAsKid}
                      </TableCell>
                      <TableCell className="text-center">
                        {confusionMatrix.age.adultAsYoung}
                      </TableCell>
                      <TableCell className="text-center bg-green-500/10">
                        {confusionMatrix.age.adultAsAdult}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No evaluation data yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Performance Metrics</CardTitle>
            <CardDescription>
              Precision, recall, and accuracy breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && metrics.totalSamples > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Male Precision</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.malePrecision)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Male Recall</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.maleRecall)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Female Precision</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.femalePrecision)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Female Recall</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.femaleRecall)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Age Accuracy</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.ageAccuracy)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Kid Accuracy</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.kidAccuracy)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Young Accuracy</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.youngAccuracy)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Adult Accuracy</p>
                  <p className="text-xl font-bold">{formatPercent(metrics.adultAccuracy)}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground">Avg Confidence (Correct)</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatPercent(metrics.avgConfidenceCorrect)}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground">Avg Confidence (Incorrect)</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatPercent(metrics.avgConfidenceIncorrect)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No evaluation data available. Label detections from the dashboard to collect ground truth.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                disabled={!activeSession || activeSession.entries.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearSession}
                disabled={!activeSession}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Session
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteSession}
                disabled={!activeSession}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>1. Collect Ground Truth:</strong> From the main dashboard, enable "Evaluation Mode" 
              in settings. This adds labeling buttons to each detected face.
            </p>
            <p>
              <strong>2. Label Detections:</strong> For each detected face, confirm or correct the 
              gender and age group. Mark any non-face detections as false positives.
            </p>
            <p>
              <strong>3. Analyze Results:</strong> Return here to view accuracy metrics, 
              confusion matrices, and export data for further analysis.
            </p>
            <p>
              <strong>4. Tune Settings:</strong> Use the metrics to adjust detection sensitivity, 
              female boost factor, and false positive thresholds on the main dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelEvaluation;
