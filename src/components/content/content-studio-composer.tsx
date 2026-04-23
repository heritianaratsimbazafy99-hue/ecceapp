"use client";

import { useActionState, useState } from "react";

import { createContentAction, type AdminActionState } from "@/app/(platform)/admin/actions";
import { CelebrationBurst } from "@/components/feedback/celebration-burst";
import { Badge } from "@/components/ui/badge";

type ModuleOption = {
  id: string;
  label: string;
};

const initialState: AdminActionState = {};

function ctaLabel(contentType: string) {
  switch (contentType) {
    case "youtube":
      return "Voir sur YouTube";
    case "video":
      return "Lancer la vidéo";
    case "audio":
      return "Écouter";
    case "template":
      return "Ouvrir le template";
    case "document":
      return "Ouvrir le document";
    default:
      return "Ouvrir la ressource";
  }
}

export function ContentStudioComposer({
  moduleOptions
}: {
  moduleOptions: ModuleOption[];
}) {
  const [state, formAction, pending] = useActionState(createContentAction, initialState);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("Fondamentaux");
  const [subcategory, setSubcategory] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [contentType, setContentType] = useState("document");
  const [status, setStatus] = useState("published");
  const [tags, setTags] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("30");
  const [isRequired, setIsRequired] = useState(false);

  const tagList = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const hasPrimaryLink = Boolean((contentType === "youtube" ? youtubeUrl : externalUrl).trim());
  const readinessScore = [
    Boolean(title.trim()),
    Boolean(summary.trim()),
    Boolean(category.trim()),
    Boolean(subcategory.trim()),
    hasPrimaryLink || contentType === "document" || contentType === "template"
  ].filter(Boolean).length;

  return (
    <form action={formAction} className="content-studio-shell admin-form">
      <CelebrationBurst
        active={Boolean(state.success)}
        body="Le contenu rejoint maintenant le studio ECCE avec un aperçu plus éditorial et plus premium."
        title="Contenu publié"
        triggerKey={state.success}
      />

      <input name="title" type="hidden" value={title} />
      <input name="summary" type="hidden" value={summary} />
      <input name="category" type="hidden" value={category} />
      <input name="subcategory" type="hidden" value={subcategory} />
      <input name="module_id" type="hidden" value={moduleId} />
      <input name="content_type" type="hidden" value={contentType} />
      <input name="status" type="hidden" value={status} />
      <input name="tags" type="hidden" value={tags} />
      <input name="external_url" type="hidden" value={externalUrl} />
      <input name="youtube_url" type="hidden" value={youtubeUrl} />
      <input name="estimated_minutes" type="hidden" value={estimatedMinutes} />
      <input name="is_required" type="hidden" value={isRequired ? "on" : ""} />

      <div className="content-studio-main">
        <section className="panel panel-highlight content-studio-hero">
          <div className="content-studio-hero-copy">
            <span className="eyebrow">Content Studio</span>
            <h3>Créer un contenu comme une ressource éditoriale prête à être consommée</h3>
            <p>
              Structure la promesse pédagogique, prépare le bon format et visualise
              immédiatement le rendu dans la bibliothèque ECCE.
            </p>
          </div>

          <div className="content-studio-hero-metrics">
            <article>
              <strong>{contentType}</strong>
              <span>format choisi</span>
            </article>
            <article>
              <strong>{estimatedMinutes || "—"}</strong>
              <span>minutes estimées</span>
            </article>
            <article>
              <strong>{readinessScore}/5</strong>
              <span>niveau de préparation</span>
            </article>
          </div>
        </section>

        <section className="panel content-briefing-panel">
          <div className="panel-header">
            <h3>Promesse pédagogique</h3>
            <p>Le contenu doit annoncer clairement ce qu&apos;il apporte avant même d&apos;être ouvert.</p>
          </div>

          <div className="content-briefing-layout">
            <article className="content-briefing-card content-briefing-card-primary">
              <div className="content-briefing-card-head">
                <span className="eyebrow">Message</span>
                <strong>Positionner la ressource</strong>
                <p>Travaille le titre et le résumé comme une promesse concrète pour le coaché.</p>
              </div>

              <div className="content-studio-grid">
                <label className="form-grid-span">
                  Titre
                  <input
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Module 1 - Introduction au coaching"
                    required
                    type="text"
                    value={title}
                  />
                </label>
                <label className="form-grid-span">
                  Résumé
                  <textarea
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="Décris en quelques lignes la valeur pédagogique du contenu."
                    rows={4}
                    value={summary}
                  />
                </label>
              </div>
            </article>

            <div className="content-briefing-stack">
              <article className="content-briefing-card">
                <div className="content-briefing-card-head">
                  <span className="eyebrow">Taxonomie</span>
                  <strong>Organisation éditoriale</strong>
                </div>

                <div className="content-studio-grid">
                  <label>
                    Catégorie
                    <input onChange={(event) => setCategory(event.target.value)} placeholder="Fondamentaux" type="text" value={category} />
                  </label>
                  <label>
                    Sous-catégorie
                    <input onChange={(event) => setSubcategory(event.target.value)} placeholder="Cadre de séance" type="text" value={subcategory} />
                  </label>
                  <label className="form-grid-span">
                    Tags
                    <input
                      onChange={(event) => setTags(event.target.value)}
                      placeholder="coaching, posture, business"
                      type="text"
                      value={tags}
                    />
                  </label>
                  <label className="form-grid-span">
                    Module de parcours
                    <select onChange={(event) => setModuleId(event.target.value)} value={moduleId}>
                      <option value="">Aucun module rattaché</option>
                      {moduleOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </article>

              <article className="content-briefing-card content-briefing-card-soft">
                <div className="content-briefing-card-head">
                  <span className="eyebrow">Diffusion</span>
                  <strong>Statut et priorité</strong>
                </div>

                <div className="content-studio-grid">
                  <label>
                    Type
                    <select onChange={(event) => setContentType(event.target.value)} value={contentType}>
                      <option value="document">document</option>
                      <option value="video">video</option>
                      <option value="youtube">youtube</option>
                      <option value="audio">audio</option>
                      <option value="link">link</option>
                      <option value="replay">replay</option>
                      <option value="template">template</option>
                    </select>
                  </label>
                  <label>
                    Statut
                    <select onChange={(event) => setStatus(event.target.value)} value={status}>
                      <option value="draft">draft</option>
                      <option value="scheduled">scheduled</option>
                      <option value="published">published</option>
                      <option value="archived">archived</option>
                    </select>
                  </label>
                  <label>
                    Durée estimée (minutes)
                    <input min="0" onChange={(event) => setEstimatedMinutes(event.target.value)} type="number" value={estimatedMinutes} />
                  </label>
                  <label className="content-required-toggle">
                    <input checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} type="checkbox" />
                    <span>
                      Contenu obligatoire
                      <small>Met en avant la ressource dans les parcours prioritaires.</small>
                    </span>
                  </label>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Livraison et accès</h3>
            <p>Prépare le lien ou le point d&apos;entrée que l&apos;apprenant utilisera réellement.</p>
          </div>

          <div className="content-studio-grid">
            <label className="form-grid-span">
              Lien externe
              <input onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://..." type="url" value={externalUrl} />
            </label>
            <label className="form-grid-span">
              Lien YouTube
              <input onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtube.com/..." type="url" value={youtubeUrl} />
            </label>
          </div>
        </section>

        <section className="panel panel-subtle">
          <div className="panel-header">
            <h3>Prêt à publier</h3>
            <p>Le studio te donne un aperçu de maturité avant publication dans la bibliothèque.</p>
          </div>

          <div className="content-readiness-grid">
            <div>
              <strong>{readinessScore}/5</strong>
              <span>critères remplis</span>
            </div>
            <div>
              <strong>{tagList.length}</strong>
              <span>tag(s)</span>
            </div>
            <div>
              <strong>{isRequired ? "Oui" : "Non"}</strong>
              <span>priorité parcours</span>
            </div>
          </div>

          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}

          <button className="button" disabled={pending || !title.trim()} type="submit">
            {pending ? "Création..." : "Créer le contenu"}
          </button>
        </section>
      </div>

      <aside className="content-studio-preview">
        <section className="panel panel-accent">
          <div className="panel-header">
            <h3>Aperçu bibliothèque</h3>
            <p>Tu vois directement comment la ressource apparaîtra côté plateforme.</p>
          </div>

          <article className="content-preview-card">
            <div className="tag-row">
              <Badge tone={status === "published" ? "success" : "neutral"}>{status}</Badge>
              <Badge tone="accent">{contentType}</Badge>
              {isRequired ? <Badge tone="warning">obligatoire</Badge> : null}
            </div>

            <div className="content-preview-copy">
              <strong>{title.trim() || "Titre du contenu"}</strong>
              <p>{summary.trim() || "Le résumé apparaîtra ici pour donner envie d’ouvrir la ressource."}</p>
            </div>

            <div className="content-preview-meta">
              <span>{category.trim() || "Catégorie"}</span>
              <span>{subcategory.trim() || "Sous-catégorie"}</span>
              <span>{estimatedMinutes ? `${estimatedMinutes} min` : "durée libre"}</span>
            </div>

            {tagList.length ? (
              <div className="collection-tags">
                {tagList.map((tag) => (
                  <span className="collection-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="content-preview-cta">
              <button className="button button-secondary" type="button">
                {ctaLabel(contentType)}
              </button>
              <small>{hasPrimaryLink ? "Lien prêt" : "Ajoute un lien pour finaliser l’expérience"}</small>
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Checklist éditoriale</h3>
            <p>Quelques repères pour garder une bibliothèque nette et utile.</p>
          </div>

          <div className="content-quality-list">
            <article>
              <strong>Clarté</strong>
              <p>Le titre doit indiquer l’action ou le gain attendu.</p>
            </article>
            <article>
              <strong>Utilité</strong>
              <p>La ressource doit déboucher sur une décision, une pratique ou une progression observable.</p>
            </article>
            <article>
              <strong>Repérage</strong>
              <p>Une bonne catégorie et quelques tags rendent le contenu retrouvable instantanément.</p>
            </article>
          </div>
        </section>
      </aside>
    </form>
  );
}
