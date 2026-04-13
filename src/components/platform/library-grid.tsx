type LibraryCollection = {
  title: string;
  description: string;
  items: string[];
  tone: "sun" | "mint" | "ink";
};

type LibraryGridProps = {
  collections: LibraryCollection[];
};

export function LibraryGrid({ collections }: LibraryGridProps) {
  return (
    <div className="library-grid">
      {collections.map((collection) => (
        <article className={`collection-card collection-${collection.tone}`} key={collection.title}>
          <div className="collection-content">
            <span className="eyebrow">Collection</span>
            <h3>{collection.title}</h3>
            <p>{collection.description}</p>
          </div>

          <div className="collection-tags">
            {collection.items.map((item) => (
              <span className="collection-tag" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
