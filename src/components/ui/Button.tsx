'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  // No mobile com ícone: circular e sem gap. No desktop ou sem ícone: normal
  const hasIcon = icon || loading;
  const baseStyles = hasIcon
    ? 'inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full lg:rounded-lg lg:gap-2'
    : 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'btn-primary',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100'
  };
  
  // No mobile com ícone: quadrado (p-2/p-2.5/p-3). No desktop ou sem ícone: retangular
  const sizes = hasIcon ? {
    sm: 'p-2 lg:px-3 lg:py-1.5 text-sm',
    md: 'p-2.5 lg:px-4 lg:py-2 text-sm',
    lg: 'p-3 lg:px-6 lg:py-3 text-base'
  } : {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoadingSpinner size={16} /> : icon}
      <span className={hasIcon ? 'hidden lg:inline' : ''}>{children}</span>
    </button>
  );
}
