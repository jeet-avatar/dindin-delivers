import React from 'react';
import { 
  FileText, 
  ShoppingCart, 
  User, 
  Settings,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RotateCw
} from 'lucide-react';
import { ActivityItem } from '../../constants/types';
import { format, isToday, isYesterday } from 'date-fns';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getActivityIcon = (activity: ActivityItem) => {
    // Icon based on activity type
    switch (activity.type) {
      case 'document':
        return <FileText className="h-5 w-5 text-secondary-500" />;
      case 'transaction':
        return <ShoppingCart className="h-5 w-5 text-primary-500" />;
      case 'profile':
        return <User className="h-5 w-5 text-secondary-600" />;
      case 'system':
        return <Settings className="h-5 w-5 text-neutral-500" />;
      default:
        return <FileText className="h-5 w-5 text-neutral-500" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-success-500" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-warning-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-error-500" />;
      case 'paid':
        return <CheckCircle2 className="h-4 w-4 text-success-500" />;
      case 'submitted':
        return <RotateCw className="h-4 w-4 text-secondary-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-neutral-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200">
        <h2 className="font-medium text-neutral-900">Recent Activity</h2>
      </div>
      <ul className="divide-y divide-neutral-200">
        {activities.map((activity) => (
          <li key={activity.id} className="p-4 hover:bg-neutral-50 transition-colors duration-150">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {activity.user}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(activity.date)}
                  </p>
                </div>
                <p className="text-sm text-neutral-600">
                  {activity.description}
                </p>
                {activity.status && (
                  <div className="mt-2 flex items-center">
                    {getStatusIcon(activity.status)}
                    <span className="ml-1 text-xs font-medium capitalize text-neutral-500">
                      {activity.status.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {activities.length === 0 && (
        <div className="py-8 text-center text-neutral-500">
          No recent activity
        </div>
      )}
      <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200">
        <button
          type="button"
          className="text-sm font-medium text-secondary-600 hover:text-secondary-800 bg-transparent border-none p-0 cursor-pointer"
          aria-label="View all activity"
        >
          View all activity
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;