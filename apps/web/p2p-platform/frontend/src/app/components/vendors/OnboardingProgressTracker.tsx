import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Brain,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Button from '../ui/Button';
import { useVendorAnalytics } from '../../hooks/useVendorAnalytics';

interface OnboardingProgressTrackerProps {
  vendor: any;
  onActionClick: (vendorId: string, action: string) => void;
}

const OnboardingProgressTracker: React.FC<OnboardingProgressTrackerProps> = ({ 
  vendor, 
  onActionClick 
}) => {
  const { analyzeVendorOnboarding } = useVendorAnalytics();
  const [insights, setInsights] = useState<any[]>([]);
  const [phaseAnalysis, setPhaseAnalysis] = useState<any>(null);

  useEffect(() => {
    const runAnalysis = async () => {
      const vendorInsights = await analyzeVendorOnboarding(vendor);
      setInsights(vendorInsights);
      
      // Generate phase-specific analysis
      const analysis = generatePhaseAnalysis(vendor);
      setPhaseAnalysis(analysis);
    };

    runAnalysis();
  }, [vendor]);

  const generatePhaseAnalysis = (vendor: any) => {
    const daysInPhase = Math.floor(Math.random() * 20) + 1;
    const phase = vendor?.onboardingPhase ?? '';
    let dueVendorStatus = 'pending';

    if (phase === 'due_diligence') {
      dueVendorStatus = 'in_progress';
    } else if (phase === 'final_approval' || phase === 'completed') {
      dueVendorStatus = 'completed';
    }

    let finalVendorStatus = 'pending';
    if (phase === 'final_approval') {
      finalVendorStatus = 'in_progress';
    } else if (phase === 'completed') {
      finalVendorStatus = 'completed';
    }

    const phases = [
      { 
        id: 'registration', 
        title: 'Registration', 
        status: 'completed',
        duration: 2,
        benchmark: 1,
        efficiency: 'good'
      },
      { 
        id: 'qualification', 
        title: 'Qualification', 
        status: vendor.onboardingPhase === 'qualification' ? 'in_progress' : 'completed',
        duration: vendor.onboardingPhase === 'qualification' ? daysInPhase : 5,
        benchmark: 4,
        efficiency: vendor.onboardingPhase === 'qualification' && daysInPhase > 7 ? 'poor' : 'good'
      },
      { 
        id: 'due_diligence', 
        title: 'Due Diligence', 
        status: dueVendorStatus,
        duration: vendor.onboardingPhase === 'due_diligence' ? daysInPhase : 8,
        benchmark: 7,
        efficiency: vendor.onboardingPhase === 'due_diligence' && daysInPhase > 10 ? 'poor' : 'good'
      },
      { 
        id: 'final_approval', 
        title: 'Final Approval', 
        status: finalVendorStatus,
        duration: vendor.onboardingPhase === 'final_approval' ? daysInPhase : 3,
        benchmark: 2,
        efficiency: vendor.onboardingPhase === 'final_approval' && daysInPhase > 5 ? 'poor' : 'good'
      }
    ];

    return {
      phases,
      totalDuration: phases.reduce((sum, phase) => sum + (phase.status === 'completed' ? phase.duration : 0), 0),
      predictedCompletion: phases.reduce((sum, phase) => sum + phase.benchmark, 0),
      currentBottleneck: phases.find(p => p.status === 'in_progress' && p.efficiency === 'poor')
    };
  };

  const getPhaseStatusIcon = (status: string, efficiency: string) => {
    if (status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-success-500" />;
    } else if (status === 'in_progress') {
      return efficiency === 'poor' ? 
        <AlertTriangle className="h-5 w-5 text-error-500" /> :
        <Clock className="h-5 w-5 text-primary-500" />;
    } else {
      return <Clock className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'good':
        return 'text-success-600';
      case 'poor':
        return 'text-error-600';
      default:
        return 'text-neutral-600';
    }
  };

  if (!phaseAnalysis) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary-600 mr-2" />
        <span className="text-neutral-600">Analyzing onboarding progress...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Summary */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Brain className="h-5 w-5 text-primary-600" />
          <h3 className="font-medium text-primary-900">AI Onboarding Analysis</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-primary-900">{phaseAnalysis.totalDuration}</p>
            <p className="text-xs text-primary-700">Days Elapsed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-secondary-900">{phaseAnalysis.predictedCompletion}</p>
            <p className="text-xs text-secondary-700">Benchmark Days</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-semibold ${
              phaseAnalysis.totalDuration <= phaseAnalysis.predictedCompletion ? 'text-success-900' : 'text-error-900'
            }`}>
              {phaseAnalysis.totalDuration <= phaseAnalysis.predictedCompletion ? 'On Track' : 'Delayed'}
            </p>
            <p className="text-xs text-neutral-700">Status</p>
          </div>
        </div>
      </div>

      {/* Phase Progress with AI Insights */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-neutral-900">Onboarding Progress</h3>
        
        {phaseAnalysis.phases.map((phase: any) => {

          let statusClass       = 'bg-neutral-300';
          let statusWidthStyle  = '0%';
          if (phase.status === 'completed') {
            statusClass         = 'bg-success-500';
            statusWidthStyle    = '100%';
          } else if (phase.status === 'in_progress') {
            statusClass       = 'bg-primary-500';
            if (phase.efficiency === 'poor') {
              statusClass       = 'bg-error-500';
            } 
            statusWidthStyle    = '60%';
          }

          return (
            <div key={phase.id} className="border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getPhaseStatusIcon(phase.status, phase.efficiency)}
                  <div>
                    <h4 className="font-medium text-neutral-900">{phase.title}</h4>
                    <p className="text-sm text-neutral-500 capitalize">
                      {phase.status.replace('_', ' ')}
                      {phase.status === 'in_progress' && (
                        <span className={`ml-2 ${getEfficiencyColor(phase.efficiency)}`}>
                          • {phase.efficiency} pace
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900">
                    {phase.duration} days
                  </p>
                  <p className="text-xs text-neutral-500">
                    Benchmark: {phase.benchmark} days
                  </p>
                </div>
              </div>

              {/* Phase-specific AI recommendations */}
              {phase.status === 'in_progress' && phase.efficiency === 'poor' && (
                <div className="bg-error-50 border border-error-200 rounded-md p-3 mt-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-error-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-error-800">Phase Bottleneck Detected</p>
                      <p className="text-sm text-error-700 mt-1">
                        This phase is taking longer than expected. AI suggests immediate intervention.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getPhaseSpecificActions(phase.id).map((action, actionIndex) => {
                          const key = `${actionIndex}`;
                          return (
                            <Button
                              key={key}
                              variant="outline"
                              size="sm"
                              onClick={() => onActionClick(vendor.id, action)}
                              className="text-xs text-error-600 border-error-300 hover:bg-error-100"
                            >
                              {action}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${statusClass}`}
                    style={{ 
                      width: `${statusWidthStyle}`
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Recommendations */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-neutral-900">AI Recommendations</h3>
          {insights.map((insight, index) => {
            const key = `${index}`;
            let mainInsightClass  = 'border-success-200 bg-success-50';
            let iconInsight       = <CheckCircle className="h-4 w-4 text-success-500" />;

            if (insight.type === 'error') {
              mainInsightClass    = 'border-error-200 bg-error-50';
              iconInsight         = <AlertTriangle className="h-4 w-4 text-error-500" />;  
            } else if (insight.type === 'warning') {
              mainInsightClass    = 'border-warning-200 bg-warning-50';
              iconInsight         = <AlertTriangle className="h-4 w-4 text-warning-500" />;
            } else if (insight.type === 'suggestion') {
              mainInsightClass    = 'border-primary-200 bg-primary-50';
              iconInsight         = <Brain className="h-4 w-4 text-primary-500" />;
            }

            return (
              <div key={key} className={`border rounded-lg p-4 ${mainInsightClass}`}>
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-white rounded-md">
                    {iconInsight}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-900">{insight.title}</h4>
                    <p className="text-sm text-neutral-700 mt-1">{insight.description}</p>
                    {insight.estimatedImpact && (
                      <p className="text-xs text-primary-600 mt-2">
                        <strong>Impact:</strong> {insight.estimatedImpact}
                      </p>
                    )}
                    {insight.actionable && insight.suggestedActions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {insight.suggestedActions.slice(0, 2).map((action: any, actionIndex: number) => {
                          const key = `${actionIndex}`;
                          return (
                            <Button
                              key={key}
                              variant="outline"
                              size="sm"
                              onClick={() => onActionClick?.(vendor.id, action)}
                              rightIcon={<ArrowRight size={14} />}
                              className="text-xs"
                            >
                              {action}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const getPhaseSpecificActions = (phaseId: string): string[] => {
  const actions: { [key: string]: string[] } = {
    'registration': [
      'Send welcome package',
      'Schedule orientation call',
      'Provide registration assistance',
      'Assign onboarding specialist'
    ],
    'qualification': [
      'Request missing documentation',
      'Conduct reference checks',
      'Schedule qualification review',
      'Provide qualification criteria'
    ],
    'due_diligence': [
      'Accelerate legal review',
      'Complete compliance verification',
      'Schedule due diligence meeting',
      'Request additional documentation'
    ],
    'final_approval': [
      'Schedule approval committee meeting',
      'Prepare final recommendation',
      'Complete system setup',
      'Send approval notification'
    ]
  };

  return actions[phaseId] || ['Contact onboarding team'];
};

export default OnboardingProgressTracker;