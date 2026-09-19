import React, { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm my-4',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-sm">
        {icon || <Inbox className="h-7 w-7 text-slate-400" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action || actions ? (
        action || actions
      ) : actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition shadow-sm hover:shadow"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};
