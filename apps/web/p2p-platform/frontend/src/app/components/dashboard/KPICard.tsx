import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { KPI } from '../../constants/types';

interface KPICardProps {
  kpi: KPI;
}

const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const getTrendIcon = () => {
    switch (kpi.trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-success-500" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-error-500" />;
      default:
        return <Minus className="h-4 w-4 text-neutral-400" />;
    }
  };

  const getTrendTextColor = () => {
    switch (kpi.trend) {
      case 'up':
        return 'text-success-600';
      case 'down':
        return 'text-error-600';
      default:
        return 'text-neutral-500';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-300 animate-fade-in">
      <div className="flex flex-col">
        <h3 className="text-sm font-medium text-neutral-500">{kpi.title}</h3>
        <div className="mt-2 flex items-baseline">
          <p className="text-2xl font-semibold text-neutral-900">{kpi.value}</p>
          {kpi.change && (
            <div className="ml-2 flex items-center text-sm">
              <span className={getTrendTextColor()}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
              <span className="ml-1">{getTrendIcon()}</span>
            </div>
          )}
        </div>
        {kpi.period && (
          <p className="mt-1 text-xs text-neutral-400">{kpi.period}</p>
        )}
      </div>
    </div>
  );
};

export default KPICard;