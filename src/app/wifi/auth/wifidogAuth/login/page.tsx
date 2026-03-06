import { redirect } from 'next/navigation';

export default function WifiDogLogin({ searchParams }: { searchParams: Record<string, string> }) {
  const params = new URLSearchParams(searchParams).toString();
  redirect(`/wifi${params ? '?' + params : ''}`);
}
