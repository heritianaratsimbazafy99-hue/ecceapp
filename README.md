# ECCE Platform

Socle moderne pour la future plateforme ECCE: contenus pédagogiques, parcours, quiz, suivi des coachés, dashboards coach et back-office admin.

## Stack recommandée

- Next.js App Router
- TypeScript
- Supabase pour l'authentification, la base de données et le storage
- Vercel pour l'hébergement

## Démarrage

1. Copier `.env.example` vers `.env.local`
2. Renseigner les variables Supabase
3. Installer les dépendances avec `npm install`
4. Lancer le projet avec `npm run dev`

## Périmètre du socle

- Landing page produit orientée SaaS
- Shell applicatif pour dashboard, bibliothèque et espace coach
- Cadrage technique dans `docs/architecture.md`
- Schéma SQL initial dans `supabase/schema.sql`

## Priorités produit

- Authentification avec rôles `admin`, `professor`, `coach`, `coachee`
- Bibliothèque de contenus structurée
- Quiz et évaluations
- Progression des coachés
- Notifications et deadlines
- Cockpit coach et cockpit admin

## Déploiement

- Vercel côté frontend
- Projet Supabase dédié ECCE
- Variables d'environnement configurées dans Vercel
- Migrations SQL jouées via Supabase CLI ou SQL Editor
