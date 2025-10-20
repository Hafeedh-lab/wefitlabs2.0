import { createSupabaseServerClient } from '@/lib/supabase-client';
import LiveBracketView from '@/components/features/LiveBracketView';
import SponsorRibbon from '@/components/features/SponsorRibbon';
import JoinCta from '@/components/features/JoinCta';
import { Suspense } from 'react';
import SkeletonBracket from '@/components/features/SkeletonBracket';

interface EventPageProps {
  params: { eventId: string };
}

export default async function EventPage({ params }: EventPageProps) {
  const supabase = createSupabaseServerClient();
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.eventId)
    .single();

  return (
    <main className="min-h-screen bg-gradient-to-b from-wefit-dark to-wefit-dark-muted pb-24">
      {event ? <SponsorRibbon event={event} /> : null}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-24">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-wefit-grey">WeFit Labs NYC</p>
          <h1 className="heading-lg truncate">{event?.name ?? 'WeFit Labs Event'}</h1>
          <p className="text-wefit-grey">
            {event?.location ? `${event.location} • ` : ''}
            {event?.date ? new Date(event.date).toLocaleDateString() : 'Date TBA'}
          </p>
        </header>
        <Suspense fallback={<SkeletonBracket />}>
          <LiveBracketView eventId={params.eventId} />
        </Suspense>
      </div>
      <JoinCta />
    </main>
  );
}
