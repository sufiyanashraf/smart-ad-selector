import { AdMetadata } from '@/types/ad';

// Sample ads with royalty-free video URLs for demonstration
// Capture window is set to 75%-90% of ad duration (near the end)
export const sampleAds: AdMetadata[] = [
  {
    id: 'ad-001',
    filename: 'tech-gadgets.mp4',
    title: 'TechPro Gadgets',
    gender: 'male',
    ageGroup: 'young',
    duration: 15,
    captureStart: 11, // 75% of 15s
    captureEnd: 14,   // 93% of 15s
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'ad-002',
    filename: 'luxury-fashion.mp4',
    title: 'Elegance Fashion',
    gender: 'female',
    ageGroup: 'adult',
    duration: 15,
    captureStart: 11,
    captureEnd: 14,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 'ad-003',
    filename: 'sports-energy.mp4',
    title: 'PowerBoost Energy',
    gender: 'male',
    ageGroup: 'young',
    duration: 15,
    captureStart: 11,
    captureEnd: 14,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  {
    id: 'ad-004',
    filename: 'skincare-premium.mp4',
    title: 'GlowUp Skincare',
    gender: 'female',
    ageGroup: 'young',
    duration: 15,
    captureStart: 11,
    captureEnd: 14,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  },
  {
    id: 'ad-005',
    filename: 'financial-services.mp4',
    title: 'WealthGuard Insurance',
    gender: 'all',
    ageGroup: 'adult',
    duration: 15,
    captureStart: 11,
    captureEnd: 14,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  },
  {
    id: 'ad-006',
    filename: 'gaming-console.mp4',
    title: 'NexGen Gaming',
    gender: 'all',
    ageGroup: 'young',
    duration: 15,
    captureStart: 11,
    captureEnd: 14,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
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
    const ageMatch = !ageGroup || ad.ageGroup === 'all' || ad.ageGroup === ageGroup;
    return genderMatch && ageMatch;
  });
};
