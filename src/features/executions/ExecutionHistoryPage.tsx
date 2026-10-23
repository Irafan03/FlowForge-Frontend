import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../../app/AuthContext';
import { useToast } from '../../app/ToastContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState, LoadingState } from '../../components/ui/RequestState';
import { executionService } from '../../services/executionService';
import type { Execution, ExecutionStatus } from '../../types/api';

const statusOptions: Array<{ value: ExecutionStatus | ''; label: string }> = [
  { value: '', label: 'Tous les statuts' },
  { value: 'queued', label: 'En attente' },
  { value: 'running', label: 'En cours' },
  { value: 'success', label: 'Réussies' },
  { value: 'failed', label: 'Échouées' },
  { value: 'cancelled', label: 'Annulées' },
];
const PAGE_SIZE = 50;

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusLabel(status: ExecutionStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

export function ExecutionHistoryPage() {
  const { executionId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [status, setStatus] = useState<ExecutionStatus | ''>('');
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadExecutions = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const result = await executionService.list(session.accessToken, { limit: PAGE_SIZE, skip, status: status || undefined });
      setExecutions(result.items);
      setTotal(result.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les exécutions.');
    } finally {
      setLoading(false);
    }
  }, [session, skip, status]);

  const loadDetail = useCallback(async (id: string) => {
    if (!session) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      setSelectedExecution(await executionService.get(session.accessToken, id));
    } catch (loadError) {
      setSelectedExecution(null);
      setDetailError(loadError instanceof Error ? loadError.message : 'Impossible de charger le détail.');
    } finally {
      setDetailLoading(false);
    }
  }, [session]);

  useEffect(() => { void loadExecutions(); }, [loadExecutions]);
  useEffect(() => {
    if (executionId) void loadDetail(executionId);
    else setSelectedExecution(null);
  }, [executionId, loadDetail]);

  async function cancelExecution() {
    if (!session || !selectedExecution) return;
    setBusy(true);
    try {
      const updated = await executionService.cancel(session.accessToken, selectedExecution.id);
      setSelectedExecution(updated);
      showToast('Demande d’annulation envoyée.', 'success');
      await loadExecutions();
    } catch (cancelError) {
      showToast(cancelError instanceof Error ? cancelError.message : 'Impossible d’annuler cette exécution.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="OBSERVABILITÉ" title="Historique des exécutions" description="Consultez les statuts et les détails des exécutions de vos workflows." action={<button className="button button-secondary" onClick={() => void loadExecutions()}>↻ Actualiser</button>} />
      <div className="history-toolbar"><div className="filter-tabs">{statusOptions.map((option) => <button key={option.value || 'all'} className={`filter-tab ${(status || '') === option.value ? 'selected' : ''}`} onClick={() => { setStatus(option.value); setSkip(0); }}>{option.label}</button>)}</div></div>
      {error && <ErrorState message={error} onRetry={() => void loadExecutions()} />}
      <div className="surface-card history-surface history-list-surface">
        {loading ? <LoadingState label="Chargement de l’historique…" /> : executions.length ? <div className="execution-table-wrap"><div className="execution-table-heading"><span>Workflow / déclencheur</span><span>Date</span><span>Durée</span><span>Statut</span></div>{executions.map((execution) => <button className={`execution-table-row ${execution.id === executionId ? 'selected' : ''}`} key={execution.id} onClick={() => navigate(`/history/${execution.id}`)}><span className="execution-title-cell"><i className={`execution-status-dot ${execution.status}`} /><span><strong>{execution.trigger_type}</strong><small>{execution.workflow_id}</small></span></span><span>{formatDate(execution.created_at)}</span><span>{execution.duration_ms === null ? '—' : `${execution.duration_ms} ms`}</span><span className={`execution-status-label ${execution.status}`}>{statusLabel(execution.status)}</span></button>)}</div> : <EmptyState icon="◷" title="Aucune exécution" description="Les exécutions de vos workflows apparaîtront ici." />}
      </div>
      {total > PAGE_SIZE && <div className="pagination-bar"><span>{skip + 1}–{Math.min(skip + PAGE_SIZE, total)} sur {total}</span><div><button className="button button-secondary" disabled={skip === 0 || loading} onClick={() => setSkip((current) => Math.max(0, current - PAGE_SIZE))}>Précédent</button><button className="button button-secondary" disabled={skip + PAGE_SIZE >= total || loading} onClick={() => setSkip((current) => current + PAGE_SIZE)}>Suivant</button></div></div>}
      {executionId && <section className="surface-card execution-detail-card">
        <div className="execution-detail-header"><div><p className="eyebrow">DÉTAIL D’EXÉCUTION</p><h2>{selectedExecution ? statusLabel(selectedExecution.status) : 'Chargement du détail'}</h2><small>{executionId}</small></div><div className="execution-detail-actions"><button className="button button-secondary" onClick={() => void loadDetail(executionId)}>Actualiser le détail</button>{selectedExecution && ['queued', 'running'].includes(selectedExecution.status) && <button className="button button-danger" onClick={() => void cancelExecution()} disabled={busy}>{busy ? 'Annulation…' : 'Annuler'}</button>}<button className="icon-button" aria-label="Fermer le détail" onClick={() => navigate('/history')}>×</button></div></div>
        {detailError ? <ErrorState message={detailError} onRetry={() => void loadDetail(executionId)} /> : detailLoading || !selectedExecution ? <LoadingState label="Chargement des logs et résultats…" /> : <div className="execution-detail-content"><div className="execution-meta-grid"><div><span>Workflow</span><Link to={`/workflows/${selectedExecution.workflow_id}`}>{selectedExecution.workflow_id}</Link></div><div><span>Déclencheur</span><strong>{selectedExecution.trigger_type}</strong></div><div><span>Démarrée</span><strong>{formatDate(selectedExecution.started_at)}</strong></div><div><span>Terminée</span><strong>{formatDate(selectedExecution.finished_at)}</strong></div><div><span>Durée</span><strong>{selectedExecution.duration_ms === null ? '—' : `${selectedExecution.duration_ms} ms`}</strong></div></div>
          {selectedExecution.error && <div className="execution-error-box"><strong>Erreur d’exécution</strong><p>{selectedExecution.error}</p></div>}
          <h3>Exécution des nœuds</h3>
          {selectedExecution.node_executions.length ? <div className="node-execution-list">{selectedExecution.node_executions.map((nodeExecution) => <details className="node-execution-item" key={nodeExecution.id}><summary><i className={`execution-status-dot ${nodeExecution.status}`} /><strong>{nodeExecution.node_type}</strong><span>{nodeExecution.node_id}</span><em>{nodeExecution.duration_ms === null ? '—' : `${nodeExecution.duration_ms} ms`}</em><b className={`execution-status-label ${nodeExecution.status}`}>{nodeExecution.status}</b></summary><div className="node-execution-body">{nodeExecution.error && <div className="execution-error-box"><strong>Erreur</strong><p>{nodeExecution.error}</p></div>}<h4>Sortie</h4><pre>{nodeExecution.output ? JSON.stringify(nodeExecution.output, null, 2) : 'Aucune sortie retournée.'}</pre></div></details>)}</div> : <p className="no-node-logs">Aucun log de nœud n’est disponible pour cette exécution.</p>}</div>}
      </section>}
    </>
  );
}
