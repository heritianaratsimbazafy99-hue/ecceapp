# Cadrage technique ECCE

## Positionnement

ECCE doit être pensé comme une plateforme d'apprentissage accompagnée, pas comme une simple bibliothèque de contenus. Le coeur du produit repose sur quatre flux: apprendre, soumettre, être évalué, être accompagné.

## Stack

- Frontend: Next.js App Router avec TypeScript
- Backend applicatif: Server Components, Route Handlers et Server Actions au besoin
- Auth & Data: Supabase Auth, Postgres, Row Level Security, Storage
- Hébergement: Vercel

## Domaines métier

### Identité et accès

- profils utilisateurs
- rôles multiples par utilisateur
- cohortes, groupes et assignations

### Contenus et parcours

- programmes
- modules
- contenus de type document, vidéo, replay, ressource externe
- catégories, sous-catégories, tags

### Evaluation

- quiz
- banque de questions
- tentatives
- corrections automatiques et manuelles
- système de notes

### Accompagnement

- journal de coaching
- sessions planifiées
- feedbacks sur soumissions
- alertes et relances

## Routes recommandées

- `/` landing et présentation de la valeur
- `/auth/sign-in` entrée utilisateur
- `/dashboard` cockpit coaché
- `/library` bibliothèque structurée
- `/coach` cockpit coach
- `/admin` futur cockpit de pilotage

## Principes de permissions

- `admin`: administration globale et configuration
- `professor`: création pédagogique et publication
- `coach`: suivi, correction, commentaire, animation
- `coachee`: consultation, participation, soumission

Le modèle recommandé repose sur des permissions fines en base, même si l'interface parle en termes de rôles. Cela permettra d'ajouter plus tard des rôles hybrides sans refondre l'authentification.

## Architecture fonctionnelle recommandée

### MVP

- authentification
- gestion des rôles
- bibliothèque de contenus
- programmes et modules
- quiz et deadlines
- dashboards coaché et coach

### Phase 2

- sessions live et replays
- messagerie contextualisée
- fiche de progression individuelle
- feedback détaillé des coachs

### Phase 3

- communauté
- réservation de sessions
- analytics avancés
- automatisations

## Choix vidéo

Approche hybride recommandée:

- vidéos publiques ou pédagogiques classiques: lien ou embed YouTube
- vidéos privées, premium ou sensibles: upload Supabase Storage

Ce choix réduit fortement les coûts de stockage et de bande passante tout en gardant la possibilité de protéger certains contenus premium.
