import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loading?: boolean; // Alias for isLoading (used by some components)
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false, // Alias for isLoading
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  // Support both isLoading and loading props
  const isButtonLoading = isLoading || loading;

  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition-colors duration-200 ease-in-out';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500',
    outline: 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-2 focus:ring-neutral-500',
    danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-2 focus:ring-offset-2 focus:ring-error-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
  };
  
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const disabledStyles = disabled || isButtonLoading
    ? 'opacity-60 cursor-not-allowed pointer-events-none'
    : '';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabledStyles}
        ${widthClass}
        ${className}
      `}
      disabled={disabled || isButtonLoading}
      {...props}
    >
      {isButtonLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {!isButtonLoading && leftIcon && (
        <span className="mr-2">{leftIcon}</span>
      )}

      {children}

      {!isButtonLoading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;