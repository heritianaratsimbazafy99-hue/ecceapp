export const heroMetrics = [
  { value: "92%", label: "de progression visible pour chaque coaché" },
  { value: "4 rôles", label: "gérés nativement avec permissions fines" },
  { value: "1 cockpit", label: "pour suivre contenus, quiz et coaching" }
];

export const productPillars = [
  {
    title: "Parcours guidés",
    description:
      "Chaque coaché sait quoi faire ensuite, reprend là où il s'est arrêté et voit les prochaines actions attendues."
  },
  {
    title: "Evaluation reliée au contenu",
    description:
      "Chaque ressource peut déboucher sur un quiz, un devoir, une correction ou une session de coaching."
  },
  {
    title: "Pilotage coach",
    description:
      "Le coach repère vite les retards, les blocages et les coachés qui ont besoin d'une relance humaine."
  }
];

export const experienceBlocks = [
  {
    title: "Bibliothèque hybridée",
    description:
      "Documents, vidéos hébergées, liens externes, replays et embeds YouTube dans un même espace cohérent."
  },
  {
    title: "Cohortes et assignations",
    description:
      "Publier un contenu ou un quiz pour une cohorte, un groupe, ou un seul coaché sans recréer la structure."
  },
  {
    title: "Journal de coaching",
    description:
      "Centraliser objectifs, feedbacks, prochaines actions et compte-rendus de sessions dans une fiche unique."
  },
  {
    title: "Notifications utiles",
    description:
      "Rappels avant échéance, résultats disponibles, nouveau feedback et alertes ciblées selon l'avancement."
  }
];

export const roadmapPhases = [
  {
    title: "V1.0",
    focus: "Socle académique",
    items: [
      "authentification et rôles",
      "bibliothèque de contenus",
      "programmes et modules",
      "quiz, notes et deadlines"
    ]
  },
  {
    title: "V1.5",
    focus: "Accompagnement",
    items: [
      "fiche de progression",
      "feedbacks coach",
      "assignations ciblées",
      "sessions live et replay"
    ]
  },
  {
    title: "V2.0",
    focus: "Communauté et scale",
    items: [
      "annuaire et groupes privés",
      "analytics avancés",
      "automatisations",
      "réservation de sessions"
    ]
  }
];

export const dashboardMetrics = [
  { label: "Modules complétés", value: "11/16", delta: "+2 cette semaine" },
  { label: "Quiz en attente", value: "3", delta: "1 deadline demain" },
  { label: "Feedbacks coach", value: "7", delta: "2 nouveaux aujourd'hui" },
  { label: "Taux de progression", value: "68%", delta: "+9 pts ce mois-ci" }
];

export const learningTimeline = [
  {
    title: "Atelier 03 - Positionnement de coach",
    meta: "vidéo + fiche d'exercice",
    status: "à continuer"
  },
  {
    title: "Quiz - Cadre de séance",
    meta: "8 questions · tentative 1/2",
    status: "à rendre avant jeudi"
  },
  {
    title: "Débrief avec ton coach référent",
    meta: "session du 18 avril à 14h00",
    status: "confirmé"
  }
];

export const deadlineItems: Array<{
  title: string;
  due: string;
  tone: DeadlineTone;
}> = [
  {
    title: "QCM - Déontologie du coaching",
    due: "Mardi 15 avril · 23:59",
    tone: "warning"
  },
  {
    title: "Soumission - Étude de cas client",
    due: "Jeudi 17 avril · 18:00",
    tone: "default"
  },
  {
    title: "Replay obligatoire - Session onboarding",
    due: "Vendredi 18 avril · 12:00",
    tone: "success"
  }
];

export const libraryCollections: Array<{
  title: string;
  description: string;
  items: string[];
  tone: LibraryTone;
}> = [
  {
    title: "Fondamentaux du coaching",
    description:
      "Le socle méthodologique pour cadrer une posture claire, éthique et professionnelle.",
    items: ["12 vidéos", "8 supports PDF", "3 quiz"],
    tone: "sun"
  },
  {
    title: "Pratique guidée",
    description:
      "Ressources orientées mises en situation, analyse de cas et débriefs supervisés.",
    items: ["6 cas pratiques", "4 templates", "2 replays"],
    tone: "mint"
  },
  {
    title: "Développement d'activité",
    description:
      "Positionnement, offre, communication et passage à l'action pour les coachés entrepreneurs.",
    items: ["9 leçons", "5 checklists", "1 masterclass"],
    tone: "ink"
  }
];

export const coachAlerts = [
  {
    label: "Coachés à risque",
    value: "5",
    note: "inactivité > 7 jours ou devoir en retard"
  },
  {
    label: "Soumissions à corriger",
    value: "12",
    note: "dont 4 prioritaires aujourd'hui"
  },
  {
    label: "Sessions prévues",
    value: "8",
    note: "sur les 48 prochaines heures"
  }
];

export const coachRoster = [
  {
    name: "Lina Raharisoa",
    cohort: "Promo Avril",
    progress: "84%",
    status: "sur la bonne voie",
    action: "corriger son étude de cas"
  },
  {
    name: "Mickael Razaf",
    cohort: "Promo Avril",
    progress: "41%",
    status: "à relancer",
    action: "retard sur 2 quiz"
  },
  {
    name: "Sarah N.",
    cohort: "Promo Business",
    progress: "67%",
    status: "préparer le débrief",
    action: "session vendredi"
  }
];

export const messageHighlights = [
  "Un nouveau quiz a été publié dans Fondamentaux du coaching.",
  "Ton coach a commenté ta dernière soumission.",
  "Le replay de la classe collective est disponible."
];
type DeadlineTone = "default" | "warning" | "success";
type LibraryTone = "sun" | "mint" | "ink";
