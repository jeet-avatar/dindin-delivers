import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertCircle, Info, CheckCircle, X } from 'lucide-react';
import { Notification } from '../../constants/types';
import { format, isToday, isYesterday } from 'date-fns';

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ 
  notifications, 
  onClose 
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      default:
        return <Info className="h-5 w-5 text-secondary-500" />;
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
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 overflow-hidden animate-slide-down"
    >
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-neutral-800">Notifications</h3>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
            <p>No notifications</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                to={notification.actionUrl || '#'}
                onClick={onClose}
                className={`block p-4 hover:bg-neutral-50 border-b border-neutral-100 transition-colors duration-150 ${
                  !notification.read ? 'bg-neutral-50' : ''
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${!notification.read ? 'text-neutral-900' : 'text-neutral-700'}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-neutral-500 mt-1">{notification.message}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {formatDate(notification.date)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="ml-2 h-2 w-2 bg-primary-500 rounded-full" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-2 border-t border-neutral-200 bg-neutral-50">
        <Link 
          to="/notifications"
          onClick={onClose}
          className="block w-full text-center text-sm text-secondary-600 hover:text-secondary-700 py-1"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
};

export default NotificationDropdown;