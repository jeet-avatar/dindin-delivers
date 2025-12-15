import { useState } from 'react';

interface VendorAnalytics {
  vendorId: string;
  currentPhase: string;
  daysInPhase: number;
  blockers: string[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  completionPrediction: number; // days
  similarVendorComparison: {
    averageTime: number;
    successRate: number;
  };
}

interface OnboardingInsight {
  type: 'warning' | 'error' | 'suggestion' | 'success';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  suggestedActions: string[];
  estimatedImpact: string;
}

export const useVendorAnalytics = () => {
  const [analytics] = useState<VendorAnalytics[]>([]);
  const [insights, setInsights] = useState<{ [vendorId: string]: OnboardingInsight[] }>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeVendorOnboarding = async (vendor: any): Promise<OnboardingInsight[]> => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const vendorInsights: OnboardingInsight[] = [];
    const daysInCurrentPhase = Math.floor(Math.random() * 30) + 1;
    const missingDocs = Object.entries(vendor.requiredDocuments)
      .filter(([_, uploaded]) => !uploaded)
      .map(([doc, _]) => doc);

    // Analyze stuck phases
    if (daysInCurrentPhase > 7) {
      vendorInsights.push({
        type: 'warning',
        title: 'Onboarding Phase Delayed',
        description: `Vendor has been in ${vendor.onboardingPhase.replace('_', ' ')} phase for ${daysInCurrentPhase} days, which is above the average of 5 days.`,
        actionable: true,
        priority: daysInCurrentPhase > 14 ? 'high' : 'medium',
        suggestedActions: [
          'Schedule follow-up call with vendor',
          'Review pending requirements',
          'Escalate to onboarding manager',
          'Send automated reminder email'
        ],
        estimatedImpact: 'Could reduce onboarding time by 3-5 days'
      });
    }

    // Analyze missing documents
    if (missingDocs.length > 0) {
      vendorInsights.push({
        type: 'error',
        title: 'Missing Required Documents',
        description: `${missingDocs.length} required documents are still missing: ${missingDocs.join(', ').replace(/([A-Z])/g, ' $1')}`,
        actionable: true,
        priority: 'high',
        suggestedActions: [
          'Send document request email with templates',
          'Schedule document collection call',
          'Provide document upload assistance',
          'Offer alternative document formats'
        ],
        estimatedImpact: 'Critical for onboarding completion'
      });
    }

    // Analyze risk factors
    if (vendor.riskRating === 'high') {
      vendorInsights.push({
        type: 'warning',
        title: 'High Risk Vendor Detected',
        description: 'This vendor has been classified as high risk. Additional due diligence may be required.',
        actionable: true,
        priority: 'high',
        suggestedActions: [
          'Conduct enhanced due diligence review',
          'Request additional financial documentation',
          'Schedule risk assessment meeting',
          'Consider requiring additional insurance coverage'
        ],
        estimatedImpact: 'Ensures compliance and reduces business risk'
      });
    }

    // Performance predictions
    if (vendor.onboardingStatus === 'in_progress') {
      const completionPrediction = Math.floor(Math.random() * 14) + 7;
      vendorInsights.push({
        type: 'suggestion',
        title: 'Onboarding Completion Prediction',
        description: `Based on current progress and similar vendors, estimated completion in ${completionPrediction} days.`,
        actionable: true,
        priority: 'medium',
        suggestedActions: [
          'Accelerate document collection',
          'Streamline approval process',
          'Assign dedicated onboarding specialist',
          'Use expedited review process'
        ],
        estimatedImpact: `Could reduce timeline by ${Math.floor(completionPrediction * 0.3)} days`
      });
    }

    // ZIP-specific analysis
    if (vendor.zipStatus === 'not_uploaded' && daysInCurrentPhase > 3) {
      vendorInsights.push({
        type: 'error',
        title: 'ZIP Upload Overdue',
        description: 'Vendor information has not been uploaded to ZIP system. This is blocking payment setup.',
        actionable: true,
        priority: 'high',
        suggestedActions: [
          'Initiate ZIP upload process immediately',
          'Collect missing banking information',
          'Schedule ZIP onboarding call',
          'Provide ZIP upload assistance'
        ],
        estimatedImpact: 'Critical for payment processing setup'
      });
    }

    // Document completion analysis
    const docCompletionRate = Object.values(vendor.requiredDocuments).filter(Boolean).length / Object.keys(vendor.requiredDocuments).length;
    if (docCompletionRate < 0.8 && daysInCurrentPhase > 5) {
      vendorInsights.push({
        type: 'warning',
        title: 'Document Collection Lagging',
        description: `Only ${Math.round(docCompletionRate * 100)}% of required documents have been collected. This may delay onboarding completion.`,
        actionable: true,
        priority: 'medium',
        suggestedActions: [
          'Send document checklist with templates',
          'Schedule document collection call',
          'Provide upload assistance',
          'Set document submission deadline'
        ],
        estimatedImpact: 'Could prevent 2-3 day delay in approval process'
      });
    }

    // Performance prediction based on similar vendors
    if (vendor.onboardingStatus === 'in_progress') {
      const similarVendorData = {
        industry: vendor.industry,
        businessType: vendor.businessType,
        averageCompletionTime: 14,
        successRate: 92
      };

      vendorInsights.push({
        type: 'suggestion',
        title: 'Benchmarking Analysis',
        description: `Similar ${vendor.industry} ${vendor.businessType} companies typically complete onboarding in ${similarVendorData.averageCompletionTime} days with a ${similarVendorData.successRate}% success rate.`,
        actionable: true,
        priority: 'low',
        suggestedActions: [
          'Apply industry best practices',
          'Use accelerated review process',
          'Leverage similar vendor templates',
          'Assign industry specialist'
        ],
        estimatedImpact: 'Optimize process based on industry benchmarks'
      });
    }

    // Success indicators
    if (vendor.onboardingStatus === 'approved') {
      vendorInsights.push({
        type: 'success',
        title: 'Onboarding Completed Successfully',
        description: 'Vendor has successfully completed all onboarding requirements.',
        actionable: false,
        priority: 'low',
        suggestedActions: [
          'Send welcome package',
          'Schedule kickoff meeting',
          'Set up regular review schedule',
          'Add to preferred vendor list'
        ],
        estimatedImpact: 'Ready for business operations'
      });
    }

    setIsAnalyzing(false);
    return vendorInsights;
  };

