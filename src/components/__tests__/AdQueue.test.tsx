import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdQueue } from '../AdQueue';
import type { AdMetadata } from '@/types/ad';

// ─── Helpers ────────────────────────────────────────────────────

function createMockAd(overrides: Partial<AdMetadata> = {}): AdMetadata {
  return {
    id: `ad-${Math.random().toString(36).slice(2)}`,
    filename: 'test-ad.mp4',
    title: 'Test Ad',
    gender: 'all',
    ageGroup: ['all'],
    duration: 30,
    captureStart: 5,
    captureEnd: 15,
    videoUrl: '/videos/test.mp4',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('AdQueue', () => {
  it('renders the "Ad Queue" heading', () => {
    render(<AdQueue queue={[]} currentAdId={null} />);
    expect(screen.getByText('Ad Queue')).toBeInTheDocument();
  });

  it('displays the correct ad count', () => {
    const queue = [
      createMockAd({ id: '1', title: 'Ad One' }),
      createMockAd({ id: '2', title: 'Ad Two' }),
      createMockAd({ id: '3', title: 'Ad Three' }),
    ];
    render(<AdQueue queue={queue} currentAdId={null} />);
    expect(screen.getByText('3 ads')).toBeInTheDocument();
  });

  it('renders all ad titles', () => {
    const queue = [
      createMockAd({ id: '1', title: 'Summer Sale' }),
      createMockAd({ id: '2', title: 'Back to School' }),
    ];
    render(<AdQueue queue={queue} currentAdId={null} />);
    expect(screen.getByText('Summer Sale')).toBeInTheDocument();
    expect(screen.getByText('Back to School')).toBeInTheDocument();
  });

  it('shows duration for each ad', () => {
    const queue = [createMockAd({ id: '1', title: 'Short Ad', duration: 15 })];
    render(<AdQueue queue={queue} currentAdId={null} />);
    expect(screen.getByText('15s')).toBeInTheDocument();
  });

  it('displays gender and age group badges', () => {
    const queue = [
      createMockAd({ id: '1', title: 'Male Ad', gender: 'male', ageGroup: ['youngAdult'] }),
    ];
    render(<AdQueue queue={queue} currentAdId={null} />);
    expect(screen.getByText('male')).toBeInTheDocument();
    expect(screen.getByText('youngAdult')).toBeInTheDocument();
  });

  it('shows 0 ads when queue is empty', () => {
    render(<AdQueue queue={[]} currentAdId={null} />);
    expect(screen.getByText('0 ads')).toBeInTheDocument();
  });

  it('renders the footer text', () => {
    render(<AdQueue queue={[]} currentAdId={null} />);
    expect(
      screen.getByText(/Ads ranked by weighted audience match/)
    ).toBeInTheDocument();
  });
});
