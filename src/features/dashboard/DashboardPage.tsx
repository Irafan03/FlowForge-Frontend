import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../app/AuthContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingState, ErrorState } from '../../components/ui/RequestState';
import { StatCard } from '../../components/ui/StatCard';
import type { Execution, Workflow } from '../../types/api';
import { executionService } from '../../services/executionService';
import { workflowService } from '../../services/workflowService';

type DashboardData = { workflows: Workflow[]; workflowTotal: number; activeTotal: number; executions: Execution[]; executionTotal: number };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function DashboardPage() {
  const { session } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const todayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toLocaleUpperCase('fr-FR');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const [workflows, active, executions] = await Promise.all([
        workflowService.list(session.accessToken, { limit: 100 }),
        workflowService.list(session.accessToken, { limit: 100, is_active: true }),
        executionService.list(session.accessToken, { limit: 100 }),
      ]);
      setData({ workflows: workflows.items, workflowTotal: workflows.total, activeTotal: active.total, executions: executions.items, executionTotal: executions.total });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  const terminalExecutions = data?.executions.filter((execution) => ['success', 'failed', 'cancelled'].includes(execution.status)) ?? [];
  const successfulExecutions = terminalExecutions.filter((execution) => execution.status === 'success').length;
  const successRate = terminalExecutions.length ? `${Math.round(successfulExecutions / terminalExecutions.length * 100)}%` : '—';

  return (
    <>
      <PageHeader eyebrow={todayLabel} title="Bonjour 👋" description="Voici un aperçu de votre espace d’automatisation." action={<Link className="button button-primary" to="/workflows/new"><span>＋</span> Nouveau workflow</Link>} />
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      <section className="stats-grid" aria-label="Statistiques des workflows">
        <StatCard label="Total workflows" value={loading ? '…' : String(data?.workflowTotal ?? '—')} note="Tous vos workflows" icon="⌘" tone="violet" />
        <StatCard label="Actifs" value={loading ? '…' : String(data?.activeTotal ?? '—')} note="Workflows activés" icon="↗" tone="mint" />
        <StatCard label="Exécutions" value={loading ? '…' : String(data?.executionTotal ?? '—')} note="Toutes les exécutions" icon="◷" tone="blue" />
        <StatCard label="Taux de réussite" value={loading ? '…' : successRate} note="Échantillon des 100 dernières" icon="✓" tone="amber" />
      </section>

      <section className="dashboard-section">
        <div className="section-heading"><div><h2>Vos workflows</h2><p>Retrouvez et gérez vos automatisations.</p></div><Link className="text-link" to="/workflows">Voir les workflows <span>→</span></Link></div>
        <div className="surface-card recent-card">
          {loading ? <LoadingState label="Chargement des workflows…" /> : data?.workflows.length ? <div className="recent-workflow-list">{data.workflows.slice(0, 5).map((workflow) => <Link to={`/workflows/${workflow.id}`} className="recent-workflow-row" key={workflow.id}><span className="recent-workflow-icon">⌘</span><span className="recent-workflow-copy"><strong>{workflow.name}</strong><small>Mis à jour le {formatDate(workflow.updated_at)}</small></span><span className={`workflow-state-badge ${workflow.is_active ? 'active' : 'inactive'}`}>{workflow.is_active ? 'Actif' : 'Inactif'}</span><span className="row-chevron">→</span></Link>)}</div> : <EmptyState icon="⌘" title="Aucun workflow" description="Créez votre première automatisation pour la retrouver ici." action={<Link className="button button-secondary" to="/workflows/new">Créer un workflow <span>→</span></Link>} />}
        </div>
      </section>

      <section className="bottom-grid">
        <div className="surface-card activity-card"><div className="section-heading compact"><div><h2>Activité récente</h2><p>Suivi des dernières exécutions.</p></div><Link className="text-link" to="/history">Tout voir <span>→</span></Link></div>
          {loading ? <LoadingState label="Chargement des exécutions…" /> : data?.executions.length ? <div className="recent-execution-list">{data.executions.slice(0, 4).map((execution) => <Link to={`/history/${execution.id}`} className="recent-execution-row" key={execution.id}><span className={`execution-status-dot ${execution.status}`} /><span className="recent-execution-copy"><strong>{execution.trigger_type} · {execution.status}</strong><small>{formatDate(execution.created_at)}</small></span><span className="row-chevron">→</span></Link>)}</div> : <div className="activity-empty"><span className="activity-line-icon">◷</span><span>Aucune exécution pour le moment.</span></div>}
        </div>
        <div className="surface-card quick-card"><div className="quick-card-heading"><span className="quick-spark">✦</span><div><h2>Commencer rapidement</h2><p>Construisez votre première automatisation.</p></div></div><div className="quick-steps"><div><span>1</span><p>Créez un nouveau workflow</p><i>✓</i></div><div><span>2</span><p>Ajoutez un déclencheur</p><i>⌁</i></div><div><span>3</span><p>Connectez vos actions</p><i>⌁</i></div></div><Link to="/workflows/new" className="quick-link">Ouvrir l’éditeur <span>→</span></Link></div>
      </section>
    </>
  );
}
