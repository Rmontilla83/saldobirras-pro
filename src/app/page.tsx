'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      router.replace(session ? '/dashboard' : '/login');
    };
    check();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin" />
    </div>
  );
}
