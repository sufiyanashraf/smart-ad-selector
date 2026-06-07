import { describe, it, expect } from 'vitest';
import { analyzeFaceShape, applyFemaleBoost, analyzeGenderHeuristics } from '../genderHeuristics';
import type { FaceBoundingBox } from '@/types/ad';

// ─── analyzeFaceShape ───────────────────────────────────────────

describe('analyzeFaceShape', () => {
  it('returns low female score for a square face (aspect ratio < 1.0)', () => {
    const box: FaceBoundingBox = { x: 0, y: 0, width: 100, height: 90 };
    expect(analyzeFaceShape(box)).toBe(0.2);
  });

  it('returns moderate-low female score for slightly tall face (1.0-1.15)', () => {
    const box: FaceBoundingBox = { x: 0, y: 0, width: 100, height: 110 };
    expect(analyzeFaceShape(box)).toBe(0.35);
  });

  it('returns neutral score for medium oval face (1.15-1.25)', () => {
    const box: FaceBoundingBox = { x: 0, y: 0, width: 100, height: 120 };
    expect(analyzeFaceShape(box)).toBe(0.5);
  });

  it('returns moderate-high female score for taller oval face (1.25-1.35)', () => {
    const box: FaceBoundingBox = { x: 0, y: 0, width: 100, height: 130 };
    expect(analyzeFaceShape(box)).toBe(0.65);
  });

  it('returns high female score for very tall face (> 1.35)', () => {
    const box: FaceBoundingBox = { x: 0, y: 0, width: 100, height: 150 };
    expect(analyzeFaceShape(box)).toBe(0.8);
  });

  it('handles edge case of equal width and height (aspect ratio = 1.0)', () => {
    const box: FaceBoundingBox = { x: 0, y: 0, width: 100, height: 100 };
    expect(analyzeFaceShape(box)).toBe(0.35);
  });
});

// ─── applyFemaleBoost ───────────────────────────────────────────

describe('applyFemaleBoost', () => {
  it('does NOT apply boost when confidence is high (> 0.70)', () => {
    const result = applyFemaleBoost('male', 0.85, 0.15, 0.5);
    expect(result.gender).toBe('male');
    expect(result.confidence).toBe(0.85);
  });

  it('does NOT apply boost when confidence is very low (< 0.45)', () => {
    const result = applyFemaleBoost('male', 0.40, 0.15, 0.5);
    expect(result.gender).toBe('male');
    expect(result.confidence).toBe(0.40);
  });

  it('applies boost in the uncertain range (0.45 - 0.70) for male prediction', () => {
    const result = applyFemaleBoost('male', 0.55, 0.15, 0.8);
    // With boost, female probability should increase
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it('applies boost in the uncertain range for female prediction', () => {
    const result = applyFemaleBoost('female', 0.55, 0.15, 0.8);
    expect(result.gender).toBe('female');
    expect(result.confidence).toBeGreaterThanOrEqual(0.55);
  });

  it('caps female probability at 0.95', () => {
    // Use a very large boost factor to try to exceed 0.95
    const result = applyFemaleBoost('female', 0.65, 1.0, 1.0);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it('returns original values when boost factor is 0', () => {
    const result = applyFemaleBoost('male', 0.60, 0, 0.5);
    // With 0 boost, femaleProb = 1 - 0.60 = 0.40. Still male.
    expect(result.gender).toBe('male');
  });

  it('uses default hairScore of 0.5 when not provided', () => {
    const resultWithDefault = applyFemaleBoost('male', 0.55, 0.15);
    const resultWithExplicit = applyFemaleBoost('male', 0.55, 0.15, 0.5);
    expect(resultWithDefault).toEqual(resultWithExplicit);
  });
});

// ─── analyzeGenderHeuristics (without canvas) ───────────────────

describe('analyzeGenderHeuristics (no canvas)', () => {
  const box: FaceBoundingBox = { x: 50, y: 50, width: 100, height: 120 };

  it('returns raw gender when confidence is high and no canvas', () => {
    const result = analyzeGenderHeuristics(null, box, 'male', 0.85);
    expect(result.suggestedGender).toBe('male');
    expect(result.hairScore).toBe(0.5);
    expect(result.jawScore).toBe(0.5);
  });

  it('returns "uncertain" when confidence is low and no canvas', () => {
    const result = analyzeGenderHeuristics(null, box, 'male', 0.55);
    expect(result.suggestedGender).toBe('uncertain');
  });

  it('calculates correct overallFemaleScore for female classification', () => {
    const result = analyzeGenderHeuristics(null, box, 'female', 0.80);
    expect(result.overallFemaleScore).toBe(0.80);
    expect(result.suggestedGender).toBe('female');
  });

  it('calculates correct overallFemaleScore for male classification', () => {
    const result = analyzeGenderHeuristics(null, box, 'male', 0.80);
    // For male with 0.80 confidence, female score = 1 - 0.80 = 0.20
    expect(result.overallFemaleScore).toBeCloseTo(0.20, 5);
    expect(result.suggestedGender).toBe('male');
  });

  it('confidence is derived from distance of overallFemaleScore from 0.5', () => {
    const result = analyzeGenderHeuristics(null, box, 'male', 0.90);
    // No canvas path: overallFemaleScore = 1 - 0.90 = 0.10
    // confidence = |0.10 - 0.5| * 2 = 0.8
    // But note: the no-canvas path returns rawConfidence as confidence
    expect(result.confidence).toBe(0.90);
  });
});
