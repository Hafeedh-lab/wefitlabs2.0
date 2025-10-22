'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Download, RefreshCw, Play, Pause, Trash2, Users, Eye, Clock, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { Database } from '@/types/database';

type Participant = Database['public']['Tables']['participants']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

interface EventMetrics {
  checkIns: number;
  uniqueViewers: number;
  avgDwellTime: number;
  sponsorCTR: number;
  sponsorViews: number;
  sponsorClicks: number;
  topReferrer: string;
}

interface AdminPageProps {
  params: { eventId: string };
}

export default function AdminPage({ params }: AdminPageProps) {
  const { showToast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const supabase = getSupabaseClient();

    const participantsChannel = supabase
      .channel(`admin-participants-${params.eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${params.eventId}`
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      participantsChannel.unsubscribe();
    };
  }, [params.eventId]);

  async function loadData() {
    try {
      setLoading(true);
      await Promise.all([
        loadEvent(),
        loadParticipants(),
        loadMetrics()
      ]);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadEvent() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.eventId)
      .single();

    if (error) throw error;
    setEvent(data);
  }

  async function loadParticipants() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', params.eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setParticipants(data || []);
  }

  async function loadMetrics() {
    try {
      const response = await fetch(`/api/events/${params.eventId}/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setMetrics({
        checkIns: participants.filter(p => p.checked_in_at).length,
        uniqueViewers: 0,
        avgDwellTime: 0,
        sponsorCTR: 0,
        sponsorViews: 0,
        sponsorClicks: 0,
        topReferrer: 'Direct'
      });
    }
  }

  async function exportParticipantsCsv() {
    try {
      setActionLoading('export-participants');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `participants_${params.eventId}_${timestamp}.csv`;

      // Create CSV content
      const headers = ['Name', 'Team', 'Email', 'Phone', 'Check-in Time', 'Marketing Consent'];
      const rows = participants.map(p => [
        p.first_name,
        p.team_name,
        p.email || 'N/A',
        p.phone || 'N/A',
        p.checked_in_at ? new Date(p.checked_in_at).toLocaleString() : 'Not checked in',
        p.consent_marketing ? 'Yes' : 'No'
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      showToast('Participants exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export participants', 'error');
    } finally {
      setActionLoading('');
    }
  }

  async function exportAnalyticsCsv() {
    try {
      setActionLoading('export-analytics');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `analytics_${params.eventId}_${timestamp}.csv`;

      const supabase = getSupabaseClient();
      const { data: analyticsEvents, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_id', params.eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Create CSV content
      const headers = ['Event Type', 'Session ID', 'User Agent', 'Metadata', 'Timestamp'];
      const rows = (analyticsEvents || []).map(e => [
        e.event_type,
        e.session_id || 'N/A',
        e.user_agent || 'N/A',
        JSON.stringify(e.metadata || {}),
        new Date(e.created_at || '').toLocaleString()
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      showToast('Analytics exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export analytics', 'error');
    } finally {
      setActionLoading('');
    }
  }

  async function updateEventStatus(status: 'upcoming' | 'live' | 'completed') {
    try {
      setActionLoading(`status-${status}`);
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('events')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', params.eventId);

      if (error) throw error;

      await loadEvent();
      showToast(`Event ${status === 'live' ? 'started' : status === 'completed' ? 'completed' : 'paused'}`, 'success');
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('Failed to update event status', 'error');
    } finally {
      setActionLoading('');
    }
  }

  async function reseedBracket() {
    if (!confirm('Are you sure you want to reseed the bracket? This will reset all matches to Round 1.')) {
      return;
    }

    try {
      setActionLoading('reseed');
      const response = await fetch(`/api/events/${params.eventId}/reseed`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reseed bracket');
      }

      showToast('Bracket reseeded successfully', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Reseed failed:', error);
      showToast(error.message || 'Failed to reseed bracket', 'error');
    } finally {
      setActionLoading('');
    }
  }

  async function clearTestData() {
    if (!confirm('⚠️ WARNING: This will delete ALL participants and matches for this event. Are you absolutely sure?')) {
      return;
    }

    if (!confirm('This action cannot be undone. Type "DELETE" to confirm.')) {
      return;
    }

    try {
      setActionLoading('clear');
      const supabase = getSupabaseClient();

      // Delete matches first (foreign key constraint)
      await supabase.from('matches').delete().eq('event_id', params.eventId);

      // Delete participants
      await supabase.from('participants').delete().eq('event_id', params.eventId);

      // Delete analytics
      await supabase.from('analytics_events').delete().eq('event_id', params.eventId);
      await supabase.from('sponsor_interactions').delete().eq('event_id', params.eventId);

      showToast('Test data cleared successfully', 'success');
      await loadData();
    } catch (error) {
      console.error('Clear failed:', error);
      showToast('Failed to clear test data', 'error');
    } finally {
      setActionLoading('');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-wefit-dark p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-wefit-primary" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-wefit-dark p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-wefit-white">{event?.name || 'Admin Dashboard'}</h1>
            <p className="mt-1 text-sm text-wefit-grey">Event ID: {params.eventId}</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-wefit-white transition-colors hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            label="Total Check-ins"
            value={metrics?.checkIns || 0}
            color="bg-blue-500/10 text-blue-400"
          />
          <MetricCard
            icon={<Eye className="h-5 w-5" />}
            label="Unique Viewers"
            value={metrics?.uniqueViewers || 0}
            color="bg-green-500/10 text-green-400"
          />
          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            label="Avg Dwell Time"
            value={`${Math.round(metrics?.avgDwellTime || 0)}s`}
            color="bg-purple-500/10 text-purple-400"
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Sponsor CTR"
            value={`${(metrics?.sponsorCTR || 0).toFixed(1)}%`}
            color="bg-yellow-500/10 text-yellow-400"
            subtitle={`${metrics?.sponsorClicks || 0}/${metrics?.sponsorViews || 0} clicks`}
          />
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-white/10 bg-wefit-dark-muted p-6">
          <h2 className="mb-4 text-lg font-semibold text-wefit-white">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              icon={<Play className="h-4 w-4" />}
              label="Start Event"
              onClick={() => updateEventStatus('live')}
              loading={actionLoading === 'status-live'}
              disabled={event?.status === 'live'}
              variant="success"
            />
            <ActionButton
              icon={<Pause className="h-4 w-4" />}
              label="Pause Event"
              onClick={() => updateEventStatus('upcoming')}
              loading={actionLoading === 'status-upcoming'}
              disabled={event?.status === 'upcoming'}
              variant="warning"
            />
            <ActionButton
              icon={<RefreshCw className="h-4 w-4" />}
              label="Reseed Bracket"
              onClick={reseedBracket}
              loading={actionLoading === 'reseed'}
              variant="primary"
            />
            <ActionButton
              icon={<Download className="h-4 w-4" />}
              label="Export Participants"
              onClick={exportParticipantsCsv}
              loading={actionLoading === 'export-participants'}
              variant="primary"
            />
            <ActionButton
              icon={<Download className="h-4 w-4" />}
              label="Export Analytics"
              onClick={exportAnalyticsCsv}
              loading={actionLoading === 'export-analytics'}
              variant="primary"
            />
            <ActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Clear Test Data"
              onClick={clearTestData}
              loading={actionLoading === 'clear'}
              variant="danger"
            />
          </div>
        </div>

        {/* Participants Table */}
        <div className="rounded-xl border border-white/10 bg-wefit-dark-muted p-6">
          <h2 className="mb-4 text-lg font-semibold text-wefit-white">
            Participants ({participants.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-wefit-grey">
                <tr>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Team</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Check-in Time</th>
                  <th className="pb-3 font-medium">Consent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-wefit-grey">
                      No participants yet
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="text-wefit-white">
                      <td className="py-3">{p.first_name}</td>
                      <td className="py-3">{p.team_name}</td>
                      <td className="py-3 text-wefit-grey">{p.email || '—'}</td>
                      <td className="py-3 text-wefit-grey">{p.phone || '—'}</td>
                      <td className="py-3 text-wefit-grey">
                        {p.checked_in_at
                          ? new Date(p.checked_in_at).toLocaleString()
                          : 'Not checked in'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            p.consent_marketing
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {p.consent_marketing ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sponsor Performance */}
        {event?.sponsor_name && (
          <div className="rounded-xl border border-white/10 bg-wefit-dark-muted p-6">
            <h2 className="mb-4 text-lg font-semibold text-wefit-white">Sponsor Performance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-wefit-grey">Sponsor</span>
                <span className="font-medium text-wefit-white">{event.sponsor_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-wefit-grey">Total Views</span>
                <span className="font-medium text-wefit-white">{metrics?.sponsorViews || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-wefit-grey">Total Clicks</span>
                <span className="font-medium text-wefit-white">{metrics?.sponsorClicks || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-wefit-grey">Click-Through Rate</span>
                <span className="font-medium text-wefit-white">
                  {(metrics?.sponsorCTR || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  subtitle
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-wefit-dark-muted p-6">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${color}`}>{icon}</div>
      <div className="text-2xl font-bold text-wefit-white">{value}</div>
      <div className="mt-1 text-sm text-wefit-grey">{label}</div>
      {subtitle && <div className="mt-1 text-xs text-wefit-grey/70">{subtitle}</div>}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  loading,
  disabled,
  variant = 'primary'
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const variants = {
    primary: 'bg-wefit-primary hover:bg-wefit-primary-hover text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
    >
      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
