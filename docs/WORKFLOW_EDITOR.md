# Éditeur de workflows

## Édition et persistance

Le canvas React Flow permet palette, glisser-déposer, connexions, zoom/pan, minimap, sélection et suppression. `/workflows/new` crée un graphe local. `/workflows/{id}` charge le workflow via `GET /api/v1/workflows/{id}`. Enregistrer appelle `POST /api/v1/workflows` pour une nouvelle ressource ou `PUT /api/v1/workflows/{id}` pour une ressource existante. Le brouillon n'est pas stocké dans localStorage; recharger une création non enregistrée la perd.

Activation/désactivation utilisent les routes backend correspondantes. L'exécution manuelle appelle `POST /api/v1/workflows/{id}/executions` avec `{input_data:{}}`, répond `202`, puis ouvre le détail de l'exécution. Le backend exige que le workflow soit actif.

## Types et format

Les onze types acceptés par `app/schemas/node.py` sont disponibles. React Flow utilise un type de rendu unique et place le type domaine dans `data.workflowType`. La conversion ne sérialise que les champs de contrat : `id`, `type`, `name`, `config`, `position`; `sourceHandle` et `targetHandle` deviennent `source_handle` et `target_handle`.

Les handles de `if_condition` sont `true` et `false`. Le JSON complet en cours d'édition est visible dans l'inspecteur de graphe.

## Validation

`graphValidation.ts` reprend les règles présentes dans `app/engine/validators.py` : exactement un trigger, références valides, pas de cycle, deux branches IF, champs requis et règles `allowed_chat_ids`/intervalle du Telegram Trigger. Le frontend bloque la sauvegarde si ces règles locales échouent; le backend reste l'autorité. Les configurations sont éditées en JSON. Les références `credential_id` se choisissent depuis la liste de credentials, et les clés sensibles connues sont refusées pour éviter de sérialiser des secrets dans le graphe.

## Limitations node/trigger

La route de Schedule n'existe pas dans les routeurs consultés; le type est accepté par le graphe et la logique de planification reste à valider. La config HTTP ne résout pas de références secrètes au backend inspecté; n'y placez pas de valeur secrète. Gmail OAuth ne peut pas encore être lancé depuis le frontend, comme précisé dans [API_INTEGRATION.md](API_INTEGRATION.md).
