"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { Badge } from "@/components/ui/badge";

type LibraryResource = {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  subcategory: string | null;
  tags: string[];
  badge: string;
  createdAt: string;
  secondaryBadge: string | null;
  meta: string;
  href: string | null;
  hrefLabel: string | null;
  type: "content" | "quiz";
};

type LibraryGroup = {
  category: string;
  items: LibraryResource[];
};

type LibraryThemeMap = {
  category: string;
  count: number;
  contentCount: number;
  quizCount: number;
  subthemes: Array<{
    label: string;
    count: number;
    topics: string[];
  }>;
  topics: string[];
};

const publicationDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short"
});

function contentTone(contentType: string) {
  switch (contentType) {
    case "youtube":
      return "warning";
    case "video":
      return "accent";
    case "document":
      return "success";
    case "quiz":
    case "qcm":
    case "assessment":
      return "accent";
    default:
      return "neutral";
  }
}

function buildLibraryHref({
  query,
  filter
}: {
  query?: string;
  filter?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query?.trim()) {
    searchParams.set("query", query.trim());
  }

  if (filter && filter !== "all") {
    searchParams.set("filter", filter);
  }

  const value = searchParams.toString();
  return value ? `/library?${value}` : "/library";
}

function formatPublicationDate(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return publicationDateFormatter.format(new Date(timestamp));
}

