# Validation Frontend ↔ Backend ↔ ML

## Parcours exécuté

Validation réelle effectuée le 19 octobre 2026 avec Edge et Playwright. Le navigateur a utilisé Vite sur `127.0.0.1:5173`, l'API FlowForge sur `127.0.0.1:8005` et l'API FlowForge-ML existante sur `127.0.0.1:8004`. Les requêtes étaient des appels HTTP réels; aucun backend simulé n'était utilisé.

La base vérifiée était `flowforge_test` sur `127.0.0.1:55432`, avec l'utilisateur de test `flowforge_test` et la révision Alembic `0004_trigger_type_alignment`. Redis de test sur `127.0.0.1:6380` répondait `PONG`. L'API écoute sur `8005` parce que le port `8000` était déjà occupé. Les services préexistants sur `6379`, `8001` et `8002` n'ont pas été utilisés par ce parcours.

Le navigateur a exécuté l'inscription, une connexion refusée (HTTP 401 et message visible), la connexion valide, le dashboard, la liste, la création d'un workflow, l'ajout et la configuration de `Manual Trigger`, `ML Prediction` et `Set Data`, leurs deux connexions, la sauvegarde, le rechargement, l'activation, l'exécution manuelle et la consultation de l'historique.

L'API ML a répondu `ready: true`; `/models` annonçait `breast_cancer_logistic_regression` et ses 30 caractéristiques. L'exécution backend a reçu HTTP 202, puis son détail final HTTP 200 a montré le statut `success` et trois nœuds réussis. Pour l'entrée de démonstration utilisée, le nœud `ML Prediction` a retourné `prediction: "malignant"` et `confidence: 0.9999999938818932`; le nœud `Set Data` dépendant a retourné `{"label":"malignant"}`. Ces données ne changent pas la terminologie générique du produit.

L'historique ne rafraîchit pas encore automatiquement un détail `queued`/`running`. Le test navigateur a utilisé le bouton **Actualiser le détail** jusqu'au statut final; l'exécution et les deux sorties de nœuds étaient alors visibles. Les états de chargement du workflow et l'erreur d'authentification ont été observés dans le navigateur.

## Validation Schedule Trigger — phase 7C

Validation réelle effectuée le 19 octobre 2026 depuis l'éditeur frontend avec Chromium, Vite sur `127.0.0.1:5173`, l'API sur `127.0.0.1:8005`, PostgreSQL de test isolé sur `127.0.0.1:55432` et Redis de test sur `127.0.0.1:6380` (base Redis 1). Le PostgreSQL temporaire utilisait un stockage `tmpfs`; les services préexistants sur `5432`, `6379` et `8000` n'ont pas été modifiés.

Dans le navigateur, un compte de test temporaire a créé un workflow ne contenant qu'un `Schedule Trigger`. L'expression `* * * * *` et le fuseau `UTC` ont été saisis, sauvegardés, puis retrouvés après navigation vers la liste et réouverture du workflow. L'activation et la désactivation ont été confirmées dans l'interface et par l'état workflow de l'API. Après réactivation, le worker ARQ a produit une exécution programmée réelle avec `trigger_type=schedule_trigger` et `status=success`. La ligne Schedule en base contenait `cron_expression=* * * * *`, `timezone=UTC` et `is_active=false` après la désactivation finale.

Le test d'intégration backend `tests/integration/test_schedule_lifecycle.py` a aussi réussi (`2 passed`). Les conteneurs de test ont été supprimés après la validation; les données PostgreSQL étaient en mémoire.

## Défaut corrigé

Le clic d'ajout plaçait les nœuds successifs à seulement 24 px d'écart. Dans le navigateur, ils se chevauchaient et intercepteraient les gestes nécessaires aux connexions. Le placement initial utilise maintenant deux colonnes quand le canvas est assez large et une seule colonne autrement, avec un espacement vertical suffisant. Le parcours Edge/Playwright a ensuite créé réellement les deux arêtes et terminé l'exécution ML.

## Compatibilité et limites vérifiées

- Le backend expose l'authentification, le CRUD workflows, activation, exécution manuelle et lecture des exécutions aux chemins utilisés par les services frontend. Les statuts HTTP et le résultat sont détaillés dans la validation réelle ci-dessus.
- Les détails d'exécution sont récupérables via `GET /executions/{execution_id}`. L'écran offre un rafraîchissement manuel, sans polling automatique.
- Le Schedule Trigger est configurable et sa planification a été observée dans le parcours de phase 7C décrit ci-dessus.
- Le parcours Webhook Trigger est validé depuis l’interface jusqu’au worker : création dans la palette, URL disponible après sauvegarde, activation, appel `POST` retournant `202`, exécution ARQ `success` avec le payload JSON attendu, URL inchangée après réouverture, puis désactivation suivie d’un `409`.

