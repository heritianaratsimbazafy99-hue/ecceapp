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

export function LibraryExplorer({
  groups,
  taxonomy,
  themeMap
}: {
  groups: LibraryGroup[];
  taxonomy: string[];
  themeMap: LibraryThemeMap[];
}) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>("all");
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

        <div className="library-search-bar">
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un contenu, un quiz, un tag ou une catégorie..."
            type="search"
            value={search}
          />
        </div>

        <div className="tag-row">
          <button
            className={`library-filter-chip${activeTag === "all" ? " is-active" : ""}`}
            onClick={() => setActiveTag("all")}
            type="button"
          >
            Tout
          </button>
          {taxonomy.map((item) => (
            <button
              className={`library-filter-chip${activeTag === item ? " is-active" : ""}`}
              key={item}
              onClick={() => setActiveTag(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="library-taxonomy-summary">
          <strong>{activeFilterLabel}</strong>
          <span>{totalResources} ressource(s) publiées, dont {themeMap.reduce((total, theme) => total + theme.quizCount, 0)} quiz rattachés au plan pédagogique.</span>
        </div>

        <div className="library-taxonomy-map">
          {themeMap.map((theme) => (
            <article className="library-taxonomy-card" key={theme.category}>
              <button
                className="library-taxonomy-card-head"
                onClick={() => setActiveTag(theme.category)}
                type="button"
              >
                <span>{theme.category}</span>
                <strong>{theme.count}</strong>
              </button>

              <div className="library-taxonomy-counts">
                <span>{theme.contentCount} contenu(x)</span>
                <span>{theme.quizCount} quiz</span>
              </div>

              {theme.subthemes.length ? (
                <div className="library-subtheme-list">
                  {theme.subthemes.slice(0, 4).map((subtheme) => (
                    <button
                      className="library-subtheme-button"
                      key={`${theme.category}-${subtheme.label}`}
                      onClick={() => setActiveTag(subtheme.label)}
                      type="button"
                    >
                      <span>{subtheme.label}</span>
                      <strong>{subtheme.count}</strong>
                    </button>
                  ))}
                </div>
              ) : null}

              {theme.topics.length ? (
                <div className="library-topic-row">
                  {theme.topics.slice(0, 5).map((topic) => (
                    <button
                      className="library-topic-pill"
                      key={`${theme.category}-${topic}`}
                      onClick={() => setActiveTag(topic)}
                      type="button"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

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
                      <button
                        className="library-subtheme-button"
                        key={`${group.category}-group-${subtheme.label}`}
                        onClick={() => setActiveTag(subtheme.label)}
                        type="button"
                      >
                        <span>{subtheme.label}</span>
                        <strong>{subtheme.count}</strong>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="library-showcase-grid">
                  {group.items.map((item) => (
                    <article className="collection-card library-resource-card" key={item.id}>
                      <div>
                        <div className="tag-row">
                          <Badge tone={contentTone(item.badge)}>{item.badge}</Badge>
                          {item.secondaryBadge ? <Badge tone="neutral">{item.secondaryBadge}</Badge> : null}
                        </div>

                        <h3>{item.title}</h3>
                        <p>{item.summary}</p>

                        <div className="library-resource-meta">
                          <button onClick={() => setActiveTag(item.subcategory || "Sans sous-thème")} type="button">
                            {item.subcategory || "Sans sous-thème"}
                          </button>
                          <span>{item.meta}</span>
                        </div>

                        {item.tags.length ? (
                          <div className="collection-tags">
                            {item.tags.map((tag) => (
                              <button
                                className="collection-tag library-topic-pill"
                                key={tag}
                                onClick={() => setActiveTag(tag)}
                                type="button"
                              >
                                {tag}
                              </button>
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
