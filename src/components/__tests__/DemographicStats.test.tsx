import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemographicStats } from '../DemographicStats';
import type { DemographicCounts, DetectionResult } from '@/types/ad';

// ─── Helpers ────────────────────────────────────────────────────

const emptyDemographics: DemographicCounts = {
  male: 0,
  female: 0,
  child: 0,
  teen: 0,
  youngAdult: 0,
  middleAged: 0,
  senior: 0,
};

function createDetection(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    gender: 'male',
    ageGroup: 'youngAdult',
    confidence: 0.92,
    faceScore: 0.95,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('DemographicStats', () => {
  it('renders the "Audience Demographics" heading', () => {
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    expect(screen.getByText('Audience Demographics')).toBeInTheDocument();
  });

  it('shows "Live" when isCapturing is true', () => {
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={[]}
        isCapturing={true}
      />
    );
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows "Paused" when isCapturing is false', () => {
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('displays correct gender viewer count', () => {
    const demographics: DemographicCounts = {
      ...emptyDemographics,
      male: 5,
      female: 3,
    };
    render(
      <DemographicStats
        demographics={demographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    expect(screen.getByText('8 viewers')).toBeInTheDocument();
  });

  it('displays singular "viewer" for count of 1', () => {
    const demographics: DemographicCounts = {
      ...emptyDemographics,
      male: 1,
      female: 0,
    };
    render(
      <DemographicStats
        demographics={demographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    // The first "1 viewer" is gender viewers
    expect(screen.getAllByText(/1 viewer$/)[0]).toBeInTheDocument();
  });

  it('renders gender labels (Male, Female)', () => {
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
  });

  it('renders all age group labels', () => {
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByText('Teen')).toBeInTheDocument();
    expect(screen.getByText('Young')).toBeInTheDocument();
    expect(screen.getByText('Mid-Age')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
  });

  it('renders age sublabels', () => {
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    expect(screen.getByText('< 13 yrs')).toBeInTheDocument();
    expect(screen.getByText('13-17 yrs')).toBeInTheDocument();
    expect(screen.getByText('18-34 yrs')).toBeInTheDocument();
    expect(screen.getByText('35-54 yrs')).toBeInTheDocument();
    expect(screen.getByText('55+ yrs')).toBeInTheDocument();
  });

  it('displays "Current Viewers" when detections are present', () => {
    const detections = [createDetection()];
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={detections}
        isCapturing={true}
      />
    );
    expect(screen.getByText('Current Viewers')).toBeInTheDocument();
  });

  it('does NOT display "Current Viewers" when no detections', () => {
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    expect(screen.queryByText('Current Viewers')).not.toBeInTheDocument();
  });

  it('renders detection badges with gender and age info', () => {
    const detections = [
      createDetection({ gender: 'female', ageGroup: 'teen', confidence: 0.88 }),
    ];
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={detections}
        isCapturing={true}
      />
    );
    expect(screen.getByText('female')).toBeInTheDocument();
    expect(screen.getByText('teen')).toBeInTheDocument();
    // 88% appears in both the ConfidenceBadge and DetectionBadge
    expect(screen.getAllByText('88%')).toHaveLength(2);
  });

  it('shows confidence badge with correct label', () => {
    const detections = [createDetection({ confidence: 0.90 })];
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={detections}
        isCapturing={true}
      />
    );
    expect(screen.getByText('High Confidence')).toBeInTheDocument();
  });

  it('shows "Low Confidence" for detections below 0.75', () => {
    const detections = [createDetection({ confidence: 0.60 })];
    render(
      <DemographicStats
        demographics={emptyDemographics}
        recentDetections={detections}
        isCapturing={true}
      />
    );
    expect(screen.getByText('Low Confidence')).toBeInTheDocument();
  });

  it('displays gender percentages', () => {
    const demographics: DemographicCounts = {
      ...emptyDemographics,
      male: 3,
      female: 7,
    };
    render(
      <DemographicStats
        demographics={demographics}
        recentDetections={[]}
        isCapturing={false}
      />
    );
    expect(screen.getByText('30% Male')).toBeInTheDocument();
    expect(screen.getByText('70% Female')).toBeInTheDocument();
  });
});