function LibraryResourceCard({
  compact = false,
  item,
  search
}: {
  compact?: boolean;
  item: LibraryResource;
  search: string;
}) {
  const publishedAt = formatPublicationDate(item.createdAt);

  return (
    <article className={`collection-card library-resource-card${compact ? " library-resource-card-compact" : ""}`}>
      <div>
        <div className="tag-row">
          <Badge tone={contentTone(item.badge)}>{item.badge}</Badge>
          {item.secondaryBadge ? <Badge tone="neutral">{item.secondaryBadge}</Badge> : null}
        </div>

        <h3>{item.title}</h3>
        <p>{item.summary}</p>

        <div className="library-resource-meta">
          <Link href={buildLibraryHref({ filter: item.subcategory || "Sans sous-thème", query: search })}>
            {item.subcategory || "Sans sous-thème"}
          </Link>
          <span>{item.meta}</span>
          {publishedAt ? <span>{publishedAt}</span> : null}
        </div>

        {item.tags.length ? (
          <div className="collection-tags">
            {item.tags.map((tag) => (
              <Link
                className="collection-tag library-topic-pill"
                href={buildLibraryHref({ filter: tag, query: search })}
                key={tag}
              >
                {tag}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="library-resource-actions">
        {item.href ? (
          <Link
            className="button"
            href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
          >
            {item.hrefLabel}
          </Link>
        ) : (
          <span className="form-hint">Aucun lien rattaché pour le moment.</span>
        )}
      </div>
    </article>
  );
}

export function LibraryExplorer({
  groups,
  initialFilter,
  initialSearch,
  recentResources,
  taxonomy,
  themeMap,
  totalResourceCount
}: {
  groups: LibraryGroup[];
  initialFilter?: string;
  initialSearch?: string;
  recentResources: LibraryResource[];
  taxonomy: string[];
  themeMap: LibraryThemeMap[];
  totalResourceCount: number;
}) {
  const [search, setSearch] = useState(initialSearch ?? "");
  const activeTag = initialFilter || "all";
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const subthemeLabel = item.subcategory || "Sans sous-thème";
        const matchesTag =
          activeTag === "all" ||
          item.category === activeTag ||
          subthemeLabel === activeTag ||
          item.tags.includes(activeTag);
        const haystack = [item.title, item.summary ?? "", item.category, subthemeLabel, item.meta, ...item.tags]
          .join(" ")
          .toLowerCase();

        const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
        return matchesTag && matchesSearch;
      })
    }))
    .filter((group) => group.items.length);

  const totalResults = filteredGroups.reduce((total, group) => total + group.items.length, 0);
  const totalResources = groups.reduce((total, group) => total + group.items.length, 0);
  const totalSubthemes = themeMap.reduce((total, theme) => total + theme.subthemes.length, 0);
  const activeFilterLabel = activeTag === "all" ? "Toute la bibliothèque" : activeTag;
  const availableFilters = new Set(taxonomy);
  const resolveCoachFilter = (options: string[]) => options.find((option) => availableFilters.has(option)) ?? "all";
  const coachLanes = [
    {
      label: "Préparer une séance",
      description: "Cadre, scripts, supports et ressources à ouvrir avant un rendez-vous.",
      filter: resolveCoachFilter(["Cadre de séance", "Pratique coach", "Outils et scripts", "séance"])
    },
    {
      label: "Relancer un coaché",
      description: "Ressources utiles quand l’engagement, les deadlines ou la motivation baissent.",
      filter: resolveCoachFilter(["Engagement", "deadline", "relance", "motivation"])
    },
    {
      label: "Renforcer un acquis",
      description: "Quiz, feedbacks et contenus pivots pour consolider une compétence fragile.",
      filter: resolveCoachFilter(["Évaluation", "quiz", "feedback", "compétence"])
    },
    {
      label: "Outiller une action",
      description: "Templates, exercices et trames directement activables en accompagnement.",
      filter: resolveCoachFilter(["Outils et scripts", "template", "exercice", "support"])
    }
  ];

  return (
    <div className="library-explorer">
      <section className="panel panel-highlight library-search-panel">
        <div className="library-search-head">
          <div>
            <span className="eyebrow">Explorer</span>
            <h3>Une bibliothèque organisée comme un plan de coaching</h3>
            <p>Parcours les contenus par thème, sous-thème et sujets abordés pour préparer une séance ou relancer un coaché plus vite.</p>
          </div>

          <div className="library-intelligence-grid">
            <div className="library-search-stats">
              <strong>{totalResults}</strong>
              <span>résultat(s)</span>
            </div>
            <div className="library-search-stats">
              <strong>{themeMap.length}</strong>
              <span>thème(s)</span>
            </div>
            <div className="library-search-stats">
              <strong>{totalSubthemes}</strong>
              <span>sous-thème(s)</span>
            </div>
          </div>
        </div>

        <form action="/library" className="library-search-bar" method="get">
          {activeTag !== "all" ? <input name="filter" type="hidden" value={activeTag} /> : null}
          <input
            onChange={(event) => setSearch(event.target.value)}
            name="query"
            placeholder="Rechercher un contenu, un quiz, un tag ou une catégorie..."
            type="search"
            value={search}
          />
          <button className="button button-secondary" type="submit">
            Rechercher
          </button>
        </form>

        <div className="tag-row">
          <Link
            className={`library-filter-chip${activeTag === "all" ? " is-active" : ""}`}
            href={buildLibraryHref({ query: search })}
          >
            Tout
          </Link>
          {taxonomy.map((item) => (
            <Link
              className={`library-filter-chip${activeTag === item ? " is-active" : ""}`}
              href={buildLibraryHref({ filter: item, query: search })}
              key={item}
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="library-taxonomy-summary">
          <strong>{activeFilterLabel}</strong>
          <span>{totalResources} ressource(s) dans la vue active sur {totalResourceCount} publiée(s), dont {themeMap.reduce((total, theme) => total + theme.quizCount, 0)} quiz rattachés au plan pédagogique.</span>
        </div>

        <div className="library-coach-lane-grid">
          {coachLanes.map((lane) => (
            <Link
              className={`library-coach-lane-card${lane.filter !== "all" && activeTag === lane.filter ? " is-active" : ""}`}
              href={buildLibraryHref({ filter: lane.filter, query: search })}
              key={lane.label}
            >
              <strong>{lane.label}</strong>
              <span>{lane.description}</span>
            </Link>
          ))}
        </div>

        <div className="library-taxonomy-map">
          {themeMap.map((theme) => (
            <article className="library-taxonomy-card" key={theme.category}>
              <Link
                className="library-taxonomy-card-head"
                href={buildLibraryHref({ filter: theme.category, query: search })}
              >
                <span>{theme.category}</span>
                <strong>{theme.count}</strong>
              </Link>

              <div className="library-taxonomy-counts">
                <span>{theme.contentCount} contenu(x)</span>
                <span>{theme.quizCount} quiz</span>
              </div>

              {theme.subthemes.length ? (
                <div className="library-subtheme-list">
                  {theme.subthemes.slice(0, 4).map((subtheme) => (
                    <Link
                      className="library-subtheme-button"
                      href={buildLibraryHref({ filter: subtheme.label, query: search })}
                      key={`${theme.category}-${subtheme.label}`}
                    >
                      <span>{subtheme.label}</span>
                      <strong>{subtheme.count}</strong>
                    </Link>
                  ))}
                </div>
              ) : null}

              {theme.topics.length ? (
                <div className="library-topic-row">
                  {theme.topics.slice(0, 5).map((topic) => (
                    <Link
                      className="library-topic-pill"
                      href={buildLibraryHref({ filter: topic, query: search })}
                      key={`${theme.category}-${topic}`}
                    >
                      {topic}
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {recentResources.length ? (
        <section className="panel library-recent-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Nouveau</span>
              <h3>Dernières publications</h3>
              <p>Les contenus et quiz publiés remontent ici immédiatement après création.</p>
            </div>
            <Link className="button button-secondary button-small" href="/admin/content">
              Créer un contenu
            </Link>
          </div>

          <div className="library-recent-grid">
            {recentResources.map((item) => (
              <LibraryResourceCard compact item={item} key={`recent-${item.id}`} search={search} />
            ))}
          </div>
        </section>
      ) : null}

      {filteredGroups.length ? (
        <section className="library-section-stack">
          {filteredGroups.map((group) => {
            const groupTheme = themeMap.find((theme) => theme.category === group.category);

            return (
              <div className="panel" key={group.category}>
                <div className="panel-header">
                  <h3>{group.category}</h3>
                  <p>{group.items.length} ressource(s) dans cette collection.</p>
                </div>

                {groupTheme?.subthemes.length ? (
                  <div className="library-group-taxonomy">
                    {groupTheme.subthemes.slice(0, 5).map((subtheme) => (
                      <Link
                        className="library-subtheme-button"
                        href={buildLibraryHref({ filter: subtheme.label, query: search })}
                        key={`${group.category}-group-${subtheme.label}`}
                      >
                        <span>{subtheme.label}</span>
                        <strong>{subtheme.count}</strong>
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="library-showcase-grid">
                  {group.items.map((item) => (
                    <LibraryResourceCard item={item} key={item.id} search={search} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="panel">
          <div className="empty-state">
            <strong>Aucune ressource ne correspond à ce filtre.</strong>
            <p>Essaie un autre mot-clé ou réinitialise le tag sélectionné.</p>
          </div>
        </section>
      )}
    </div>
  );
}
