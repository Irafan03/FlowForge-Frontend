# Composants

## UI commune

| Composant | Fichier | Rôle |
|---|---|---|
| `AppShell` | `src/components/layout/AppShell.tsx` | Navigation protégée, recherche de workflows et déconnexion |
| `PageHeader` | `src/components/ui/PageHeader.tsx` | Titre, description, surtitre et action |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | État vide |
| `StatCard` | `src/components/ui/StatCard.tsx` | Valeur métrique issue des réponses API |
| `LoadingState`, `ErrorState` | `src/components/ui/RequestState.tsx` | Chargement, erreur et reprise |
| `ToastProvider`, `useToast` | `src/app/ToastContext.tsx` | Notifications accessibles succès/erreur/info |
| `AuthProvider`, `useAuth` | `src/app/AuthContext.tsx` | Session et JWT gardés en mémoire |

## Services

`src/services/apiClient.ts` centralise `fetch`, JSON, Bearer et `ApiError`. `authService`, `workflowService`, `executionService` et `credentialService` encapsulent uniquement les endpoints effectivement déclarés côté backend.

## Éditeur

| Module | Fichier | Rôle |
|---|---|---|
| Page/état éditeur | `src/features/editor/WorkflowEditorPage.tsx` | Chargement, sérialisation, sauvegarde, activation et exécution |
| `WorkflowCanvas` | `src/features/editor/WorkflowCanvas.tsx` | Canvas, contrôles, drop, validation des connexions |
| `WorkflowNode` | `src/features/editor/WorkflowNode.tsx` | Rendu et handles par type |
| `NodePalette` | `src/features/editor/NodePalette.tsx` | Recherche et ajout de nœuds |
| `NodeConfigPanel` | `src/features/editor/NodeConfigPanel.tsx` | Nom, config, références credentials et suppression |
| `graphValidation` | `src/features/editor/graphValidation.ts` | Validations client alignées backend |
| `nodeCatalog` | `src/features/editor/nodeCatalog.ts` | Libellés, groupes et clés requises |

## Pages métier

`DashboardPage` agrège les listes pour métriques; `WorkflowListPage` expose CRUD/activation; `ExecutionHistoryPage` liste et détaille l'exécution; `CredentialsPage` gère les métadonnées et crée/supprime les credentials; `AuthPage` connecte les routes register/login.

Les composants d'écran peuvent appeler les services, mais le transport ne doit pas être recodé dans les composants. Les valeurs confidentielles ne doivent pas être incluses dans une configuration de workflow.
