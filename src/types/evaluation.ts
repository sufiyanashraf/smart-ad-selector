/**
 * Model Evaluation Types
 * 
 * Types for tracking detection accuracy and model performance.
 */

export interface GroundTruthEntry {
  id: string;
  timestamp: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Detection values
  detectedGender: 'male' | 'female';
  detectedAgeGroup: 'child' | 'teen' | 'youngAdult' | 'middleAged' | 'senior';
  detectedConfidence: number;
  detectedFaceScore: number;
  // Ground truth (user-corrected)
  actualGender: 'male' | 'female';
  actualAgeGroup: 'child' | 'teen' | 'youngAdult' | 'middleAged' | 'senior';
  isFalsePositive: boolean; // Not a real face
}

export interface EvaluationSession {
  id: string;
  name: string;
  createdAt: number;
  entries: GroundTruthEntry[];
}

export interface EvaluationMetrics {
  totalSamples: number;
  // Gender metrics
  genderAccuracy: number;
  maleRecall: number;      // % of actual males detected as male
  femaleRecall: number;    // % of actual females detected as female
  malePrecision: number;   // % of male detections that are actually male
  femalePrecision: number; // % of female detections that are actually female
  // Age metrics
  ageAccuracy: number;
  childAccuracy: number;
  teenAccuracy: number;
  youngAdultAccuracy: number;
  middleAgedAccuracy: number;
  seniorAccuracy: number;
  // False positive metrics
  falsePositiveRate: number;
  trueDetectionRate: number;
  // Confidence analysis
  avgConfidenceCorrect: number;
  avgConfidenceIncorrect: number;
}

export interface ConfusionMatrix {
  // Gender: [predicted][actual]
  gender: {
    maleAsMale: number;
    maleAsFemale: number;
    femaleAsMale: number;
    femaleAsFemale: number;
  };
  // Age: [predicted][actual]
  age: {
    childAsChild: number;
    childAsTeen: number;
    childAsYoungAdult: number;
    childAsMiddleAged: number;
    childAsSenior: number;
    teenAsChild: number;
    teenAsTeen: number;
    teenAsYoungAdult: number;
    teenAsMiddleAged: number;
    teenAsSenior: number;
    youngAdultAsChild: number;
    youngAdultAsTeen: number;
    youngAdultAsYoungAdult: number;
    youngAdultAsMiddleAged: number;
    youngAdultAsSenior: number;
    middleAgedAsChild: number;
    middleAgedAsTeen: number;
    middleAgedAsYoungAdult: number;
    middleAgedAsMiddleAged: number;
    middleAgedAsSenior: number;
    seniorAsChild: number;
    seniorAsTeen: number;
    seniorAsYoungAdult: number;
    seniorAsMiddleAged: number;
    seniorAsSenior: number;
  };
}

