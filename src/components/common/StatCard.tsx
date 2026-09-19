import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  iconBgColor = 'bg-brand-50',
  iconColor = 'text-brand-600',
  className,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card transition-all duration-200 flex flex-col justify-between',
        onClick && 'cursor-pointer hover:border-brand-200 hover:shadow-card-hover group',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
            iconBgColor,
            iconColor
          )}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </span>

        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
              trend.isPositive !== false
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                : 'text-rose-700 bg-rose-50 border border-rose-200/60'
            )}
          >
            {trend.isPositive !== false ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      {(subtitle || trend?.label) && (
        <p className="text-xs text-slate-500 mt-2 font-medium">
          {subtitle || trend?.label}
        </p>
      )}
    </div>
  );
};
