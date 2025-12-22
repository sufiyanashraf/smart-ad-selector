import { AdMetadata } from '@/types/ad';

// Sample ads with royalty-free video URLs for demonstration
export const sampleAds: AdMetadata[] = [
  {
    id: 'ad-001',
    filename: 'tech-gadgets.mp4',
    title: 'TechPro Gadgets',
    gender: 'male',
    ageGroup: 'young',
    duration: 15,
    captureStart: 3,
    captureEnd: 10,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'ad-002',
    filename: 'luxury-fashion.mp4',
    title: 'Elegance Fashion',
    gender: 'female',
    ageGroup: 'adult',
    duration: 12,
    captureStart: 2,
    captureEnd: 8,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 'ad-003',
    filename: 'sports-energy.mp4',
    title: 'PowerBoost Energy',
    gender: 'male',
    ageGroup: 'young',
    duration: 10,
    captureStart: 2,
    captureEnd: 7,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  {
    id: 'ad-004',
    filename: 'skincare-premium.mp4',
    title: 'GlowUp Skincare',
    gender: 'female',
    ageGroup: 'young',
    duration: 14,
    captureStart: 3,
    captureEnd: 10,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  },
  {
    id: 'ad-005',
    filename: 'financial-services.mp4',
    title: 'WealthGuard Insurance',
    gender: 'all',
    ageGroup: 'adult',
    duration: 16,
    captureStart: 4,
    captureEnd: 12,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  },
  {
    id: 'ad-006',
    filename: 'gaming-console.mp4',
    title: 'NexGen Gaming',
    gender: 'all',
    ageGroup: 'young',
    duration: 11,
    captureStart: 2,
    captureEnd: 8,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  },
];

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
