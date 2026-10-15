import React from 'react';
import { PlayerRole } from '../types/auction';

interface RoleBadgeProps {
  role: PlayerRole;
  size?: 'sm' | 'md' | 'lg';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  const roleStyles: Record<PlayerRole, { bg: string; icon: string; text: string }> = {
    'Batsman': {
      bg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      icon: '🏏',
      text: 'Batsman',
    },
    'Bowler': {
      bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
      icon: '🎯',
      text: 'Bowler',
    },
    'Wicketkeeper': {
      bg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      icon: '🧤',
      text: 'Wicketkeeper',
    },
  };

  const current = roleStyles[role] || roleStyles.Batsman;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono tracking-tight ${current.bg} ${sizeClasses[size]}`}
    >
      <span>{current.icon}</span>
      <span>{current.text}</span>
    </span>
  );
};
