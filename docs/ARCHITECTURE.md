# Architecture du frontend

## Organisation

```text
src/
  app/                    App, AuthContext et ToastContext
  components/layout/      shell, navigation et header
  components/ui/          composants de présentation et états de requête
  features/auth/          Login/Register
  features/dashboard/     statistiques et activité
  features/workflows/     liste, filtre, pagination et actions CRUD
  features/editor/        canvas, types de nœud, config, validation, sérialisation
  features/executions/    liste, filtres, détail, logs et annulation
  features/credentials/   création et gestion de credentials
  services/               client HTTP centralisé et services par ressource
  types/                  modèles du contrat API et du canvas
```

Les écrans dépendent des services; le client HTTP ne dépend pas de React. Les modèles API sont séparés des objets React Flow, puis l'éditeur convertit explicitement le graphe avant envoi.

## Navigation

Routes : `/`, `/workflows`, `/workflows/new`, `/workflows/:workflowId`, `/history`, `/history/:executionId`, `/credentials`, `/login`, `/register`. `AppShell` protège les pages applicatives par session en mémoire; sans session, la navigation renvoie vers `/login` et conserve le chemin de retour.

## État et sécurité

`AuthContext` garde le JWT dans l'état React, efface la session à expiration ou sur un `401` protégé, et ne persiste rien dans localStorage/sessionStorage. Cela implique qu'un rechargement de page demande une nouvelle connexion. Les secrets de credentials sont transmis directement au backend et ne sont jamais demandés par l'API de lecture. Le backend les chiffre avant stockage. L'éditeur refuse les champs de configuration portant des noms de secret connus; ne saisissez pas de secret dans un autre champ arbitraire.

Les données serveur ne sont pas simulées. Chaque page gère chargement, erreur et état vide. Le client HTTP normalise les erreurs FastAPI et ajoute le Bearer lorsqu'un service protégé le demande.

## Limitations de routes

Le frontend n'appelle pas `/auth/me`, une route de schedule ou une route de création d'URL webhook, absentes des routeurs backend consultés. La route Gmail OAuth produit une redirection externe depuis un endpoint protégé; le flux ne peut pas être démarré proprement depuis la SPA avec les réponses CORS actuelles et reste à intégrer.
