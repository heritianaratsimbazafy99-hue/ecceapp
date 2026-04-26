import { LibraryExplorer } from "@/components/content/library-explorer";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { getLibraryPageData } from "@/lib/platform-data";

export default async function LibraryPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    filter?: string;
  }>;
}) {
  const params = await searchParams;
  const { resources, groups, recentResources, taxonomy, themeMap, filters, totalResourceCount } = await getLibraryPageData({
    query: params.query,
    filter: params.filter
  });

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Bibliothèque ECCE"
        description="Une bibliothèque plus éditoriale, plus filtrable et plus agréable à parcourir pour retrouver contenus et quiz publiés."
      />

      {resources.length || filters.query || filters.filter ? (
        <LibraryExplorer
          groups={groups}
          initialFilter={filters.filter}
          initialSearch={filters.query}
          recentResources={recentResources}
          taxonomy={taxonomy}
          themeMap={themeMap}
          totalResourceCount={totalResourceCount}
        />
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
