import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Button from '../ui/Button';
import { useVendorAnalytics } from '../../hooks/useVendorAnalytics';

interface VendorAnalyticsPanelProps {
  vendors: any[];
  onVendorAction: (vendorId: string, action: string) => void;
}

const VendorAnalyticsPanel: React.FC<VendorAnalyticsPanelProps> = ({ 
  vendors, 
  onVendorAction 
}) => {
  const { 
    insights, 
    isAnalyzing, 
    generateBulkInsights, 
    getStuckVendors,
  } = useVendorAnalytics();
  
  const [expandedInsights, setExpandedInsights] = useState<{ [key: string]: boolean }>({});
  const [showAllInsights, setShowAllInsights] = useState(false);

  useEffect(() => {
    // Auto-analyze vendors on component mount
    generateBulkInsights(vendors);
  }, [vendors]);

  const stuckVendors = getStuckVendors(vendors);
  const totalInsights = Object.values(insights).flat().length;
  const highPriorityInsights = Object.values(insights).flat().filter(i => i.priority === 'high').length;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-error-500" />;
      case 'suggestion':
        return <Lightbulb className="h-5 w-5 text-primary-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      default:
        return <Clock className="h-5 w-5 text-neutral-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-warning-50 border-warning-200';
      case 'error':
        return 'bg-error-50 border-error-200';
      case 'suggestion':
        return 'bg-primary-50 border-primary-200';
      case 'success':
        return 'bg-success-50 border-success-200';
      default:
        return 'bg-neutral-50 border-neutral-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-error-100 text-error-700';
      case 'medium':
        return 'bg-warning-100 text-warning-700';
      case 'low':
        return 'bg-success-100 text-success-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const toggleInsightExpansion = (insightKey: string) => {
    setExpandedInsights(prev => ({
      ...prev,
      [insightKey]: !prev[insightKey]
    }));
  };

  const handleActionClick = (vendorId: string, action: string) => {
    onVendorAction(vendorId, action);
  };

  const allInsights = Object.entries(insights).flatMap(([vendorId, vendorInsights]) =>
    vendorInsights.map(insight => ({ ...insight, vendorId }))
  ).sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const displayedInsights = showAllInsights ? allInsights : allInsights.slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Brain className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-neutral-900">AI Onboarding Analytics</h2>
            <p className="text-sm text-neutral-500">
              Intelligent insights and recommendations for vendor onboarding
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isAnalyzing && (
            <div className="flex items-center text-primary-600">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Analyzing...</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={16} />}
            onClick={() => generateBulkInsights(vendors)}
            disabled={isAnalyzing}
          >
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-error-50 to-error-100 p-4 rounded-lg border border-error-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-error-700">Stuck Vendors</p>
              <p className="text-2xl font-semibold text-error-900">{stuckVendors.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-error-500" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-warning-50 to-warning-100 p-4 rounded-lg border border-warning-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-warning-700">High Priority Issues</p>
              <p className="text-2xl font-semibold text-warning-900">{highPriorityInsights}</p>
            </div>
            <Target className="h-8 w-8 text-warning-500" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-4 rounded-lg border border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700">Total Insights</p>
              <p className="text-2xl font-semibold text-primary-900">{totalInsights}</p>
            </div>
            <Lightbulb className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-success-50 to-success-100 p-4 rounded-lg border border-success-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-success-700">Avg. Completion</p>
              <p className="text-2xl font-semibold text-success-900">12 days</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success-500" />
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-neutral-900">AI-Generated Insights</h3>
          {allInsights.length > 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllInsights(!showAllInsights)}
              rightIcon={showAllInsights ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            >
              {showAllInsights ? 'Show Less' : `Show All (${allInsights.length})`}
            </Button>
          )}
        </div>

        {displayedInsights.length === 0 && !isAnalyzing && (
          <div className="text-center py-8 text-neutral-500">
            <Brain className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p>No insights available. Click "Refresh Analysis" to generate AI recommendations.</p>
          </div>
        )}

        {displayedInsights.map((insight, index) => {
          const vendor = vendors.find(v => v.id === insight.vendorId);
          const insightKey = `${insight.vendorId}-${index}`;
          const isExpanded = expandedInsights[insightKey];

          return (
            <div
              key={insightKey}
              className={`border rounded-lg p-4 ${getInsightColor(insight.type)} transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-neutral-900">{insight.title}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(insight.priority)}`}>
                        {insight.priority}
                      </span>
                      {vendor && (
                        <span className="text-xs text-neutral-500">
                          • {vendor.companyName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-700 mb-3">{insight.description}</p>
                    
                    {insight.estimatedImpact && (
                      <div className="bg-white bg-opacity-50 rounded-md p-2 mb-3">
                        <p className="text-xs text-neutral-600">
                          <strong>Estimated Impact:</strong> {insight.estimatedImpact}
                        </p>
                      </div>
                    )}

                    {isExpanded && insight.suggestedActions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-neutral-800">Suggested Actions:</p>
                        <div className="space-y-2">
                          {insight.suggestedActions.map((action, actionIndex) => {
                            const key = `${actionIndex}`;
                            return (
                              <div key={key} className="flex items-center justify-between bg-white bg-opacity-50 rounded-md p-2">
                                <span className="text-sm text-neutral-700">{action}</span>
                                {insight.actionable && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActionClick(insight.vendorId, action)}
                                    className="ml-2"
                                  >
                                    Execute
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {insight.suggestedActions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleInsightExpansion(insightKey)}
                      rightIcon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    >
                      {isExpanded ? 'Less' : 'Actions'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions for Stuck Vendors */}
      {stuckVendors.length > 0 && (
        <div className="mt-6 p-4 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <h4 className="font-medium text-error-900">Vendors Requiring Immediate Attention</h4>
          </div>
          <div className="space-y-2">
            {stuckVendors.slice(0, 3).map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between bg-white rounded-md p-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{vendor.companyName}</p>
                  <p className="text-xs text-neutral-500">
                    Stuck in {vendor.onboardingPhase.replace('_', ' ')} phase
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActionClick(vendor.id, 'send_reminder')}
                  >
                    Send Reminder
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleActionClick(vendor.id, 'escalate')}
                  >
                    Escalate
                  </Button>
                </div>
              </div>
            ))}
            {stuckVendors.length > 3 && (
              <p className="text-xs text-error-600 text-center pt-2">
                +{stuckVendors.length - 3} more vendors need attention
              </p>
            )}
          </div>
        </div>
      )}

      {/* Performance Predictions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <h4 className="font-medium text-primary-900 mb-2">Onboarding Efficiency</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-primary-700">Average Time to Complete</span>
              <span className="text-sm font-medium text-primary-900">12 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-700">Success Rate</span>
              <span className="text-sm font-medium text-primary-900">94%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-primary-700">Bottleneck Phase</span>
              <span className="text-sm font-medium text-primary-900">Due Diligence</span>
            </div>
          </div>
        </div>

        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <h4 className="font-medium text-success-900 mb-2">Optimization Opportunities</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-success-700">Potential Time Savings</span>
              <span className="text-sm font-medium text-success-900">3-5 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-success-700">Document Automation</span>
              <span className="text-sm font-medium text-success-900">67% ready</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-success-700">Process Efficiency</span>
              <span className="text-sm font-medium text-success-900">+15% possible</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations Summary */}
      <div className="mt-6 bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Brain className="h-5 w-5 text-primary-600" />
          <h4 className="font-medium text-primary-900">AI Process Optimization</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-primary-900">85%</p>
            <p className="text-xs text-primary-700">Automation Potential</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-success-900">-40%</p>
            <p className="text-xs text-success-700">Time Reduction Possible</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-secondary-900">98%</p>
            <p className="text-xs text-secondary-700">Predicted Success Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsPanel;