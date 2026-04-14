import Link from "next/link";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { Badge } from "@/components/ui/badge";
import { getLibraryPageData } from "@/lib/platform-data";

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

export default async function LibraryPage() {
  const { resources, groups, taxonomy } = await getLibraryPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Bibliothèque ECCE"
        description="La bibliothèque regroupe désormais les contenus publiés et les quiz publiés dans un même espace de consultation."
      />

      <section className="panel">
        <div className="panel-header">
          <h3>Taxonomie réelle</h3>
          <p>Les catégories, sous-catégories et tags remontent directement de la base.</p>
        </div>

        <div className="tag-row">
          {taxonomy.length ? (
            taxonomy.map((item) => (
              <Badge key={item} tone="neutral">
                {item}
              </Badge>
            ))
          ) : (
            <Badge tone="neutral">Aucune taxonomie disponible pour le moment</Badge>
          )}
        </div>
      </section>

      {resources.length ? (
        <section className="admin-grid">
          {groups.map((group) => (
            <div className="panel" key={group.category}>
              <div className="panel-header">
                <h3>{group.category}</h3>
                <p>{group.items.length} ressource(s) active(s) dans cette catégorie.</p>
              </div>

              <div className="stack-list">
                {group.items.map((item) => (
                  <article className="list-row list-row-stretch" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {item.subcategory || "Sans sous-catégorie"} · {item.meta}
                      </p>
                      {item.summary ? <p>{item.summary}</p> : null}
                    </div>

                    <div className="table-actions">
                      <Badge tone={contentTone(item.badge)}>{item.badge}</Badge>
                      {item.secondaryBadge ? <Badge tone="accent">{item.secondaryBadge}</Badge> : null}
                      {item.href ? (
                        <Link
                          className="button button-secondary button-small"
                          href={item.href}
                          target={item.type === "content" ? "_blank" : undefined}
                        >
                          {item.hrefLabel}
                        </Link>
                      ) : null}
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
            <strong>Aucune ressource publiée pour l&apos;instant.</strong>
            <p>
              Publie un contenu ou un quiz depuis les studios admin pour le voir apparaître ici.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