## Validation Webhook Trigger — phase 8

Les tests backend `tests/integration/test_webhook_lifecycle.py` passent sur un PostgreSQL temporaire initialisé par Alembic (`3 passed`). Ils vérifient la création et la stabilité du token UUID v4 hors graphe, l’accès à l’URL limité au propriétaire, l’enqueue du payload uniquement quand le workflow est actif, et la suppression du trigger lors du remplacement par un trigger manuel.

Le parcours navigateur a utilisé l’API sur `127.0.0.1:8005`, le frontend sur `127.0.0.1:5173`, PostgreSQL éphémère sur `55432` et Redis éphémère sur `6380`. L’appel réel a créé l’exécution `788b6897-fc17-4b91-98be-de938d1e65e7`, terminée en `success` avec `trigger_type=webhook_trigger` et `input_data={"event":"browser.e2e","order_id":981}`. Après ouverture à nouveau du workflow, la même URL a été affichée. La désactivation a produit `409` et `{"detail":"Workflow is not active"}` sur l’appel suivant.

Les conteneurs temporaires, l’API, le worker, Vite et le profil Chromium ont été arrêtés après vérification; les services Docker préexistants n’ont pas été arrêtés.

## Stabilisation générale — phase 11

Le 19 octobre 2026, la suite backend complète a été exécutée avec PostgreSQL et Redis temporaires isolés ainsi que le service FlowForge-ML réel : `123 passed`, `0 skipped`, `0 failed`. Le test `tests/integration/test_ml_prediction_e2e.py` a été activé avec `RUN_ML_E2E=1`; il a vérifié le service de prédiction, le runner réel, les sorties du nœud dépendant et la relecture indépendante des résultats persistés dans PostgreSQL. Cinq avertissements de dépréciation ont été émis.

Les contrôles frontend ont réussi : `npm.cmd test` (18 tests sur 6 fichiers), `npm.cmd run typecheck`, `npm.cmd run build` et `npm.cmd run lint`. Le build signale un bundle principal supérieur au seuil indicatif de 500 kB; il ne bloque pas le build.

Une vérification réelle API + worker ARQ a aussi créé et activé un workflow `Manual Trigger → Set Data`, l’a déclenché via `POST /workflows/{id}/executions` et a attendu son résultat par l’API. L’exécution `33b7319e-60d3-44c4-a488-50860766c89d` est terminée en `success`; l’historique contient les deux nœuds réussis, les données d’entrée et la sortie `{"phase11_check":"manual-e2e-passed"}`. Un workflow inactif a été refusé avec HTTP 409. Les données de test sont restées dans la base éphémère, supprimée après contrôle.

La validation conditionnelle Google reste ouverte : les variables `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` ne sont pas configurées, donc aucun consentement OAuth, accès Gmail ou envoi réel n’a été effectué. Le parcours ML E2E est maintenant validé. La plateforme ne peut pas être déclarée entièrement validée tant que le consentement Google et les appels Gmail réels n’ont pas été vérifiés avec une configuration OAuth et un compte autorisé.
- Le frontend démarre le flux Google OAuth avec une popup, mais le consentement Google et les appels Gmail réels restent à valider avec des identifiants OAuth configurés.
- Le nœud `HTTP Request` résout les credentials `api_key` et `http_header` appartenant au propriétaire; les secrets sont chiffrés et expurgés des résultats persistés.
- Le modèle ML de démonstration a été utilisé uniquement pour la validation technique du contrat et de la chaîne d'exécution.

## Services et nettoyage

Pour le parcours ML ci-dessus, le worker ARQ utilisait `REDIS_URL=redis://127.0.0.1:6380/0`; l'API et le worker pointaient sur `flowforge_test` avec `FLOWFORGE_ML_URL=http://127.0.0.1:8004`. Pour le test Schedule phase 7C, Redis DB 1 (`redis://127.0.0.1:6380/1`) était utilisé avec la même base de test et `VITE_API_BASE_URL=http://127.0.0.1:8005/api/v1`. Les conteneurs temporaires de ce test ont été arrêtés et supprimés. Les services préexistants n'ont pas été arrêtés.

Après lecture et vérification des résultats, les comptes temporaires préfixés `phase6-` ainsi que leurs workflows, exécutions, sorties de nœuds et credentials ont été supprimés de la base de test. Une requête de contrôle n'a trouvé aucune ligne restante pour ces comptes. Aucune donnée ni aucun fichier du dépôt FlowForge-ML n'a été modifié.
