"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { createContentAction, type AdminActionState } from "@/app/(platform)/admin/actions";
import { CelebrationBurst } from "@/components/feedback/celebration-burst";
import { Badge } from "@/components/ui/badge";
import { uploadContentPdfDirectly, validateContentPdfFile } from "@/lib/content-pdf-upload";

type ModuleOption = {
  id: string;
  label: string;
};

export type ContentTaxonomyPreset = {
  id: string;
  theme: string;
  description: string;
  position?: number;
  subthemes: Array<{
    id?: string;
    label: string;
    topics: string[];
    position?: number;
  }>;
};

const initialState: AdminActionState = {};

const CONTENT_TAXONOMY_PRESETS = [
  {
    id: "fondamentaux",
    theme: "Fondamentaux",
    description: "Cadre, vocabulaire et posture de base pour sécuriser les premières séances.",
    subthemes: [
      {
        label: "Cadre de séance",
        topics: ["contrat", "objectif", "alliance", "cadre", "séance"]
      },
      {
        label: "Posture coach",
        topics: ["écoute", "questionnement", "neutralité", "présence", "éthique"]
      }
    ]
  },
  {
    id: "pratique",
    theme: "Pratique coach",
    description: "Ressources directement activables avant, pendant ou après une séance.",
    subthemes: [
      {
        label: "Diagnostic",
        topics: ["besoin", "blocage", "objectif", "priorisation", "diagnostic"]
      },
      {
        label: "Outils et scripts",
        topics: ["template", "script", "exercice", "trame", "support"]
      }
    ]
  },
  {
    id: "business",
    theme: "Business coaching",
    description: "Contenus pour structurer l'offre, la prospection et la conversion.",
    subthemes: [
      {
        label: "Offre et positionnement",
        topics: ["niche", "promesse", "offre", "positionnement", "prix"]
      },
      {
        label: "Acquisition client",
        topics: ["prospection", "contenu", "vente", "conversion", "rendez-vous"]
      }
    ]
  },
  {
    id: "progression",
    theme: "Progression apprenant",
    description: "Repères pour suivre les coachés, repérer les risques et consolider les acquis.",
    subthemes: [
      {
        label: "Engagement",
        topics: ["assiduité", "motivation", "deadline", "relance", "engagement"]
      },
      {
        label: "Évaluation",
        topics: ["quiz", "feedback", "preuve", "compétence", "maîtrise"]
      }
    ]
  }
] satisfies ContentTaxonomyPreset[];

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, " ");
}