export function calculateMetrics(entries: GroundTruthEntry[]): EvaluationMetrics {
  if (entries.length === 0) {
    return {
      totalSamples: 0,
      genderAccuracy: 0,
      maleRecall: 0,
      femaleRecall: 0,
      malePrecision: 0,
      femalePrecision: 0,
      ageAccuracy: 0,
      childAccuracy: 0,
      teenAccuracy: 0,
      youngAdultAccuracy: 0,
      middleAgedAccuracy: 0,
      seniorAccuracy: 0,
      falsePositiveRate: 0,
      trueDetectionRate: 0,
      avgConfidenceCorrect: 0,
      avgConfidenceIncorrect: 0,
    };
  }

  const realFaces = entries.filter(e => !e.isFalsePositive);
  const falsePositives = entries.filter(e => e.isFalsePositive);
  
  // Gender accuracy
  const genderCorrect = realFaces.filter(e => e.detectedGender === e.actualGender);
  const genderAccuracy = realFaces.length > 0 ? genderCorrect.length / realFaces.length : 0;
  
  // Male recall/precision
  const actualMales = realFaces.filter(e => e.actualGender === 'male');
  const detectedMales = realFaces.filter(e => e.detectedGender === 'male');
  const truePositiveMales = actualMales.filter(e => e.detectedGender === 'male');
  const maleRecall = actualMales.length > 0 ? truePositiveMales.length / actualMales.length : 0;
  const malePrecision = detectedMales.length > 0 ? truePositiveMales.length / detectedMales.length : 0;
  
  // Female recall/precision
  const actualFemales = realFaces.filter(e => e.actualGender === 'female');
  const detectedFemales = realFaces.filter(e => e.detectedGender === 'female');
  const truePositiveFemales = actualFemales.filter(e => e.detectedGender === 'female');
  const femaleRecall = actualFemales.length > 0 ? truePositiveFemales.length / actualFemales.length : 0;
  const femalePrecision = detectedFemales.length > 0 ? truePositiveFemales.length / detectedFemales.length : 0;
  
  // Age accuracy
  const ageCorrect = realFaces.filter(e => e.detectedAgeGroup === e.actualAgeGroup);
  const ageAccuracy = realFaces.length > 0 ? ageCorrect.length / realFaces.length : 0;
  
  // Per-age-group accuracy
  const children = realFaces.filter(e => e.actualAgeGroup === 'child');
  const childCorrect = children.filter(e => e.detectedAgeGroup === 'child');
  const childAccuracy = children.length > 0 ? childCorrect.length / children.length : 0;
  
  const teens = realFaces.filter(e => e.actualAgeGroup === 'teen');
  const teenCorrect = teens.filter(e => e.detectedAgeGroup === 'teen');
  const teenAccuracy = teens.length > 0 ? teenCorrect.length / teens.length : 0;
  
  const youngAdults = realFaces.filter(e => e.actualAgeGroup === 'youngAdult');
  const youngAdultCorrect = youngAdults.filter(e => e.detectedAgeGroup === 'youngAdult');
  const youngAdultAccuracy = youngAdults.length > 0 ? youngAdultCorrect.length / youngAdults.length : 0;
  
  const middleAgeds = realFaces.filter(e => e.actualAgeGroup === 'middleAged');
  const middleAgedCorrect = middleAgeds.filter(e => e.detectedAgeGroup === 'middleAged');
  const middleAgedAccuracy = middleAgeds.length > 0 ? middleAgedCorrect.length / middleAgeds.length : 0;
  
  const seniors = realFaces.filter(e => e.actualAgeGroup === 'senior');
  const seniorCorrect = seniors.filter(e => e.detectedAgeGroup === 'senior');
  const seniorAccuracy = seniors.length > 0 ? seniorCorrect.length / seniors.length : 0;
  
  // False positive rate
  const falsePositiveRate = entries.length > 0 ? falsePositives.length / entries.length : 0;
  const trueDetectionRate = 1 - falsePositiveRate;
  
  // Confidence analysis
  const correctEntries = realFaces.filter(e => e.detectedGender === e.actualGender);
  const incorrectEntries = realFaces.filter(e => e.detectedGender !== e.actualGender);
  const avgConfidenceCorrect = correctEntries.length > 0 
    ? correctEntries.reduce((sum, e) => sum + e.detectedConfidence, 0) / correctEntries.length 
    : 0;
  const avgConfidenceIncorrect = incorrectEntries.length > 0 
    ? incorrectEntries.reduce((sum, e) => sum + e.detectedConfidence, 0) / incorrectEntries.length 
    : 0;
  
  return {
    totalSamples: entries.length,
    genderAccuracy,
    maleRecall,
    femaleRecall,
    malePrecision,
    femalePrecision,
    ageAccuracy,
    childAccuracy,
    teenAccuracy,
    youngAdultAccuracy,
    middleAgedAccuracy,
    seniorAccuracy,
    falsePositiveRate,
    trueDetectionRate,
    avgConfidenceCorrect,
    avgConfidenceIncorrect,
  };
}

