import { useEffect, useState } from 'react';
import type { WorkflowFlowNode, WorkflowNodeType } from '../../types/workflow';
import type { Credential } from '../../types/api';
import { getNodeCatalogItem } from './nodeCatalog';
import { findInlineSecret, isValidScheduleCron, isValidScheduleTimezone } from './graphValidation';

type NodeConfigPanelProps = {
  node: WorkflowFlowNode | null;
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

export function NodeConfigPanel({ node, onUpdate, onClose, onDelete, credentials, webhookUrl, webhookUrlLoading, webhookUrlError, onCopyWebhookUrl, onValidityChange }: NodeConfigPanelProps) {
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
  const expectedCredentialType = workflowType.startsWith('gmail') ? 'oauth2_google' : workflowType.startsWith('telegram') ? 'telegram_bot' : null;
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

  return (
    <aside className="node-config-panel">
      <div className="config-panel-header"><div><p className="config-eyebrow">NODE SETTINGS</p><h2>Configuration</h2></div><button className="config-close" onClick={onClose} aria-label="Fermer la configuration">×</button></div>
      <div className="config-node-identity"><span className={`palette-node-icon ${catalogItem.color}`}>{catalogItem.icon}</span><span><strong>{catalogItem.label}</strong><small>{catalogItem.group}</small></span></div>
      <label className="config-field"><span>Nom du nœud</span><input value={label} onChange={(event) => handleLabelChange(event.target.value)} maxLength={255} /></label>
      {(catalogItem.requiredConfig.includes('credential_id') || isHttpRequest) && <label className="config-field"><span>{isHttpRequest ? 'Credential HTTP (facultatif)' : 'Credential lie'}</span><select aria-label={isHttpRequest ? 'Credential HTTP' : 'Credential lie'} value={String(activeNode.data.config.credential_id ?? '')} onChange={(event) => handleCredentialChange(event.target.value)}><option value="">{isHttpRequest ? 'Aucun credential' : 'Choisir un credential'}</option>{availableCredentials.map((credential) => <option value={credential.id} key={credential.id}>{credential.name}{isHttpRequest ? ` (${credential.type === 'api_key' ? 'API Key' : 'HTTP Header'})` : ''}</option>)}</select>{availableCredentials.length === 0 && <small className="config-field-hint">{isHttpRequest ? 'Ajoutez un credential API Key ou HTTP Header dans Credentials.' : expectedCredentialType === 'oauth2_google' ? 'Aucun credential Google. Le flux OAuth reste a integrer.' : 'Aucun credential Telegram. Ajoutez-en dans Credentials.'}</small>}</label>}
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
