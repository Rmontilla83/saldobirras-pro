'use client';

import { getInitials, getAvatarColor } from '@/lib/utils';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  large?: boolean;
}

export default function Avatar({ name, photoUrl, large }: AvatarProps) {
  const size = large ? 'w-[72px] h-[72px] rounded-[20px] text-[22px]' : 'w-11 h-11 rounded-[14px] text-[15px]';

  if (photoUrl) {
    return (
      <div className={`${size} overflow-hidden flex-shrink-0`}>
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${size} flex items-center justify-center font-extrabold text-white flex-shrink-0 tracking-wider`}
      style={{ background: getAvatarColor(name) }}
    >
      {getInitials(name)}
    </div>
  );
}
