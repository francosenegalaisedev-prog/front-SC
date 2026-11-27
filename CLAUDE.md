# Règles du projet Frontend — LogCard

- **Style & UI** : Applique systématiquement le skill `.claude/skills/unslop/SKILL.md` sur toute création ou modification d'interface et de texte. Privilégie Tailwind CSS et les dépendances déjà présentes dans `package.json`.
Garde uniqument et avec precaution les css lier au fiches
- **Intégrité métier** : Ne modifie jamais les fichiers de services API (`*.service.ts`), la gestion de session, ni la logique canvas/impression (`CardStudio` / `print.ts`) lors d'une tâche UI.
- **Tests & Accessibilité** : Conserve intacts les attributs `role`, `aria-label`, `aria-expanded`, `type` et `placeholder` ciblés par les tests unitaires.
- **Validation** : Avant de terminer une tâche, exécute `npm run typecheck`, `npm test` et `npm run build`.