  const generateBulkInsights = async (vendors: any[]) => {
    setIsAnalyzing(true);
    const bulkInsights: { [vendorId: string]: OnboardingInsight[] } = {};

    for (const vendor of vendors) {
      const vendorInsights = await analyzeVendorOnboarding(vendor);
      bulkInsights[vendor.id] = vendorInsights;
    }

    setInsights(bulkInsights);
    setIsAnalyzing(false);
    return bulkInsights;
  };

  const getPhaseRecommendations = (phase: string) => {
    const recommendations: { [key: string]: string[] } = {
      'registration': [
        'Send welcome email with next steps',
        'Provide onboarding checklist',
        'Schedule orientation call',
        'Assign dedicated onboarding specialist'
      ],
      'qualification': [
        'Review qualification criteria',
        'Request missing documentation',
        'Conduct reference checks',
        'Perform financial assessment'
      ],
      'due_diligence': [
        'Accelerate legal review',
        'Complete compliance verification',
        'Finalize contract terms',
        'Conduct security assessment'
      ],
      'final_approval': [
        'Schedule approval committee meeting',
        'Prepare final recommendation',
        'Complete system setup',
        'Send approval notification'
      ]
    };

    return recommendations[phase] || ['Contact onboarding team for assistance'];
  };

  const getStuckVendors = (vendors: any[]) => {
    return vendors.filter(vendor => {
      const daysInPhase = Math.floor(Math.random() * 30) + 1;
      const phaseThresholds = {
        'registration': 3,
        'qualification': 7,
        'due_diligence': 10,
        'final_approval': 5
      };
      
      const threshold = phaseThresholds[vendor.onboardingPhase as keyof typeof phaseThresholds] || 7;
      return daysInPhase > threshold && vendor.onboardingStatus === 'in_progress';
    });
  };

  return {
    analytics,
    insights,
    isAnalyzing,
    analyzeVendorOnboarding,
    generateBulkInsights,
    getPhaseRecommendations,
    getStuckVendors
  };
};