import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-brand-600', sizeClasses[size])} />
      {label && <p className="text-sm font-medium text-slate-600">{label}</p>}
    </div>
  );
};

export const PageLoader: React.FC<{ message?: string }> = ({
  message = 'Loading TalentBay Recruiter...',
}) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <LoadingSpinner size="xl" label={message} />
    </div>
  );
};
