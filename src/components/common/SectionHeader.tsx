import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 pb-2 border-b border-slate-100',
        className
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-500 leading-snug">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
