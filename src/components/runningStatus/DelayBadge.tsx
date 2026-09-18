import React from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DelayBadgeProps {
  delayMinutes: number | null;
  statusText?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export const DelayBadge: React.FC<DelayBadgeProps> = ({
  delayMinutes,
  statusText,
  className = '',
  size = 'md',
}) => {
  const isSmall = size === 'sm';
  const paddingClasses = isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const normalizedStatus = typeof statusText === 'string' ? statusText.toLowerCase() : '';

  // Check if explicit "On Time" status is present
  const isExplicitOnTime =
    normalizedStatus.includes('on time') ||
    (delayMinutes !== null && delayMinutes <= 0);

  if (isExplicitOnTime) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs ${paddingClasses} ${className}`}
        aria-label="Status: On Time"
      >
        <CheckCircle2 className={`${iconSize} text-emerald-600 shrink-0`} />
        <span>On Time</span>
      </span>
    );
  }

  // If delay_minutes > 0, show clean warning treatment
  if (delayMinutes !== null && delayMinutes > 0) {
    const isSevereDelay = delayMinutes >= 60;
    const badgeColor = isSevereDelay
      ? 'bg-rose-50 text-rose-700 border-rose-200/80'
      : 'bg-amber-50 text-amber-800 border-amber-200/80';
    const iconColor = isSevereDelay ? 'text-rose-600' : 'text-amber-600';

    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-lg border shadow-2xs ${badgeColor} ${paddingClasses} ${className}`}
        aria-label={`Delayed by ${delayMinutes} minutes`}
      >
        {isSevereDelay ? (
          <AlertTriangle className={`${iconSize} ${iconColor} shrink-0`} />
        ) : (
          <Clock className={`${iconSize} ${iconColor} shrink-0`} />
        )}
        <span>{delayMinutes} Min Late</span>
      </span>
    );
  }

  // If statusText exists but delayMinutes is null (e.g. "1 Min" or other status)
  if (typeof statusText === 'string' && statusText.trim() && !normalizedStatus.includes('null')) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs ${paddingClasses} ${className}`}
      >
        <Clock className={`${iconSize} text-slate-500 shrink-0`} />
        <span>{statusText.trim()}</span>
      </span>
    );
  }

  // When delay_minutes === null and no meaningful status text, do not display a delay badge
  return null;
};
