import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { LibraryGrid } from "@/components/platform/library-grid";
import { Badge } from "@/components/ui/badge";
import { libraryCollections } from "@/lib/mock-data";

const taxonomy = [
  "Fondamentaux",
  "Pratique supervisée",
  "Business",
  "Replays",
  "Documents",
  "YouTube"
];

export default function LibraryPage() {
  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Bibliothèque ECCE"
        description="Une organisation pensée pour classer les contenus par parcours, catégories, sous-catégories et usage pédagogique."
      />

      <section className="panel">
        <div className="panel-header">
          <h3>Organisation intelligente</h3>
          <p>
            Les coachs pourront combiner catégories, sous-catégories, tags, ordre
            et rattachement aux programmes.
          </p>
        </div>

        <div className="tag-row">
          {taxonomy.map((item) => (
            <Badge key={item} tone="neutral">
              {item}
            </Badge>
          ))}
        </div>
      </section>

      <section className="section-spacer">
        <LibraryGrid collections={libraryCollections} />
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Formats recommandés</h3>
            <p>Approche hybride pour maximiser efficacité et maîtrise des coûts.</p>
          </div>

          <div className="stack-list">
            <article className="list-row">
              <div>
                <strong>Vidéo YouTube</strong>
                <p>Embed ou lien direct pour les contenus publics et pédagogiques classiques.</p>
              </div>
              <Badge tone="success">économe</Badge>
            </article>
            <article className="list-row">
              <div>
                <strong>Upload Supabase Storage</strong>
                <p>À réserver aux vidéos privées, premium, confidentielles ou téléchargeables.</p>
              </div>
              <Badge tone="warning">premium</Badge>
            </article>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Liens pédagogiques</h3>
            <p>Chaque contenu pourra être relié à une action concrète.</p>
          </div>

          <div className="stack-list">
            <article className="list-row">
              <div>
                <strong>Ressource → Quiz</strong>
                <p>Tester la compréhension immédiatement après lecture ou visionnage.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Ressource → Exercice</strong>
                <p>Passer du théorique à la mise en pratique avec deadline.</p>
              </div>
            </article>
            <article className="list-row">
              <div>
                <strong>Ressource → Débrief coach</strong>
                <p>Créer un rendez-vous ou une consigne de feedback contextualisée.</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
