Agis comme un développeur frontend Senior spécialisé en React, TypeScript et React Flow.

Développe le repository `flowforge-frontend` de FlowForge AI.

Stack : React, TypeScript, Vite, `@xyflow/react`, Tailwind CSS et un client HTTP centralisé.

Implémente progressivement :

1. Une interface moderne avec sidebar, header et navigation.
2. Un dashboard affichant les workflows et leurs statistiques.
3. Les pages Login et Register.
4. Une liste des workflows avec création, modification et suppression.
5. Un éditeur visuel avec canvas, zoom, minimap, glisser-déposer et connexions.
6. Un panneau de configuration des nœuds.
7. Les nœuds Webhook Trigger, Gmail Trigger, Telegram Trigger, Schedule Trigger, Gmail Send, Telegram Send Message, HTTP Request, IF et ML Prediction.
8. La sauvegarde, le chargement, le test et l'activation des workflows.
9. Une page d'historique avec les statuts, logs, erreurs et sorties des nœuds.
10. Les états de chargement, erreurs et notifications.

Contraintes :

- Respecter `docs/ARCHITECTURE.md` et le contrat JSON partagé.
- Ne pas inventer d'endpoints.
- Ne pas stocker de secrets dans le navigateur.
- Utiliser des composants réutilisables et TypeScript strict.
- Séparer les composants UI, les services API et les modèles de données.
- Prévoir les tests des composants et des fonctionnalités critiques.
- Ne pas remplacer les fonctionnalités backend par des données simulées en prétendant qu'elles sont opérationnelles.

Méthode :

Phase 1 : inspecter le repository et définir le plan.
Phase 2 : mettre en place la structure et le design.
Phase 3 : développer l'éditeur de workflows.
Phase 4 : connecter les API.
Phase 5 : ajouter les tests, corriger les erreurs et mettre à jour la documentation.

Pour chaque phase, fournis les fichiers complets à créer ou modifier, les commandes et les tests. Travaille par petites étapes et attends ma validation avant de passer à la phase suivante.

À la fin, vérifie que le README correspond réellement au code implémenté.