export function calculateConfusionMatrix(entries: GroundTruthEntry[]): ConfusionMatrix {
  const realFaces = entries.filter(e => !e.isFalsePositive);
  
  return {
    gender: {
      maleAsMale: realFaces.filter(e => e.detectedGender === 'male' && e.actualGender === 'male').length,
      maleAsFemale: realFaces.filter(e => e.detectedGender === 'male' && e.actualGender === 'female').length,
      femaleAsMale: realFaces.filter(e => e.detectedGender === 'female' && e.actualGender === 'male').length,
      femaleAsFemale: realFaces.filter(e => e.detectedGender === 'female' && e.actualGender === 'female').length,
    },
    age: {
      childAsChild: realFaces.filter(e => e.detectedAgeGroup === 'child' && e.actualAgeGroup === 'child').length,
      childAsTeen: realFaces.filter(e => e.detectedAgeGroup === 'child' && e.actualAgeGroup === 'teen').length,
      childAsYoungAdult: realFaces.filter(e => e.detectedAgeGroup === 'child' && e.actualAgeGroup === 'youngAdult').length,
      childAsMiddleAged: realFaces.filter(e => e.detectedAgeGroup === 'child' && e.actualAgeGroup === 'middleAged').length,
      childAsSenior: realFaces.filter(e => e.detectedAgeGroup === 'child' && e.actualAgeGroup === 'senior').length,
      teenAsChild: realFaces.filter(e => e.detectedAgeGroup === 'teen' && e.actualAgeGroup === 'child').length,
      teenAsTeen: realFaces.filter(e => e.detectedAgeGroup === 'teen' && e.actualAgeGroup === 'teen').length,
      teenAsYoungAdult: realFaces.filter(e => e.detectedAgeGroup === 'teen' && e.actualAgeGroup === 'youngAdult').length,
      teenAsMiddleAged: realFaces.filter(e => e.detectedAgeGroup === 'teen' && e.actualAgeGroup === 'middleAged').length,
      teenAsSenior: realFaces.filter(e => e.detectedAgeGroup === 'teen' && e.actualAgeGroup === 'senior').length,
      youngAdultAsChild: realFaces.filter(e => e.detectedAgeGroup === 'youngAdult' && e.actualAgeGroup === 'child').length,
      youngAdultAsTeen: realFaces.filter(e => e.detectedAgeGroup === 'youngAdult' && e.actualAgeGroup === 'teen').length,
      youngAdultAsYoungAdult: realFaces.filter(e => e.detectedAgeGroup === 'youngAdult' && e.actualAgeGroup === 'youngAdult').length,
      youngAdultAsMiddleAged: realFaces.filter(e => e.detectedAgeGroup === 'youngAdult' && e.actualAgeGroup === 'middleAged').length,
      youngAdultAsSenior: realFaces.filter(e => e.detectedAgeGroup === 'youngAdult' && e.actualAgeGroup === 'senior').length,
      middleAgedAsChild: realFaces.filter(e => e.detectedAgeGroup === 'middleAged' && e.actualAgeGroup === 'child').length,
      middleAgedAsTeen: realFaces.filter(e => e.detectedAgeGroup === 'middleAged' && e.actualAgeGroup === 'teen').length,
      middleAgedAsYoungAdult: realFaces.filter(e => e.detectedAgeGroup === 'middleAged' && e.actualAgeGroup === 'youngAdult').length,
      middleAgedAsMiddleAged: realFaces.filter(e => e.detectedAgeGroup === 'middleAged' && e.actualAgeGroup === 'middleAged').length,
      middleAgedAsSenior: realFaces.filter(e => e.detectedAgeGroup === 'middleAged' && e.actualAgeGroup === 'senior').length,
      seniorAsChild: realFaces.filter(e => e.detectedAgeGroup === 'senior' && e.actualAgeGroup === 'child').length,
      seniorAsTeen: realFaces.filter(e => e.detectedAgeGroup === 'senior' && e.actualAgeGroup === 'teen').length,
      seniorAsYoungAdult: realFaces.filter(e => e.detectedAgeGroup === 'senior' && e.actualAgeGroup === 'youngAdult').length,
      seniorAsMiddleAged: realFaces.filter(e => e.detectedAgeGroup === 'senior' && e.actualAgeGroup === 'middleAged').length,
      seniorAsSenior: realFaces.filter(e => e.detectedAgeGroup === 'senior' && e.actualAgeGroup === 'senior').length,
    },
  };
}
