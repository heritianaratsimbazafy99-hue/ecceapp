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
  taxonomy
}: {
  groups: LibraryGroup[];
  taxonomy: string[];
}) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>("all");
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const matchesTag =
          activeTag === "all" ||
          item.category === activeTag ||
          item.subcategory === activeTag ||
          item.tags.includes(activeTag);
        const haystack = [item.title, item.summary ?? "", item.category, item.subcategory ?? "", item.meta, ...item.tags]
          .join(" ")
          .toLowerCase();

        const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
        return matchesTag && matchesSearch;
      })
    }))
    .filter((group) => group.items.length);

  const totalResults = filteredGroups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="library-explorer">
      <section className="panel panel-highlight library-search-panel">
        <div className="library-search-head">
          <div>
            <span className="eyebrow">Explorer</span>
            <h3>Une bibliothèque plus rapide à parcourir</h3>
            <p>Filtre par mot-clé, catégorie ou tag pour retrouver une ressource en quelques secondes.</p>
          </div>

          <div className="library-search-stats">
            <strong>{totalResults}</strong>
            <span>résultat(s)</span>
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
      </section>

      {filteredGroups.length ? (
        <section className="library-section-stack">
          {filteredGroups.map((group) => (
            <div className="panel" key={group.category}>
              <div className="panel-header">
                <h3>{group.category}</h3>
                <p>{group.items.length} ressource(s) dans cette collection.</p>
              </div>

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
                        <span>{item.subcategory || "Sans sous-catégorie"}</span>
                        <span>{item.meta}</span>
                      </div>

                      {item.tags.length ? (
                        <div className="collection-tags">
                          {item.tags.map((tag) => (
                            <span className="collection-tag" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="library-resource-actions">
                      {item.href ? (
                        <Link
                          className="button"
                          href={item.href}
                          target={item.type === "content" ? "_blank" : undefined}
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
          ))}
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
