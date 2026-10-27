import { useEffect, useState } from 'react';
import type { WorkflowFlowNode, WorkflowNodeType } from '../../types/workflow';
import type { Credential } from '../../types/api';
import { getNodeCatalogItem } from './nodeCatalog';
import { findInlineSecret, isValidScheduleCron, isValidScheduleTimezone } from './graphValidation';

type NodeConfigPanelProps = {
  node: WorkflowFlowNode | null;
  availableNodes: WorkflowFlowNode[];
  onUpdate: (nodeId: string, update: { label: string; config: Record<string, unknown> }) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  credentials: Credential[];
  webhookUrl: string | null;
  webhookUrlLoading: boolean;
  webhookUrlError: string;
  onCopyWebhookUrl: () => void;
  onValidityChange: (valid: boolean) => void;
};

export function NodeConfigPanel({ node, availableNodes, onUpdate, onClose, onDelete, credentials, webhookUrl, webhookUrlLoading, webhookUrlError, onCopyWebhookUrl, onValidityChange }: NodeConfigPanelProps) {
  const [label, setLabel] = useState('');
  const [configText, setConfigText] = useState('{}');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (!node) return;
    setLabel(node.data.label);
    setConfigText(JSON.stringify(node.data.config, null, 2));
    setJsonError('');
    onValidityChange(node.data.workflowType !== 'schedule_trigger' || isValidScheduleConfig(node.data.config));
  }, [node, onValidityChange]);

  if (!node) {
    return (
      <aside className="node-config-panel empty-config-panel">
        <div className="config-panel-header"><div><h2>Configuration</h2><p>Sélectionnez un nœud pour le configurer.</p></div></div>
        <div className="config-panel-empty"><span>⚙</span><p>Les paramètres du nœud sélectionné apparaîtront ici.</p></div>
        <div className="config-panel-footnote">Les changements sont conservés uniquement dans ce brouillon local.</div>
      </aside>
    );
  }

  const activeNode = node;
  const workflowType = activeNode.data.workflowType as WorkflowNodeType;
  const catalogItem = getNodeCatalogItem(workflowType);
  const isHttpRequest = workflowType === 'http_request';
  const expectedCredentialType = workflowType.startsWith('gmail') || workflowType === 'google_sheets_append' ? 'oauth2_google' : workflowType.startsWith('telegram') ? 'telegram_bot' : null;
  const availableCredentials = isHttpRequest
    ? credentials.filter((credential) => credential.type === 'api_key' || credential.type === 'http_header')
    : expectedCredentialType ? credentials.filter((credential) => credential.type === expectedCredentialType) : credentials;
  const selectedCredential = availableCredentials.find((credential) => credential.id === activeNode.data.config.credential_id);
  const isSchedule = activeNode.data.workflowType === 'schedule_trigger';
  const isWebhook = activeNode.data.workflowType === 'webhook_trigger';
  const scheduleError = isSchedule ? getScheduleConfigError(activeNode.data.config) : '';
  const requiredMissing = catalogItem.requiredConfig.filter((key) => {
    const value = activeNode.data.config[key];
    return value === undefined || value === null || value === '';
  });

  function handleConfigChange(value: string) {
    setConfigText(value);
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('La configuration doit être un objet JSON.');
        onValidityChange(false);
        return;
      }
      const secretPath = findInlineSecret(parsed);
      if (secretPath) {
        setJsonError(`Ne stockez pas de secret dans le graphe (${secretPath}). Les références credentials pour ce champ ne sont pas disponibles.`);
        onValidityChange(false);
        return;
      }
      setJsonError('');
      onValidityChange(true);
      onUpdate(activeNode.id, { label, config: parsed as Record<string, unknown> });
    } catch {
      setJsonError('JSON invalide. Corrigez la syntaxe pour appliquer la configuration.');
      onValidityChange(false);
    }
  }

  function handleLabelChange(value: string) {
    setLabel(value);
    onUpdate(activeNode.id, { label: value, config: activeNode.data.config });
  }

  function handleCredentialChange(value: string) {
    const config = { ...activeNode.data.config };
    if (value) {
      const credential = availableCredentials.find((item) => item.id === value);
      config.credential_id = value;
      if (isHttpRequest && credential) config.credential_type = credential.type;
      if (isHttpRequest && credential?.type === 'api_key') {
        config.api_key_header = config.api_key_header ?? 'Authorization';
        config.api_key_prefix = config.api_key_prefix ?? 'Bearer ';
      } else if (isHttpRequest) {
        delete config.api_key_header;
        delete config.api_key_prefix;
      }
    } else {
      delete config.credential_id;
      delete config.credential_type;
      if (isHttpRequest) {
        delete config.api_key_header;
        delete config.api_key_prefix;
      }
    }
    setJsonError('');
    setConfigText(JSON.stringify(config, null, 2));
    onValidityChange(true);
    onUpdate(activeNode.id, { label, config });
  }

  function handleApiKeyHeaderChange(value: string) {
    const config = { ...activeNode.data.config, api_key_header: value };
    setConfigText(JSON.stringify(config, null, 2));
    onUpdate(activeNode.id, { label, config });
  }

  function handleScheduleChange(key: 'cron' | 'timezone', value: string) {
    const config = { ...activeNode.data.config, [key]: value };
    setJsonError('');
    setConfigText(JSON.stringify(config, null, 2));
    onValidityChange(isValidScheduleConfig(config));
    onUpdate(activeNode.id, { label, config });
  }

  function setConfigValue(key: string, value: unknown) {
    const config = { ...activeNode.data.config, [key]: value };
    setConfigText(JSON.stringify(config, null, 2));
    setJsonError('');
    onUpdate(activeNode.id, { label, config });
  }

  const isGmail = workflowType === 'gmail_trigger';
  const isAgent = workflowType === 'ai_agent';
  const isSheets = workflowType === 'google_sheets_append';
  const hasStructuredForm = isGmail || isAgent || isSheets;

  return (
    <aside className="node-config-panel">
      <div className="config-panel-header"><div><p className="config-eyebrow">NODE SETTINGS</p><h2>Configuration</h2></div><button className="config-close" onClick={onClose} aria-label="Fermer la configuration">×</button></div>
      <div className="config-node-identity"><span className={`palette-node-icon ${catalogItem.color}`}>{catalogItem.icon}</span><span><strong>{catalogItem.label}</strong><small>{catalogItem.group}</small></span></div>
      <label className="config-field"><span>Nom du nœud</span><input value={label} onChange={(event) => handleLabelChange(event.target.value)} maxLength={255} /></label>
      {(catalogItem.requiredConfig.includes('credential_id') || isHttpRequest) && <label className="config-field"><span>{isHttpRequest ? 'Credential HTTP (facultatif)' : isSheets ? 'Compte Google OAuth (Gmail et Sheets)' : 'Credential lie'}</span><select aria-label={isHttpRequest ? 'Credential HTTP' : isSheets ? 'Compte Google OAuth (Gmail et Sheets)' : 'Credential lie'} value={String(activeNode.data.config.credential_id ?? '')} onChange={(event) => handleCredentialChange(event.target.value)}><option value="">{isHttpRequest ? 'Aucun credential' : 'Choisir un credential'}</option>{availableCredentials.map((credential) => <option value={credential.id} key={credential.id}>{credential.name}{isHttpRequest ? ` (${credential.type === 'api_key' ? 'API Key' : 'HTTP Header'})` : isSheets ? ' (OAuth Google)' : ''}</option>)}</select>{availableCredentials.length === 0 && <small className="config-field-hint">{isHttpRequest ? 'Ajoutez un credential API Key ou HTTP Header dans Credentials.' : expectedCredentialType === 'oauth2_google' ? 'Connectez un compte Google OAuth depuis Credentials. Une clé API Google ne suffit pas pour ajouter une ligne.' : 'Aucun credential Telegram. Ajoutez-en dans Credentials.'}</small>}{isSheets && availableCredentials.length > 0 && <small className="config-field-hint">Une clé API Google ne peut pas autoriser l’ajout de lignes. Le compte OAuth sélectionné doit avoir accès à la feuille.</small>}</label>}
      {isHttpRequest && selectedCredential?.type === 'api_key' && <><label className="config-field"><span>Header de la cle API</span><input aria-label="Header de la cle API" value={String(activeNode.data.config.api_key_header ?? 'Authorization')} onChange={(event) => handleApiKeyHeaderChange(event.target.value)} /></label><small className="config-field-hint">La valeur secrete est envoyee avec le prefixe configure (Bearer par defaut).</small></>}
      <div className="config-section-title"><span>Paramètres</span><span className="config-format">{isSchedule ? 'Schedule' : isWebhook ? 'Webhook' : 'JSON'}</span></div>
      {isSchedule ? (
        <>
          <label className="config-field"><span>Expression cron</span><input value={String(activeNode.data.config.cron ?? '')} onChange={(event) => handleScheduleChange('cron', event.target.value)} placeholder="0 9 * * 1-5" aria-label="Expression cron" aria-invalid={!isValidScheduleCron(activeNode.data.config.cron)} /></label>
          <small className="config-field-hint">Cinq champs : minute, heure, jour, mois, jour de la semaine. Exemple : 0 9 * * 1-5</small>
          <label className="config-field"><span>Fuseau horaire</span><input value={String(activeNode.data.config.timezone ?? 'UTC')} onChange={(event) => handleScheduleChange('timezone', event.target.value)} placeholder="UTC" aria-label="Fuseau horaire" aria-invalid={Boolean(scheduleError && !isValidScheduleTimezone(activeNode.data.config.timezone ?? 'UTC'))} /></label>
          {scheduleError && <p className="config-error" role="alert">{scheduleError}</p>}
        </>
      ) : isWebhook ? (
        <div className="config-field">
          <span>URL du webhook</span>
          <div className="webhook-url-row">
            <input aria-label="URL du webhook" readOnly value={webhookUrl ?? ''} placeholder={webhookUrlLoading ? 'Chargement…' : 'Disponible après sauvegarde'} />
            <button className="button button-secondary webhook-copy-button" type="button" disabled={!webhookUrl || webhookUrlLoading} onClick={onCopyWebhookUrl}>Copier</button>
          </div>
          {webhookUrlError ? <small className="config-error" role="alert">{webhookUrlError}</small> : <small className="config-field-hint">{webhookUrl ? 'Cette URL contient le token du webhook. Gardez-la privée.' : 'Enregistrez le workflow pour générer son URL.'}</small>}
        </div>
      ) : hasStructuredForm ? (
        <>
          {isGmail && <>
            <label className="config-field"><span>Recherche Gmail</span><input value={String(activeNode.data.config.filter ?? '')} onChange={(event) => setConfigValue('filter', event.target.value)} placeholder="from:exemple@domaine.com subject:Facture" /></label>
            <label className="config-field"><span>Intervalle de vérification (secondes)</span><input type="number" min="30" value={String(activeNode.data.config.polling_interval_seconds ?? 60)} onChange={(event) => setConfigValue('polling_interval_seconds', Number(event.target.value))} /></label>
            <small className="config-field-hint">Le déclencheur réel lit les nouveaux e-mails Gmail. Le bouton Tester utilise un e-mail simulé.</small>
          </>}
          {isAgent && <>
            <label className="config-field"><span>Prompt utilisateur</span><textarea value={String(activeNode.data.config.prompt ?? '')} onChange={(event) => setConfigValue('prompt', event.target.value)} placeholder={availableNodes[0] ? `Analyse cet e-mail : {{${availableNodes[0].id}.body_text}}` : 'Écrivez une instruction pour l’agent IA.'} /></label>
            <small className="config-field-hint">Cliquez sur une donnée entrante pour l’insérer dans le prompt :</small>
            <div className="expression-pickers">{availableNodes.flatMap((source) => {
              const fields = source.data.workflowType === 'gmail_trigger' ? ['from', 'subject', 'body_text', 'received_at'] : source.data.workflowType === 'ai_agent' ? ['response', 'data'] : ['output'];
              return fields.map((field) => <button type="button" key={`${source.id}.${field}`} title={`Insérer {{${source.id}.${field}}}`} onClick={() => setConfigValue('prompt', `${String(activeNode.data.config.prompt ?? '')}{{${source.id}.${field}}}`)}>{source.data.label}.{field}</button>);
            })}</div>
            <label className="config-field"><span>Instructions système (facultatif)</span><textarea value={String(activeNode.data.config.system_prompt ?? '')} onChange={(event) => setConfigValue('system_prompt', event.target.value)} placeholder="Tu es un assistant qui extrait les informations utiles." /></label>
            <label className="config-field"><span>Modèle</span><input value={String(activeNode.data.config.model ?? '')} onChange={(event) => setConfigValue('model', event.target.value)} placeholder="Modèle défini dans le backend" /></label>
            <div className="config-field"><span>Format de sortie</span><select value={String(activeNode.data.config.output_mode ?? 'text')} onChange={(event) => setConfigValue('output_mode', event.target.value)}><option value="text">Texte</option><option value="json">JSON structuré</option></select></div>
            <label className="config-field"><span>Température (0–2)</span><input type="number" min="0" max="2" step="0.1" value={String(activeNode.data.config.temperature ?? 0.2)} onChange={(event) => setConfigValue('temperature', Number(event.target.value))} /></label>
            <label className="config-field"><span>Limite de réponse (tokens)</span><input type="number" min="1" max="32768" value={String(activeNode.data.config.max_tokens ?? 2048)} onChange={(event) => setConfigValue('max_tokens', Number(event.target.value))} /></label>
            {activeNode.data.config.output_mode === 'json' && <label className="config-field"><span>Champs JSON attendus (un par ligne)</span><textarea value={Array.isArray(activeNode.data.config.output_fields) ? activeNode.data.config.output_fields.map(String).join('\n') : ''} onChange={(event) => setConfigValue('output_fields', event.target.value.split('\n').map((field) => field.trim()).filter(Boolean))} placeholder={'expediteur\nsujet\nresume'} /></label>}
          </>}
          {isSheets && <>
            <label className="config-field"><span>ID du spreadsheet</span><input value={String(activeNode.data.config.spreadsheet_id ?? '')} onChange={(event) => setConfigValue('spreadsheet_id', event.target.value)} placeholder="ID dans l’URL Google Sheets" /></label>
            <label className="config-field"><span>Plage A1</span><input value={String(activeNode.data.config.range ?? 'Sheet1!A:Z')} onChange={(event) => setConfigValue('range', event.target.value)} placeholder="Feuille1!A:Z" /></label>
            <label className="config-field"><span>Valeurs de la ligne (une colonne par ligne)</span><textarea value={Array.isArray(activeNode.data.config.values) ? activeNode.data.config.values.map((value) => String(value ?? '')).join('\n') : ''} onChange={(event) => setConfigValue('values', event.target.value.split('\n'))} placeholder="{{ID_DU_NOEUD.data.champ}}" /></label>
            <small className="config-field-hint">Expressions entrantes :</small>
            <div className="expression-pickers">{availableNodes.flatMap((source) => {
              const sourceFields = source.data.workflowType === 'ai_agent'
                ? source.data.config.output_mode === 'json' && Array.isArray(source.data.config.output_fields)
                  ? source.data.config.output_fields.map((field) => `data.${String(field)}`)
                  : ['response']
                : source.data.workflowType === 'gmail_trigger'
                  ? ['received_at', 'from', 'subject', 'body_text']
                  : ['output'];
              return sourceFields.map((field) => {
                const expression = `{{${source.id}.${field}}}`;
                return <button type="button" key={`${source.id}.${field}`} title={`Ajouter ${expression} comme valeur de colonne`} onClick={() => setConfigValue('values', [...(Array.isArray(activeNode.data.config.values) ? activeNode.data.config.values : []), expression])}>{source.data.label}.{field}</button>;
              });
            })}</div>
          </>}
          <details className="config-advanced"><summary>Configuration JSON avancée</summary><label className="config-field config-json-field"><span>Configuration complète</span><textarea spellCheck={false} value={configText} onChange={(event) => handleConfigChange(event.target.value)} aria-label="Configuration JSON avancée du nœud" /></label>{jsonError && <p className="config-error" role="alert">{jsonError}</p>}</details>
        </>
      ) : (
        <>
          <label className="config-field config-json-field"><span>Configuration du nœud</span><textarea spellCheck={false} value={configText} onChange={(event) => handleConfigChange(event.target.value)} aria-label="Configuration JSON du nœud" /></label>
          {jsonError && <p className="config-error" role="alert">{jsonError}</p>}
        </>
      )}
      {!jsonError && requiredMissing.length > 0 && <div className="config-required"><strong>Champs requis par le backend</strong><p>{requiredMissing.join(', ')}</p></div>}
      <div className="config-security-note"><span>ⓘ</span><p>N’inscrivez aucun mot de passe ni jeton ici. Utilisez uniquement les références credentials supportées par le backend.</p></div>
      <div className="config-panel-bottom"><span>ID : {activeNode.id.slice(0, 12)}</span><button className="delete-node-button" onClick={() => onDelete(activeNode.id)}>Supprimer le nœud</button></div>
    </aside>
  );
}

function isValidScheduleConfig(config: Record<string, unknown>): boolean {
  return isValidScheduleCron(config.cron) && isValidScheduleTimezone(config.timezone ?? 'UTC');
}

function getScheduleConfigError(config: Record<string, unknown>): string {
  if (!isValidScheduleCron(config.cron)) return 'Saisissez une expression cron valide à cinq champs.';
  if (!isValidScheduleTimezone(config.timezone ?? 'UTC')) return 'Saisissez un fuseau horaire IANA valide, par exemple UTC ou Europe/Paris.';
  return '';
}
