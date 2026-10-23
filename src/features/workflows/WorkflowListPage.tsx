import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../../app/AuthContext';
import { useToast } from '../../app/ToastContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/RequestState';
import { workflowService } from '../../services/workflowService';
import type { Workflow } from '../../types/api';

type WorkflowFilter = 'all' | 'active' | 'inactive';
const PAGE_SIZE = 50;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function WorkflowListPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<WorkflowFilter>('all');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const result = await workflowService.list(session.accessToken, {
        limit: PAGE_SIZE,
        skip,
        is_active: filter === 'all' ? undefined : filter === 'active',
      });
      setWorkflows(result.items);
      setTotal(result.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }, [filter, session, skip]);

  useEffect(() => { void load(); }, [load]);

  const visibleWorkflows = useMemo(() => workflows.filter((workflow) => workflow.name.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))), [search, workflows]);

  async function toggleActive(workflow: Workflow) {
    if (!session) return;
    setBusyId(workflow.id);
    try {
      if (workflow.is_active) await workflowService.deactivate(session.accessToken, workflow.id);
      else await workflowService.activate(session.accessToken, workflow.id);
      showToast(`Workflow ${workflow.is_active ? 'désactivé' : 'activé'}.`, 'success');
      await load();
    } catch (actionError) {
      showToast(actionError instanceof Error ? actionError.message : 'Impossible de modifier le workflow.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteWorkflow(workflow: Workflow) {
    if (!session || !window.confirm(`Supprimer « ${workflow.name} » et son historique associé ?`)) return;
    setBusyId(workflow.id);
    try {
      await workflowService.delete(session.accessToken, workflow.id);
      showToast('Workflow supprimé.', 'success');
      await load();
    } catch (actionError) {
      showToast(actionError instanceof Error ? actionError.message : 'Impossible de supprimer le workflow.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="AUTOMATISATIONS" title="Workflows" description="Créez et gérez vos automatisations depuis un seul endroit." action={<Link className="button button-primary" to="/workflows/new"><span>＋</span> Nouveau workflow</Link>} />
      <div className="list-toolbar"><div className="filter-tabs"><button className={`filter-tab ${filter === 'all' ? 'selected' : ''}`} onClick={() => { setFilter('all'); setSkip(0); }}>Tous</button><button className={`filter-tab ${filter === 'active' ? 'selected' : ''}`} onClick={() => { setFilter('active'); setSkip(0); }}>Actifs</button><button className={`filter-tab ${filter === 'inactive' ? 'selected' : ''}`} onClick={() => { setFilter('inactive'); setSkip(0); }}>Inactifs</button></div><label className="list-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filtrer cette page" aria-label="Filtrer les workflows chargés" /></label></div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      <div className="surface-card workflow-list-surface">
        {loading ? <LoadingState label="Chargement des workflows…" /> : visibleWorkflows.length ? <div className="workflow-table-wrap"><div className="workflow-table-heading"><span>{filter === 'all' ? total : visibleWorkflows.length} workflow{(filter === 'all' ? total : visibleWorkflows.length) === 1 ? '' : 's'}</span><span>Mis à jour</span><span>Statut</span><span>Actions</span></div>{visibleWorkflows.map((workflow) => <div className="workflow-table-row" key={workflow.id}><Link to={`/workflows/${workflow.id}`} className="workflow-table-name"><span className="recent-workflow-icon">⌘</span><span><strong>{workflow.name}</strong><small>{workflow.description || 'Aucune description'}</small></span></Link><span className="workflow-updated">{formatDate(workflow.updated_at)}</span><span><span className={`workflow-state-badge ${workflow.is_active ? 'active' : 'inactive'}`}>{workflow.is_active ? 'Actif' : 'Inactif'}</span></span><span className="workflow-row-actions"><button disabled={busyId === workflow.id} onClick={() => void toggleActive(workflow)} title={workflow.is_active ? 'Désactiver' : 'Activer'}>{workflow.is_active ? 'Pause' : 'Activer'}</button><Link to={`/workflows/${workflow.id}`} aria-label={`Modifier ${workflow.name}`}>Modifier</Link><button className="danger-action" disabled={busyId === workflow.id} onClick={() => void deleteWorkflow(workflow)} aria-label={`Supprimer ${workflow.name}`}>Supprimer</button></span></div>)}</div> : <EmptyState icon="⌘" title={search ? 'Aucun résultat' : 'Aucun workflow'} description={search ? 'Aucun workflow chargé ne correspond à cette recherche.' : 'Créez votre première automatisation pour la retrouver ici.'} action={!search ? <Link className="button button-secondary" to="/workflows/new">Créer un workflow <span>→</span></Link> : undefined} />}
      </div>
      {total > PAGE_SIZE && <div className="pagination-bar"><span>{skip + 1}–{Math.min(skip + PAGE_SIZE, total)} sur {total}</span><div><button className="button button-secondary" disabled={skip === 0 || loading} onClick={() => setSkip((current) => Math.max(0, current - PAGE_SIZE))}>Précédent</button><button className="button button-secondary" disabled={skip + PAGE_SIZE >= total || loading} onClick={() => setSkip((current) => current + PAGE_SIZE)}>Suivant</button></div></div>}
    </>
  );
}
