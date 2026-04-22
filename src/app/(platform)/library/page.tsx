import { LibraryExplorer } from "@/components/content/library-explorer";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { getLibraryPageData } from "@/lib/platform-data";

export default async function LibraryPage() {
  const { resources, groups, taxonomy } = await getLibraryPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Bibliothèque ECCE"
        description="Une bibliothèque plus éditoriale, plus filtrable et plus agréable à parcourir pour retrouver contenus et quiz publiés."
      />

      {resources.length ? (
        <LibraryExplorer groups={groups} taxonomy={taxonomy} />
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
