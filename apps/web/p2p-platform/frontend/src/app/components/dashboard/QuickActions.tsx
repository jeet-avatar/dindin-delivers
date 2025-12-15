import React from 'react';
import { 
  PlusCircle, 
  FileUp, 
  ShieldCheck, 
  CheckSquare
} from 'lucide-react';
import Button from '../ui/Button';

const QuickActions: React.FC = () => {
  const actions = [
    {
      name: 'Create Invoice',
      icon: <PlusCircle size={18} />,
      href: '/transactions/create/invoice',
      variant: 'primary' as const,
    },
    {
      name: 'Upload Tax Document',
      icon: <FileUp size={18} />,
      href: '/documents/upload/tax',
      variant: 'outline' as const,
    },
    {
      name: 'Upload Security Certificate',
      icon: <ShieldCheck size={18} />,
      href: '/documents/upload/security',
      variant: 'outline' as const,
    },
    {
      name: 'Accept PO',
      icon: <CheckSquare size={18} />,
      href: '/transactions/accept-po',
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200">
        <h2 className="font-medium text-neutral-900">Quick Actions</h2>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const key = `${index}`;
          return (
            <Button
              key={key}
              variant={action.variant}
              leftIcon={action.icon}
              onClick={() => window.location.href = action.href}
              fullWidth
              className="justify-start"
            >
              {action.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;