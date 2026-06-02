import { AdMetadata } from '@/types/ad';

// Sample ads with royalty-free video URLs for demonstration
// Capture window is set to 75%-90% of ad duration (near the end)
export const sampleAds: AdMetadata[] = [
  {
    id: 'ad-001',
    filename: 'tech-gadgets.mp4',
    title: 'TechPro Gadgets',
    gender: 'male',
    ageGroup: ['youngAdult'],
    duration: 10,
    captureStart: 6,
    captureEnd: 9,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    id: 'ad-002',
    filename: 'luxury-fashion.mp4',
    title: 'Elegance Fashion',
    gender: 'female',
    ageGroup: ['middleAged'],
    duration: 6,
    captureStart: 3,
    captureEnd: 5,
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
  },
  {
    id: 'ad-003',
    filename: 'sports-energy.mp4',
    title: 'PowerBoost Energy',
    gender: 'male',
    ageGroup: ['youngAdult'],
    duration: 52,
    captureStart: 30,
    captureEnd: 48,
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  },
  {
    id: 'ad-004',
    filename: 'skincare-premium.mp4',
    title: 'GlowUp Skincare',
    gender: 'female',
    ageGroup: ['youngAdult'],
    duration: 33,
    captureStart: 20,
    captureEnd: 30,
    videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
  },
  {
    id: 'ad-005',
    filename: 'financial-services.mp4',
    title: 'WealthGuard Insurance',
    gender: 'all',
    ageGroup: ['middleAged'],
    duration: 60,
    captureStart: 36,
    captureEnd: 55,
    videoUrl: 'https://media.w3.org/2010/05/bunny/movie.mp4',
  },
  {
    id: 'ad-006',
    filename: 'gaming-console.mp4',
    title: 'NexGen Gaming',
    gender: 'all',
    ageGroup: ['youngAdult'],
    duration: 10,
    captureStart: 6,
    captureEnd: 9,
    videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
  },
  {
    id: 'ad-007',
    filename: 'teen-fashion.mp4',
    title: 'TrendZ Teen Fashion',
    gender: 'all',
    ageGroup: ['teen'],
    duration: 15,
    captureStart: 10,
    captureEnd: 13,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    id: 'ad-008',
    filename: 'health-wellness.mp4',
    title: 'VitalCare Health',
    gender: 'all',
    ageGroup: ['senior'],
    duration: 20,
    captureStart: 14,
    captureEnd: 18,
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
  },
  {
    id: 'ad-009',
    filename: 'family-toys.mp4',
    title: 'WonderPlay Toys',
    gender: 'all',
    ageGroup: ['child', 'middleAged'],
    duration: 12,
    captureStart: 8,
    captureEnd: 11,
    videoUrl: 'https://media.w3.org/2010/05/bunny/movie.mp4',
  },
];

// Helper to calculate capture window (75% to 92% of duration)
export const calculateCaptureWindow = (duration: number) => ({
  start: Math.floor(duration * 0.75),
  end: Math.floor(duration * 0.92),
});

export const getAdById = (id: string): AdMetadata | undefined => {
  return sampleAds.find(ad => ad.id === id);
};

export const getAdsByTarget = (gender?: string, ageGroup?: string): AdMetadata[] => {
  return sampleAds.filter(ad => {
    const genderMatch = !gender || ad.gender === 'all' || ad.gender === gender;
    const ageMatch = !ageGroup || ad.ageGroup.includes('all') || ad.ageGroup.includes(ageGroup as any);
    return genderMatch && ageMatch;
  });
};
