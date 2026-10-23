# Intégration API

## Origine et client

Les chemins sont vérifiés dans `../FlowForge-Backend/app/main.py`, `app/api/` et les schémas. Le document `FlowForge-Backend/docs/API.md` contient une spécification ancienne; les routeurs Python sont la référence d'implémentation. `src/services/apiClient.ts` utilise `VITE_API_BASE_URL`, défaut `http://localhost:8000/api/v1`, gère JSON, Bearer, `204`, erreurs réseau et objets FastAPI `detail`.

## Routes consommées

| Méthode | Chemin | Usage frontend |
|---|---|---|
| `POST` | `/auth/register` | Création de compte |
| `POST` | `/auth/login` | Obtention JWT Bearer |
| `GET`, `POST` | `/workflows` | Liste paginée, création |
| `GET`, `PUT`, `DELETE` | `/workflows/{workflow_id}` | Lecture, mise à jour partielle, suppression |
| `POST` | `/workflows/{workflow_id}/activate` | Activation |
| `POST` | `/workflows/{workflow_id}/deactivate` | Désactivation |
| `POST` | `/workflows/{workflow_id}/executions` | Déclenchement manuel (`202`, `input_data`) |
| `GET` | `/executions` | Liste paginée et filtre `status`/`workflow_id` |
| `GET` | `/executions/{execution_id}` | Détail et résultats des nœuds |
| `POST` | `/executions/{execution_id}/cancel` | Annulation |
| `GET`, `POST` | `/credentials` | Liste de métadonnées, création de credential |
| `DELETE` | `/credentials/{credential_id}` | Suppression |

Tous les chemins applicatifs sont précédés de `/api/v1`. L'API renvoie des enveloppes `{items,total,skip,limit}` pour workflows/exécutions. La liste de credentials est un tableau. Les paramètres `skip`/`limit` sont transmis; l'interface utilise des pages de 50.

## Contrat workflow

La création envoie `{name, graph}` avec `graph.nodes` et `graph.edges`. Chaque node sérialisé contient `id`, `type`, `name`, `config`, `position: {x,y}`. Une edge contient `id`, `source`, `target`, `source_handle`, `target_handle`. Les handles React Flow camelCase sont convertis vers le snake_case backend. L'API de mise à jour reçoit le même graphe et le nom.

Types node autorisés : `manual_trigger`, `webhook_trigger`, `schedule_trigger`, `gmail_trigger`, `telegram_trigger`, `set_data`, `if_condition`, `http_request`, `gmail_send`, `telegram_send`, `ml_prediction`.

L'exécution manuelle reçoit `{"input_data": {}}` et répond `202` avec `execution_id`, `status`, `workflow_id`, `created_at`. Le backend vérifié exige l'activation avant déclenchement manuel; le bouton Tester est désactivé si le workflow n'est pas actif ou si ses modifications ne sont pas sauvegardées.

## Authentification et credentials

Les routes protégées reçoivent `Authorization: Bearer <access_token>`. Login renvoie `access_token`, `token_type`, `expires_in`; aucun endpoint `/auth/me`, refresh ou logout n'est déclaré. Le token reste en mémoire uniquement. Register crée le compte mais ne renvoie pas de token, l'utilisateur est redirigé vers Login.

La création d'un credential envoie `{name,type,data}` à `POST /credentials`; le formulaire efface ses valeurs après envoi. La lecture renvoie uniquement `id`, `name`, `type`, timestamps. Types backend : `api_key`, `oauth2_google`, `telegram_bot`, `http_header`. Le frontend démarre Google OAuth via `GET /integrations/google/auth-url`; le callback enregistre les tokens côté backend et renvoie uniquement un statut à la popup.

## Erreurs

Le client extrait `detail` et expose le code HTTP via `ApiError`. FastAPI peut retourner un texte ou une liste de problèmes de validation. En cas d'échec réseau, le client affiche une erreur de connexion; un `401` sur route protégée efface la session mémoire. Une erreur `409` du déclenchement manuel indique généralement que le workflow n'est pas actif.

## Routes non appelées

Le backend synchronise le Schedule Trigger lors de la création et de la mise à jour du graphe via les routes workflow, valide `config.cron` et `config.timezone`, puis active ou suspend le planning avec le workflow. Le frontend doit fournir ces deux valeurs dans `graph.nodes[].config`; la validation backend reste l'autorité finale. Pour un workflow sauvegardé qui contient un `webhook_trigger`, `GET /workflows/{workflow_id}/webhook-url` (authentifié et limité au propriétaire) renvoie `webhook_path`, relatif à la base API configurée. Le frontend le résout en URL complète, l'affiche dans le panneau du nœud et permet de le copier. Le chemin contient un token secret; garder l'URL privée. Le déclenchement public est `POST /webhooks/{token}` et requiert que le workflow soit actif. Le parcours frontend/API/worker Webhook a été validé en navigateur; les preuves détaillées figurent dans `INTEGRATION_VALIDATION.md`. Le bouton Connecter Google démarre le flux OAuth popup via `auth-url`; aucun token OAuth n'est transmis au navigateur. La validation OAuth/Gmail en direct reste en attente faute de configuration Google. Le détail d'exécution est récupéré une fois à l'ouverture et via le bouton d'actualisation; aucun polling automatique n'est implémenté. `/auth/me` n'est pas déclaré. `/health` est à la racine (`http://localhost:8000/health`), hors `/api/v1`, et n'est pas consommé par l'interface.

Le parcours réel d'un workflow `Manual Trigger → ML Prediction → Set Data`, exécuté depuis l'interface jusqu'à l'historique, est consigné dans [INTEGRATION_VALIDATION.md](INTEGRATION_VALIDATION.md). Il confirme le contrat HTTP et les sorties du modèle de démonstration sans rendre les limites ci-dessus opérationnelles.


## HTTP Request Credentials ? phase 9

Le panneau du n?ud HTTP Request r?f?rence les credentials `api_key` et `http_header` sans exposer leurs valeurs. `api_key` envoie `data.api_key` dans le header configurable `api_key_header` (pr?fixe `Bearer ` par d?faut); `http_header` ajoute la carte de headers conserv?e dans le credential chiffr?. Le backend limite la r?solution au propri?taire du workflow et au type r?f?renc?. Les headers sensibles et valeurs secr?tes exactes sont expurg?s des r?sultats d?ex?cution; les requ?tes authentifi?es ne suivent pas les redirections. Le test de requ?te authentifi?e vers httpbin avec une cl? de test a retourn? `200`, `authenticated=true` et une sortie sans la cl?.


## Google OAuth et Gmail ? phase 10

Le bouton ? Connecter Google ? r?cup?re une URL d?autorisation authentifi?e et l?ouvre dans une popup, ce qui conserve la session SPA en m?moire. Le callback du backend enregistre les tokens chiffr?s et retourne un statut `postMessage` limit? ? l?origine `FRONTEND_URL`; le frontend recharge ensuite la liste des credentials. Les tests unitaires valident le state sign? ? usage unique, le statut popup sans token et la r?solution du credential chiffr? par Gmail Send.

Aucun `GOOGLE_CLIENT_ID` ni `GOOGLE_CLIENT_SECRET` n’est configuré dans l’environnement de validation. Le consentement Google et l’envoi/réception Gmail réels restent donc non vérifiés.
