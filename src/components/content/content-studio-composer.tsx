"use client";

import Link from "next/link";
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

type ContentCreationMode = "pdf" | "link" | "youtube" | "template";

const CONTENT_CREATION_MODES: Array<{
  id: ContentCreationMode;
  title: string;
  description: string;
  contentType: string;
}> = [
  {
    id: "pdf",
    title: "Cours PDF",
    description: "Déposer un support et le publier dans le lecteur ECCE.",
    contentType: "document"
  },
  {
    id: "link",
    title: "Lien",
    description: "Partager une ressource externe sans upload.",
    contentType: "link"
  },
  {
    id: "youtube",
    title: "YouTube",
    description: "Créer une ressource vidéo depuis une URL YouTube.",
    contentType: "youtube"
  },
  {
    id: "template",
    title: "Template",
    description: "Publier une trame ou un exercice réutilisable.",
    contentType: "template"
  }
];

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
  const [creationMode, setCreationMode] = useState<ContentCreationMode>("pdf");
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
  const selectedMode = CONTENT_CREATION_MODES.find((mode) => mode.id === creationMode) ?? CONTENT_CREATION_MODES[0];
  const showPdfDelivery = contentType === "document";
  const showYoutubeDelivery = contentType === "youtube";
  const showExternalDelivery = ["link", "video", "audio", "replay"].includes(contentType);
  const isTemplateMode = contentType === "template";
  const hasReadableSource =
    contentType === "youtube"
      ? Boolean(youtubeUrl.trim())
      : hasPdfFile || Boolean(externalUrl.trim()) || Boolean(youtubeUrl.trim()) || contentType === "template";
  const isPublishedWithoutSource = status === "published" && !hasReadableSource;
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
  const sourceLabel = isTemplateMode
    ? "Template prêt"
    : showPdfDelivery
      ? hasPdfFile
        ? "PDF sélectionné"
        : "PDF attendu"
      : showYoutubeDelivery
        ? youtubeUrl.trim()
          ? "YouTube prêt"
          : "Lien YouTube attendu"
        : externalUrl.trim()
          ? "Lien prêt"
          : "Lien attendu";
  const contentWorkflowSteps = [
    {
      label: "Format",
      state: selectedMode.title
    },
    {
      label: "Source",
      state: hasReadableSource ? "OK" : "À compléter"
    },
    {
      label: "Message",
      state: title.trim() && summary.trim() ? "OK" : "À cadrer"
    },
    {
      label: "Publication",
      state: status === "published" ? "Visible" : status
    }
  ];

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

  function applyCreationMode(mode: ContentCreationMode) {
    const nextMode = CONTENT_CREATION_MODES.find((item) => item.id === mode);

    if (!nextMode) {
      return;
    }

    setCreationMode(mode);
    setContentType(nextMode.contentType);

    if (mode === "template" && !estimatedMinutes) {
      setEstimatedMinutes("20");
    }
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
        <section className="panel panel-highlight content-studio-hero studio-command-panel">
          <div className="content-studio-hero-copy">
            <span className="eyebrow">Content Studio</span>
            <h3>Créer une ressource publiable en quelques minutes</h3>
            <p>
              Un chemin court : format, source, promesse pédagogique, puis publication. Les réglages avancés restent disponibles sans envahir l’écran.
            </p>
          </div>

          <div className="studio-command-steps">
            {contentWorkflowSteps.map((step) => (
              <article key={step.label}>
                <span>{step.label}</span>
                <strong>{step.state}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="panel content-quick-flow-panel">
          <div className="panel-header-rich">
            <div>
              <span className="eyebrow">Chemin rapide</span>
              <h3>Quel type de ressource veux-tu créer ?</h3>
              <p>Le studio ajuste le type et laisse les options avancées repliées tant qu’elles ne sont pas nécessaires.</p>
            </div>
            <Badge tone="accent">{selectedMode.title}</Badge>
          </div>

          <div className="studio-mode-grid">
            {CONTENT_CREATION_MODES.map((mode) => (
              <button
                className={`studio-mode-card${creationMode === mode.id ? " is-active" : ""}`}
                key={mode.id}
                onClick={() => applyCreationMode(mode.id)}
                type="button"
              >
                <strong>{mode.title}</strong>
                <span>{mode.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel content-focus-panel">
          <div className="panel-header">
            <h3>Créer le contenu utile</h3>
            <p>Renseigne seulement ce qui permet au coaché de comprendre, ouvrir et utiliser la ressource.</p>
          </div>

          <div className="content-focus-grid">
            <article className="content-briefing-card content-briefing-card-primary">
              <div className="content-briefing-card-head">
                <span className="eyebrow">Message</span>
                <strong>Titre et promesse</strong>
                <p>Écris comme si le coaché devait décider en dix secondes si ce support l’aide maintenant.</p>
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

            <article className="content-source-card">
              <div className="content-briefing-card-head">
                <span className="eyebrow">Source</span>
                <strong>{sourceLabel}</strong>
                <p>{selectedMode.description}</p>
              </div>

              {showPdfDelivery ? (
                <div className="content-pdf-uploader">
                  <div>
                    <strong>Déposer le support principal</strong>
                    <p>Le PDF sera stocké dans Supabase et ouvert dans le lecteur ECCE.</p>
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
                          setCreationMode("pdf");
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
              ) : null}

              {showExternalDelivery ? (
                <label>
                  Lien de la ressource
                  <input onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://..." type="url" value={externalUrl} />
                  <small>Colle le lien que le coaché devra ouvrir.</small>
                </label>
              ) : null}

              {showYoutubeDelivery ? (
                <label>
                  Lien YouTube
                  <input onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtube.com/..." type="url" value={youtubeUrl} />
                  <small>La ressource restera visible dans ECCE avec un accès direct à la vidéo.</small>
                </label>
              ) : null}

              {isTemplateMode ? (
                <div className="content-template-note">
                  <strong>Aucune source externe obligatoire.</strong>
                  <p>Le template peut vivre comme une trame réutilisable dans la bibliothèque.</p>
                </div>
              ) : null}
            </article>
          </div>
        </section>

        <section className="panel content-advanced-panel">
          <div className="panel-header">
            <h3>Options avancées</h3>
            <p>Classement, rattachement au parcours et règles de diffusion restent accessibles quand tu en as besoin.</p>
          </div>

          <div className="content-briefing-stack content-advanced-grid">
              <details className="ux-disclosure content-taxonomy-disclosure">
                <summary>
                  <span>Taxonomie avancée</span>
                  <small>
                    {category}
                    {subcategory ? ` · ${subcategory}` : ""} · {tagList.length} tag(s)
                  </small>
                </summary>

                <div className="ux-disclosure-body">
                  <div className="content-briefing-card-head">
                    <span className="eyebrow">Taxonomie</span>
                    <strong>Organisation éditoriale</strong>
                    <p>Classe la ressource par thème, sous-thème et sujets quand tu veux améliorer la recherche.</p>
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
                </div>
              </details>

              <details className="ux-disclosure content-settings-disclosure">
                <summary>
                  <span>Réglages de diffusion</span>
                  <small>
                    {status} · {estimatedMinutes || "0"} min{isRequired ? " · obligatoire" : ""}
                  </small>
                </summary>

                <div className="ux-disclosure-body">
                  <div className="content-briefing-card-head">
                    <span className="eyebrow">Diffusion</span>
                    <strong>Statut et priorité</strong>
                  </div>

                  <div className="content-studio-grid">
                    <label>
                      Type
                      <select
                        onChange={(event) => {
                          setContentType(event.target.value);
                          const matchedMode = CONTENT_CREATION_MODES.find((mode) => mode.contentType === event.target.value);
                          if (matchedMode) {
                            setCreationMode(matchedMode.id);
                          }
                        }}
                        value={contentType}
                      >
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
                </div>
              </details>
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

          {isPublishedWithoutSource ? (
            <p className="form-error">Ajoute un PDF ou un lien avant de publier cette ressource.</p>
          ) : null}
          {state.error || pdfUploadError ? <p className="form-error">{state.error ?? pdfUploadError}</p> : null}
          {state.success ? (
            <div className="form-success content-success-actions">
              <span className="content-success-copy">
                <span>{state.success}</span>
                {state.contentStatus && state.contentStatus !== "published" ? (
                  <small>Ce contenu n&apos;est pas publié : il reste accessible dans le studio, pas dans la bibliothèque.</small>
                ) : null}
              </span>
              <div className="table-actions">
                {state.contentHref ? (
                  <Link className="button button-secondary button-small" href={state.contentHref}>
                    {state.contentCtaLabel ?? "Ouvrir le contenu"}
                  </Link>
                ) : null}
                <Link className="button button-ghost button-small" href="/library">
                  Ouvrir la bibliothèque
                </Link>
              </div>
            </div>
          ) : null}

          <button className="button" disabled={isBusy || !title.trim() || hasBlockingPdfError || isPublishedWithoutSource} type="submit">
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
