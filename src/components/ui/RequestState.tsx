export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return <div className="request-state" role="status"><span className="loading-spinner" />{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="request-error" role="alert"><strong>Impossible de charger les données</strong><p>{message}</p>{onRetry && <button className="button button-secondary" onClick={onRetry}>Réessayer</button>}</div>;
}
