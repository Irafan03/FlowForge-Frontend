# Développement

## Prérequis et commandes

Node.js 22.12+ recommandé et npm.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Scripts :

| Commande | Fonction |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run lint` | ESLint sur le code du dépôt |
| `npm run test` | Suite Vitest en mode CI, une exécution |
| `npm run test:watch` | Vitest en mode interactif |
| `npm run typecheck` | TypeScript en mode projet |
| `npm run build` | Vérification TypeScript et build production |
| `npm run preview` | Prévisualisation du build |

Vitest s'exécute dans jsdom. La suite vérifie la validation du graphe (déclencheur, références d'arêtes, cycles, branches IF et secrets en clair), les en-têtes et erreurs du client HTTP, ainsi que le filtrage et l'ajout d'un nœud depuis la palette. Elle n'exerce pas une API FastAPI réelle.

## Configuration

`VITE_API_BASE_URL` pointe vers la racine `/api/v1` du backend. Vite expose les variables `VITE_*` au navigateur : n'y placer aucun secret. Le JWT est en mémoire, non persisté. Les credentials secrets sont postés au backend, dont le schéma indique qu'il chiffre les données.

## Conventions

- TypeScript strict, modèles API séparés des modèles React Flow.
- Transport centralisé dans `src/services/apiClient.ts`; services par domaine.
- États de chargement/erreur/empty explicites; pas de remplacement par données simulées.
- Garder les endpoints synchronisés avec les routeurs Python. Ne pas reprendre les routes présentes seulement dans l'ancienne documentation backend.
- Après changement du contrat graphe, vérifier la conversion editor/API et les validations backend.
- Ajouter des tests de régression pour les comportements métier modifiés; privilégier les assertions sur le comportement visible des composants.
