import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
interface EditableFieldProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'email' | 'date' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder,
  className = '',
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (disabled) {
    return <span className={className}>{value}</span>;
  }

  if (!isEditing) {
    let displayValue;
    if (type === 'number' && typeof value === 'number') {
      displayValue = value === 0 ? '0' : value.toLocaleString();
    } else {
      displayValue = value || placeholder || 'Not set';
    }

    return (
      <div className={`group flex items-center space-x-2 ${className}`}>
        <span className="min-w-0 flex-1">
          {displayValue}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-neutral-400 hover:text-primary-600"
        >
          <Edit2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {type === 'select' ? (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="text-sm border border-neutral-300 rounded px-2 py-1 focus:ring-primary-500 focus:border-primary-500"
          autoFocus
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className="text-sm border border-neutral-300 rounded px-2 py-1 focus:ring-primary-500 focus:border-primary-500"
          autoFocus
        />
      )}
      <button
        onClick={handleSave}
        className="text-success-600 hover:text-success-700"
      >
        <Check size={14} />
      </button>
      <button
        onClick={handleCancel}
        className="text-error-600 hover:text-error-700"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default EditableField;