# FlowForge Frontend

Interface web de FlowForge AI, plateforme d'automatisation de workflows. Le frontend offre maintenant une navigation complète, un éditeur React Flow local et une intégration aux routes backend disponibles.

## Fonctionnalités

- Dashboard alimenté par les listes de workflows et d'exécutions; le taux de réussite est calculé sur les 100 exécutions chargées.
- Authentification Login/Register, avec JWT gardé uniquement en mémoire.
- Liste paginée des workflows, recherche locale, activation/désactivation et suppression.
- Éditeur React Flow avec les types backend, configuration, validation locale, chargement, sauvegarde, activation et déclenchement manuel.
- Historique paginé, détails, sorties et erreurs des nœuds; annulation des exécutions en attente/en cours.
- Consultation et création/suppression de credentials. L'API ne retourne au frontend que leurs métadonnées.
- États de chargement, erreurs HTTP et notifications.

Les types de nœuds, requêtes et réponses suivent le code backend documenté dans [API_INTEGRATION.md](docs/API_INTEGRATION.md). Le Schedule est un type de graphe accepté, mais le backend ne déclare pas de route de planification. Le flux de redirection OAuth Gmail n'est pas encore piloté depuis le frontend.

## Stack

React 19, TypeScript strict, Vite 8, React Router 7, Tailwind CSS 4 et `@xyflow/react`.

## Prérequis et lancement

Node.js 22.12+ recommandé et npm.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Vite affiche l'URL locale, par défaut `http://localhost:5173`. L'API par défaut est `http://localhost:8000/api/v1`; le backend doit être démarré et configuré séparément.

## Vérifications

```bash
npm run lint
npm run test
npm run typecheck
npm run build
```

La suite Vitest couvre les règles de validation du graphe, le client HTTP centralisé et l'interaction de recherche/ajout de la palette de nœuds. `npm run test:watch` lance Vitest en mode interactif. Ces tests ne remplacent pas une vérification d'intégration avec une instance FastAPI.

## Captures d'écran

À ajouter : `docs/screenshots/dashboard.png`, `docs/screenshots/workflow-editor.png` et `docs/screenshots/execution-history.png`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Éditeur de workflow](docs/WORKFLOW_EDITOR.md)
- [Intégration API](docs/API_INTEGRATION.md)
- [Composants](docs/COMPONENTS.md)
- [Développement](docs/DEVELOPMENT.md)
- [Validation réelle Frontend ↔ Backend ↔ ML](docs/INTEGRATION_VALIDATION.md)
