import React from 'react';
import { PlayerGrade } from '../types/auction';
import { Award, Shield, Zap, Crown } from 'lucide-react';

interface GradeBadgeProps {
  grade: PlayerGrade;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({ grade, size = 'md', showLabel = true }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold tracking-wide',
  };

  const gradeStyles = {
    'A+': {
      bg: 'bg-gradient-to-r from-amber-400/25 via-fuchsia-500/25 to-purple-500/25 border-amber-400/70 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.35)] font-black',
      icon: Crown,
      text: 'Grade A+ (Captain)',
    },
    A: {
      bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      icon: Award,
      text: 'Grade A',
    },
    B: {
      bg: 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 border-sky-500/50 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.25)]',
      icon: Shield,
      text: 'Grade B',
    },
    C: {
      bg: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      icon: Zap,
      text: 'Grade C',
    },
  };

  const current = gradeStyles[grade] || gradeStyles.C;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-md ${current.bg} ${sizeClasses[size]}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {showLabel ? current.text : grade}
    </span>
  );
};
