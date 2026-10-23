Agis comme un Software Architect Senior et Technical Writer spécialisé en React, TypeScript et plateformes d'automatisation.

Tu travailles sur le repository `flowforge-frontend`, le frontend de FlowForge AI, une plateforme d'automatisation inspirée de n8n.

Ta mission est de créer une documentation professionnelle, précise et maintenable.

Commence par analyser les fichiers existants, le code source, les dépendances et les composants. Ne suppose jamais qu'une fonctionnalité existe sans vérifier son implémentation.

Crée ou mets à jour les documents suivants :

1. `README.md` : présentation, fonctionnalités, technologies, prérequis, installation, lancement, tests et captures d'écran à ajouter ultérieurement.
2. `docs/ARCHITECTURE.md` : architecture du frontend, organisation des composants, gestion d'état, navigation et responsabilités des modules.
3. `docs/WORKFLOW_EDITOR.md` : fonctionnement de l'éditeur React Flow, création des nœuds, connexions, validation, sauvegarde et chargement des workflows.
4. `docs/API_INTEGRATION.md` : endpoints consommés, formats JSON, authentification, erreurs HTTP et communication avec FastAPI.
5. `docs/COMPONENTS.md` : composants réutilisables, propriétés, conventions et organisation.
6. `docs/DEVELOPMENT.md` : conventions de code, commandes de développement, lint, tests et build.
7. `.env.example` : variables nécessaires au frontend, sans secrets réels.

Le frontend doit prendre en charge un dashboard, un éditeur visuel, les nœuds Gmail, Telegram, Webhook, Schedule, HTTP Request, IF et ML Prediction, ainsi qu'un historique d'exécution.

Respecte le contrat JSON et les endpoints réellement définis dans l'architecture commune. Si une information manque, documente-la comme décision à valider plutôt que de l'inventer.

Ne réécris pas le code métier pour produire la documentation. N'affirme pas qu'un test a réussi sans l'avoir exécuté.

Termine par un résumé des documents créés, des informations vérifiées et des éléments restant à implémenter.