function mergeTags(currentTags: string, nextTags: readonly string[]) {
  return Array.from(
    new Set([
      ...currentTags
        .split(",")
        .map(normalizeTag)
        .filter(Boolean),
      ...nextTags.map(normalizeTag).filter(Boolean)
    ])
  ).join(", ");
}

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
  moduleOptions,
  taxonomyPresets = CONTENT_TAXONOMY_PRESETS
}: {
  moduleOptions: ModuleOption[];
  taxonomyPresets?: ContentTaxonomyPreset[];
}) {
  const [state, formAction, pending] = useActionState(createContentAction, initialState);
  const availableTaxonomyPresets = taxonomyPresets.length ? taxonomyPresets : CONTENT_TAXONOMY_PRESETS;
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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfUploadError, setPdfUploadError] = useState("");
  const [pdfUploadState, setPdfUploadState] = useState<"idle" | "uploading" | "uploaded">("idle");
  const [uploadedPdfPath, setUploadedPdfPath] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState<string>(availableTaxonomyPresets[0]?.id ?? "fallback");
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const tagList = tags
    .split(",")
    .map(normalizeTag)
    .filter(Boolean);
  const selectedTheme =
    availableTaxonomyPresets.find((preset) => preset.id === selectedThemeId) ??
    availableTaxonomyPresets[0];
  const selectedSubtheme =
    selectedTheme?.subthemes.find((item) => item.label === subcategory) ??
    selectedTheme?.subthemes[0];
  const hasPdfFile = Boolean(pdfFileName);
  const hasPrimaryLink = Boolean((contentType === "youtube" ? youtubeUrl : externalUrl).trim());
  const isUploadingPdf = pdfUploadState === "uploading";
  const isBusy = pending || isUploadingPdf;
  const hasBlockingPdfError = Boolean(pdfUploadError && pdfFileName && !pdfFile);
  const readinessScore = [
    Boolean(title.trim()),
    Boolean(summary.trim()),
    Boolean(category.trim()),
    Boolean(subcategory.trim()),
    tagList.length >= 3,
    hasPrimaryLink || hasPdfFile || contentType === "template"
  ].filter(Boolean).length;
  const taxonomyReady = Boolean(category.trim() && subcategory.trim() && tagList.length >= 3);

  useEffect(() => {
    if ((state.error || state.success) && uploadedPdfPath) {
      setUploadedPdfPath("");
      setPdfFile(null);
      setPdfFileName("");
      setPdfUploadState("idle");
      if (pdfInputRef.current) {
        pdfInputRef.current.value = "";
      }
    }
  }, [state.error, state.success, uploadedPdfPath]);

  function applyTheme(preset: ContentTaxonomyPreset) {
    const firstSubtheme = preset.subthemes[0];

    setSelectedThemeId(preset.id);
    setCategory(preset.theme);
    setSubcategory(firstSubtheme?.label ?? "");
    setTags((currentTags) => mergeTags(currentTags, firstSubtheme?.topics ?? []));
  }

  function applySubtheme(subtheme: ContentTaxonomyPreset["subthemes"][number]) {
    setSubcategory(subtheme.label);
    setTags((currentTags) => mergeTags(currentTags, subtheme.topics));
  }

  function clearSelectedPdf() {
    setPdfFile(null);
    setPdfFileName("");
    setPdfUploadError("");
    setPdfUploadState("idle");
    setUploadedPdfPath("");

    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (hasBlockingPdfError) {
      event.preventDefault();
      return;
    }

    if (!pdfFile || uploadedPdfPath) {
      return;
    }

    event.preventDefault();
    setPdfUploadError("");
    setPdfUploadState("uploading");

    const uploadResult = await uploadContentPdfDirectly({ file: pdfFile, title });

    if (uploadResult.error || !uploadResult.storagePath) {
      setPdfUploadError(uploadResult.error ?? "Le PDF n'a pas pu être téléversé.");
      setPdfUploadState("idle");
      return;
    }

    setUploadedPdfPath(uploadResult.storagePath);
    setPdfUploadState("uploaded");

    const nextFormData = new FormData(event.currentTarget);
    nextFormData.set("uploaded_storage_path", uploadResult.storagePath);
    startTransition(() => formAction(nextFormData));
  }

  return (
    <form action={formAction} className="content-studio-shell admin-form" onSubmit={handleSubmit}>
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
      <input name="uploaded_storage_path" type="hidden" value={uploadedPdfPath} />

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
              <strong>{readinessScore}/6</strong>
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
                  <p>Classe chaque ressource par thème, sous-thème et sujets abordés pour une bibliothèque vraiment pilotable.</p>
                </div>

                <div className="content-taxonomy-presets">
                  <div className="content-taxonomy-theme-grid">
                    {availableTaxonomyPresets.map((preset) => (
                      <button
                        className={`content-taxonomy-theme-button${selectedThemeId === preset.id ? " is-active" : ""}`}
                        key={preset.id}
                        onClick={() => applyTheme(preset)}
                        type="button"
                      >
                        <strong>{preset.theme}</strong>
                        <span>{preset.description}</span>
                      </button>
                    ))}
                  </div>

                  {selectedTheme?.subthemes.length ? (
                    <div className="content-taxonomy-subtheme-grid">
                      {selectedTheme.subthemes.map((subtheme) => (
                        <button
                          className={`content-taxonomy-subtheme-button${subcategory === subtheme.label ? " is-active" : ""}`}
                          key={subtheme.label}
                          onClick={() => applySubtheme(subtheme)}
                          type="button"
                        >
                          <strong>{subtheme.label}</strong>
                          <span>{subtheme.topics.slice(0, 3).join(" · ")}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="content-topic-strip">
                    <span>Suggestions</span>
                    {(selectedSubtheme?.topics ?? []).map((topic) => (
                      <button
                        className="content-topic-chip"
                        key={topic}
                        onClick={() => setTags((currentTags) => mergeTags(currentTags, [topic]))}
                        type="button"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
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
                    Contenus abordés
                    <input
                      onChange={(event) => setTags(event.target.value)}
                      placeholder="contrat, objectif, alliance, cadre"
                      type="text"
                      value={tags}
                    />
                    <small>Ces sujets deviennent les tags utilisés par les coachs pour retrouver les ressources.</small>
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
            <div className="content-pdf-uploader form-grid-span">
              <div>
                <span className="eyebrow">Cours PDF</span>
                <strong>Déposer le support principal</strong>
                <p>
                  Le PDF sera stocké dans Supabase et ouvert directement dans le lecteur ECCE avant le quiz lié.
                </p>
              </div>
              <label>
                Fichier PDF
                <input
                  accept="application/pdf,.pdf"
                  ref={pdfInputRef}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    const validationError = validateContentPdfFile(file);

                    setPdfFileName(file?.name ?? "");
                    setPdfFile(validationError ? null : file);
                    setPdfUploadError(validationError ?? "");
                    setPdfUploadState("idle");
                    setUploadedPdfPath("");

                    if (file) {
                      setContentType("document");
                    }
                  }}
                  type="file"
                />
              </label>
              <small>
                {pdfUploadError
                  ? pdfUploadError
                  : uploadedPdfPath
                    ? "PDF téléversé, prêt à être enregistré."
                    : isUploadingPdf
                      ? "Téléversement direct vers Supabase..."
                      : pdfFileName
                        ? `PDF prêt : ${pdfFileName}`
                        : "Format accepté : PDF jusqu'à 100 Mo."}
              </small>
              {pdfFileName ? (
                <div className="table-actions">
                  <button className="button button-secondary button-small" disabled={isBusy} onClick={clearSelectedPdf} type="button">
                    Retirer la sélection
                  </button>
                </div>
              ) : null}
            </div>
            <label className="form-grid-span">
              Lien externe
              <input onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://..." type="url" value={externalUrl} />
              <small>Optionnel si tu téléverses un PDF ECCE.</small>
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
              <strong>{readinessScore}/6</strong>
              <span>critères remplis</span>
            </div>
            <div>
              <strong>{tagList.length}</strong>
              <span>tag(s)</span>
            </div>
            <div>
              <strong>{taxonomyReady ? "Oui" : "À cadrer"}</strong>
              <span>taxonomie exploitable</span>
            </div>
          </div>

          {state.error || pdfUploadError ? <p className="form-error">{state.error ?? pdfUploadError}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}

          <button className="button" disabled={isBusy || !title.trim() || hasBlockingPdfError} type="submit">
            {isUploadingPdf ? "Upload PDF..." : pending ? "Création..." : "Créer le contenu"}
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
              {hasPdfFile ? <Badge tone="success">PDF ECCE</Badge> : null}
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
              <small>
                {hasPdfFile
                  ? "PDF prêt pour lecture intégrée"
                  : hasPrimaryLink
                    ? "Lien prêt"
                    : "Ajoute un PDF ou un lien pour finaliser l'expérience"}
              </small>
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
              <p>Un thème, un sous-thème et trois sujets abordés rendent le contenu retrouvable instantanément.</p>
            </article>
          </div>
        </section>
      </aside>
    </form>
  );
}
