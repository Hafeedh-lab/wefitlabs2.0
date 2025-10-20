import { createSupabaseServerClient } from '@/lib/supabase-client';
import SharePanel from '@/components/features/SharePanel';

interface SharePageProps {
  params: { eventId: string; matchId: string };
}

export default async function SharePage({ params }: SharePageProps) {
  const supabase = createSupabaseServerClient();
  const { data: match } = await supabase
    .from('matches')
    .select(`*, team1:participants(id, team_name), team2:participants(id, team_name), event:events(*)`)
    .eq('id', params.matchId)
    .single();

  if (!match) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-wefit-dark text-wefit-white">
        <p className="text-lg">Match not found.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-wefit-dark px-4 py-24 text-center text-wefit-white">
      <SharePanel match={match} eventId={params.eventId} />
    </main>
  );
}
