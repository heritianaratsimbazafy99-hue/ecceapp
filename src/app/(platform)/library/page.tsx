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
    default:
      return "neutral";
  }
}

export default async function LibraryPage() {
  const { contents, groups, taxonomy } = await getLibraryPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Bibliothèque ECCE"
        description="La bibliothèque lit maintenant les vrais contenus publiés depuis Supabase et les regroupe par catégories."
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

      {contents.length ? (
        <section className="admin-grid">
          {groups.map((group) => (
            <div className="panel" key={group.category}>
              <div className="panel-header">
                <h3>{group.category}</h3>
                <p>{group.items.length} ressource(s) publiée(s) dans cette catégorie.</p>
              </div>

              <div className="stack-list">
                {group.items.map((item) => (
                  <article className="list-row list-row-stretch" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {item.subcategory || "Sans sous-catégorie"} ·{" "}
                        {item.estimated_minutes ? `${item.estimated_minutes} min` : "durée libre"}
                      </p>
                      {item.summary ? <p>{item.summary}</p> : null}
                    </div>

                    <div className="table-actions">
                      <Badge tone={contentTone(item.content_type)}>{item.content_type}</Badge>
                      {item.is_required ? <Badge tone="accent">obligatoire</Badge> : null}
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
            <strong>Aucun contenu publié pour l&apos;instant.</strong>
            <p>
              Crée un contenu depuis le back-office admin puis mets son statut sur
              `published` pour le voir apparaître ici.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
