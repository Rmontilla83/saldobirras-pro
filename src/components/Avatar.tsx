'use client';

import { getInitials, getAvatarColor } from '@/lib/utils';

interface AvatarProps { name: string; photoUrl?: string | null; large?: boolean; }

export default function Avatar({ name, photoUrl, large }: AvatarProps) {
  const size = large ? 'w-[64px] h-[64px] rounded-2xl text-lg' : 'w-10 h-10 rounded-xl text-[13px]';

  if (photoUrl) {
    return (
      <div className={`${size} overflow-hidden flex-shrink-0 border border-white/[0.04]`}>
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${size} flex items-center justify-center font-bold text-white flex-shrink-0 tracking-wide`}
      style={{ background: `linear-gradient(135deg, ${getAvatarColor(name)}cc, ${getAvatarColor(name)}88)` }}>
      {getInitials(name)}
    </div>
  );
}
