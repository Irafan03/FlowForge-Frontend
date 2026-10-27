import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../app/AuthContext';
import { useToast } from '../../app/ToastContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState, LoadingState } from '../../components/ui/RequestState';
import { credentialService } from '../../services/credentialService';
import { googleIntegrationService } from '../../services/googleIntegrationService';
import type { Credential } from '../../types/api';

type CredentialType = 'api_key' | 'oauth2_google' | 'telegram_bot' | 'http_header';
type CredentialFormType = Exclude<CredentialType, 'oauth2_google'>;

const credentialTypeLabels: Record<CredentialType, string> = {
  api_key: 'API Key',
  telegram_bot: 'Telegram Bot',
  http_header: 'HTTP Header',
  oauth2_google: 'Google Gmail',
};

export function CredentialsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [type, setType] = useState<CredentialFormType>('telegram_bot');
  const googlePopup = useRef<Window | null>(null);
  const googleCallbackOrigin = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      setCredentials(await credentialService.list(session.accessToken));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les credentials.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!session) return;
    function handleGooglePopupMessage(event: MessageEvent) {
      if (
        event.source !== googlePopup.current
        || event.origin !== googleCallbackOrigin.current
        || event.data?.type !== 'flowforge:google-oauth'
      ) return;
      googlePopup.current = null;
      googleCallbackOrigin.current = null;
      if (event.data.status === 'connected') {
        showToast('Compte Google connecté.', 'success');
        void load();
      } else {
        showToast(event.data.status === 'denied' ? 'Connexion Google annulée.' : 'La connexion Google a échoué.', 'error');
      }
    }
    window.addEventListener('message', handleGooglePopupMessage);
    return () => window.removeEventListener('message', handleGooglePopupMessage);
  }, [load, session, showToast]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setFormError('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    let data: unknown;
    try {
      data = JSON.parse(String(formData.get('data') ?? '{}'));
    } catch {
      setFormError('La valeur doit être un objet JSON valide.');
      return;
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      setFormError('La valeur JSON doit être un objet.');
      return;
    }

    setSubmitting(true);
    try {
      await credentialService.create(session.accessToken, { name, type, data: data as Record<string, unknown> });
      form.reset();
      showToast('Credential envoyé et enregistré par le backend.', 'success');
      await load();
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : 'Impossible de créer ce credential.');
    } finally {
      setSubmitting(false);
    }
  }

  async function connectGoogle() {
    if (!session) return;
    const popup = window.open('about:blank', 'flowforge-google-oauth', 'popup,width=600,height=720');
    if (!popup) {
      showToast('Autorisez les fenêtres popup pour connecter Google.', 'error');
      return;
    }
    setGoogleConnecting(true);
    try {
      const { authorization_url } = await googleIntegrationService.getAuthorizationUrl(session.accessToken);
      const redirectUri = new URL(authorization_url).searchParams.get('redirect_uri');
      if (!redirectUri) throw new Error('URL de retour Google manquante.');
      googleCallbackOrigin.current = new URL(redirectUri).origin;
      googlePopup.current = popup;
      popup.location.href = authorization_url;
    } catch (connectError) {
      popup.close();
      showToast(connectError instanceof Error ? connectError.message : 'Impossible de démarrer Google OAuth.', 'error');
    } finally {
      setGoogleConnecting(false);
    }
  }

  async function deleteCredential(credential: Credential) {
    if (!session || !window.confirm(`Supprimer le credential « ${credential.name} » ?`)) return;
    try {
      await credentialService.delete(session.accessToken, credential.id);
      showToast('Credential supprimé.', 'success');
      await load();
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : 'Impossible de supprimer ce credential.', 'error');
    }
  }

  return (
    <>
      <PageHeader eyebrow="CONNEXIONS" title="Credentials" description="Gérez les références de credentials utilisées par vos nœuds." />
      <div className="credential-layout">
        <section className="surface-card credential-create-card"><div className="credential-card-heading"><span className="credential-heading-icon">⌑</span><div><h2>Ajouter un credential</h2><p>Les données sont envoyées au backend et chiffrées côté serveur.</p></div></div>
          <form className="credential-form" onSubmit={handleCreate}>
            <label>Nom<input name="name" required maxLength={255} placeholder="Ex. Bot support" /></label>
            <label>Type<select value={type} onChange={(event) => setType(event.target.value as CredentialFormType)}><option value="telegram_bot">Telegram Bot</option><option value="api_key">API Key</option><option value="http_header">HTTP Header</option></select></label>
            <label>Données JSON<textarea name="data" required spellCheck={false} placeholder={type === 'telegram_bot' ? '{ "bot_token": "" }' : type === 'api_key' ? '{ "api_key": "" }' : type === 'http_header' ? '{ "X-API-Key": "" }' : '{}'} /></label>
            {formError && <p className="credential-form-error" role="alert">{formError}</p>}
            <p className="credential-security-copy">Les valeurs saisies ne sont pas conservées par l’application après l’envoi. Elles ne seront jamais retournées par l’API credentials.</p>
            <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Envoi…' : 'Enregistrer le credential'}</button>
          </form>
          <div className="oauth-limitation"><strong>Connexion Gmail</strong><p>Connectez un compte Google pour utiliser ses credentials dans Gmail Trigger et Gmail Send.</p><button className="button button-secondary" type="button" disabled={googleConnecting} onClick={() => void connectGoogle()}>{googleConnecting ? 'Ouverture de Google...' : 'Connecter Google'}</button></div>
        </section>
        <section className="surface-card credential-list-card"><div className="credential-card-heading"><span className="credential-heading-icon violet">▤</span><div><h2>Credentials enregistrés</h2><p>Seuls leurs noms et types sont disponibles au frontend.</p></div><button className="icon-button" aria-label="Actualiser les credentials" onClick={() => void load()}>↻</button></div>
          {error && <ErrorState message={error} onRetry={() => void load()} />}
          {loading ? <LoadingState label="Chargement des credentials…" /> : credentials.length ? <div className="credential-list">{credentials.map((credential) => <div className="credential-row" key={credential.id}><span className={`credential-type-icon ${credential.type}`}>{credential.type === 'telegram_bot' ? '➤' : credential.type === 'oauth2_google' ? 'G' : '⌑'}</span><span className="credential-row-copy"><strong>{credential.name}</strong><small>{credentialTypeLabels[credential.type as CredentialType] ?? credential.type} · ajouté le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(credential.created_at))}</small></span><button className="danger-action" onClick={() => void deleteCredential(credential)}>Supprimer</button></div>)}</div> : <EmptyState icon="⌑" title="Aucun credential" description="Les métadonnées des credentials créés apparaîtront ici." />}
        </section>
      </div>
    </>
  );
}
