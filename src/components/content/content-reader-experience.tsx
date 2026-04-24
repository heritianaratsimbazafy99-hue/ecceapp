import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type ReaderContent = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  content_type: string;
  estimated_minutes: number | null;
  external_url: string | null;
  storage_path?: string | null;
  fileUrl?: string | null;
  youtube_url: string | null;
  is_required: boolean;
};

type LinkedQuiz = {
  id: string;
  title: string;
  description: string;
  kind: string;
  questionCount: number;
  timeLimitMinutes: number | null;
};

type RelatedResource = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  contentType: string;
  estimatedMinutes: number | null;
};

type ContentReaderExperienceProps = {
  content: ReaderContent;
  linkedQuizzes: LinkedQuiz[];
  relatedResources: RelatedResource[];
};

function getYoutubeEmbedUrl(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function getSourceHost(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function ContentReaderExperience({
  content,
  linkedQuizzes,
  relatedResources
}: ContentReaderExperienceProps) {
  const youtubeEmbedUrl = getYoutubeEmbedUrl(content.youtube_url);
  const pdfUrl =
    content.fileUrl ??
    (content.external_url?.toLowerCase().includes(".pdf") ? content.external_url : null);
  const sourceUrl = content.youtube_url || pdfUrl || content.external_url;
  const sourceHost = getSourceHost(sourceUrl);
  const isPdf = Boolean(pdfUrl);

  return (
    <section className="content-reader-shell">
      <div className="content-reader-hero">
        <div>
          <span className="eyebrow">Lecture ECCE</span>
          <h2>{content.title}</h2>
          <p>{content.summary || "Ressource publiée dans la bibliothèque ECCE."}</p>

          <div className="tag-row">
            <Badge tone="accent">{content.content_type}</Badge>
            {content.is_required ? <Badge tone="warning">obligatoire</Badge> : null}
            {content.category ? <Badge tone="neutral">{content.category}</Badge> : null}
            {content.subcategory ? <Badge tone="neutral">{content.subcategory}</Badge> : null}
          </div>
        </div>

        <div className="content-reader-hero-metrics">
          <article>
            <strong>{content.estimated_minutes ? `${content.estimated_minutes} min` : "Libre"}</strong>
            <small>temps conseillé</small>
          </article>
          <article>
            <strong>{linkedQuizzes.length}</strong>
            <small>quiz lié(s)</small>
          </article>
          <article>
            <strong>{relatedResources.length}</strong>
            <small>ressource(s) voisines</small>
          </article>
        </div>
      </div>

      <div className="content-reader-layout">
        <div className="content-reader-main">
          <div className="panel content-reader-stage">
            <div className="panel-header">
              <h3>Mode lecture</h3>
              <p>
                ECCE t&apos;amène dans une vue plus claire avant l&apos;ouverture de la source pour garder le contexte
                pédagogique et les ressources liées à portée de main.
              </p>
            </div>

            {youtubeEmbedUrl ? (
              <div className="content-reader-video-frame">
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  src={youtubeEmbedUrl}
                  title={content.title}
                />
              </div>
            ) : isPdf && pdfUrl ? (
              <div className="content-reader-pdf-stack">
                <div className="content-reader-video-frame content-reader-pdf-frame">
                  <iframe src={pdfUrl} title={content.title} />
                </div>
                <div className="table-actions">
                  <Link className="button button-secondary" href={pdfUrl} target="_blank">
                    Ouvrir le PDF en plein écran
                  </Link>
                  {linkedQuizzes[0] ? (
                    <Link className="button" href={`/quiz/${linkedQuizzes[0].id}`}>
                      Passer au quiz
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : sourceUrl ? (
              <div className="content-reader-source-card">
                <span className="eyebrow">Source externe</span>
                <strong>{sourceHost || "Ressource liée"}</strong>
                <p>
                  Certaines sources externes bloquent l&apos;intégration embarquée. ECCE garde donc un contexte
                  de lecture propre ici, puis ouvre la source dans un nouvel onglet quand tu es prêt.
                </p>
                <div className="table-actions">
                  <Link className="button" href={sourceUrl} target="_blank">
                    Ouvrir la source
                  </Link>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <strong>Aucune source n&apos;est encore rattachée.</strong>
                <p>Le studio contenus peut encore enrichir cette ressource avec un PDF, une URL ou une vidéo.</p>
              </div>
            )}
          </div>

          <div className="content-reader-support-grid">
            <div className="panel panel-highlight">
              <div className="panel-header">
                <h3>Avant de commencer</h3>
                <p>Un rappel rapide pour garder une lecture active et utile.</p>
              </div>

              <div className="content-reader-checklist">
                <article>
                  <strong>Objectif</strong>
                  <p>{content.summary || "Repère les idées clés et prépare la prochaine action concrète."}</p>
                </article>
                <article>
                  <strong>Repère conseillé</strong>
                  <p>
                    {content.estimated_minutes
                      ? `Prévois environ ${content.estimated_minutes} minutes de focus.`
                      : "Prends le temps utile pour assimiler les points clés."}
                  </p>
                </article>
                <article>
                  <strong>Suite naturelle</strong>
                  <p>
                    {linkedQuizzes.length
                      ? "Un quiz lié est déjà prêt juste à côté pour transformer la lecture en validation."
                      : "Tu peux revenir ensuite dans tes missions ou explorer une ressource voisine."}
                  </p>
                </article>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>Tags et repères</h3>
                <p>Les mots-clés t&apos;aident à retrouver rapidement des ressources proches dans la bibliothèque.</p>
              </div>

              {content.tags?.length ? (
                <div className="collection-tags">
                  {content.tags.map((tag) => (
                    <span className="collection-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="empty-state empty-state-compact">
                  <strong>Aucun tag défini.</strong>
                  <p>Le studio contenus peut encore enrichir ce contenu avec une taxonomie plus fine.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="content-reader-sidebar">
          <div className="panel">
            <div className="panel-header">
              <h3>Quiz liés</h3>
              <p>Transforme la ressource en validation ou en entraînement immédiat.</p>
            </div>

            {linkedQuizzes.length ? (
              <div className="content-reader-side-list">
                {linkedQuizzes.map((quiz) => (
                  <article className="content-reader-side-item" key={quiz.id}>
                    <div className="tag-row">
                      <Badge tone="accent">{quiz.kind}</Badge>
                      <Badge tone="neutral">{quiz.questionCount} question(s)</Badge>
                    </div>
                    <strong>{quiz.title}</strong>
                    <p>{quiz.description}</p>
                    <small>
                      {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "temps libre"}
                    </small>
                    <div className="assignment-card-footer">
                      <Link className="button button-secondary button-small" href={`/quiz/${quiz.id}`}>
                        Ouvrir le quiz
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Aucun quiz lié.</strong>
                <p>Quand un quiz sera rattaché à ce contenu, il remontera ici automatiquement.</p>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Continuer l&apos;exploration</h3>
              <p>Des ressources proches pour garder un parcours cohérent dans la même collection.</p>
            </div>

            {relatedResources.length ? (
              <div className="content-reader-side-list">
                {relatedResources.map((resource) => (
                  <article className="content-reader-side-item" key={resource.id}>
                    <div className="tag-row">
                      <Badge tone="success">{resource.contentType}</Badge>
                    </div>
                    <strong>{resource.title}</strong>
                    <p>{resource.summary}</p>
                    <small>
                      {resource.estimatedMinutes ? `${resource.estimatedMinutes} min` : "durée libre"}
                    </small>
                    <div className="assignment-card-footer">
                      <Link className="button button-secondary button-small" href={`/library/${resource.slug}`}>
                        Voir la ressource
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Pas d&apos;autre ressource proche pour le moment.</strong>
                <p>La bibliothèque s&apos;enrichira automatiquement à mesure que de nouveaux contenus seront publiés.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
