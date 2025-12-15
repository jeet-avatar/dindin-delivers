import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Brain,
} from 'lucide-react';
import Button from '../ui/Button';

interface OnboardingInsight {
  type: 'warning' | 'error' | 'suggestion' | 'success';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  suggestedActions: string[];
  estimatedImpact: string;
}

interface VendorInsightCardProps {
  vendor: any;
  insights: OnboardingInsight[];
  onActionClick: (vendorId: string, action: string) => void;
}

const VendorInsightCard: React.FC<VendorInsightCardProps> = ({ 
  vendor, 
  insights, 
  onActionClick 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (insights.length === 0) return null;

  const highPriorityInsights = insights.filter(i => i.priority === 'high');
  const hasHighPriority = highPriorityInsights.length > 0;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-error-500" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-primary-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-500" />;
    }
  };

  const getCardColor = () => {
    if (hasHighPriority) {
      return 'border-error-200 bg-error-50';
    }
    const hasWarnings = insights.some(i => i.type === 'warning');
    if (hasWarnings) {
      return 'border-warning-200 bg-warning-50';
    }
    return 'border-primary-200 bg-primary-50';
  };

  const primaryInsight = hasHighPriority ? highPriorityInsights[0] : insights[0];

  return (
    <div className={`border rounded-lg p-4 ${getCardColor()} transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <div className="p-1.5 bg-white rounded-md">
            <Brain className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h4 className="font-medium text-neutral-900">{vendor.companyName}</h4>
            <p className="text-sm text-neutral-600">
              {insights.length} insight{insights.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          rightIcon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        >
          {isExpanded ? 'Less' : 'More'}
        </Button>
      </div>

      {/* Primary Insight */}
      <div className="bg-white bg-opacity-70 rounded-md p-3 mb-3">
        <div className="flex items-start space-x-2">
          {getInsightIcon(primaryInsight.type)}
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-900">{primaryInsight.title}</p>
            <p className="text-xs text-neutral-600 mt-1">{primaryInsight.description}</p>
            {primaryInsight.estimatedImpact && (
              <p className="text-xs text-primary-600 mt-1">
                <strong>Impact:</strong> {primaryInsight.estimatedImpact}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="space-y-3">
          {insights.slice(1).map((insight, index) => {
            const key = `${index}`;
            return (
              <div key={key} className="bg-white bg-opacity-70 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">{insight.title}</p>
                    <p className="text-xs text-neutral-600 mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Actions */}
          <div className="bg-white bg-opacity-70 rounded-md p-3">
            <p className="text-sm font-medium text-neutral-900 mb-2">Quick Actions:</p>
            <div className="flex flex-wrap gap-2">
              {primaryInsight.suggestedActions.slice(0, 3).map((action, index) => {
                const key = `${index}`;
                return (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => onActionClick(vendor.id, action)}
                    className="text-xs"
                  >
                    {action}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Primary Action */}
      {primaryInsight.actionable && (
        <div className="flex justify-end mt-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onActionClick(vendor.id, primaryInsight.suggestedActions[0])}
            rightIcon={<ArrowRight size={14} />}
          >
            {primaryInsight.suggestedActions[0]?.split(' ').slice(0, 2).join(' ') || 'Take Action'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VendorInsightCard;