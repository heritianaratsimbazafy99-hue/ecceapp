"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { updateContentAction, type AdminActionState } from "@/app/(platform)/admin/actions";
import type { ContentTaxonomyPreset } from "@/components/content/content-studio-composer";
import { Badge } from "@/components/ui/badge";
import { uploadContentPdfDirectly, validateContentPdfFile } from "@/lib/content-pdf-upload";

type ModuleOption = {
  id: string;
  label: string;
};

type EditableContent = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  subcategory: string | null;
  tagsInput: string;
  content_type: string;
  status: string;
  module_id?: string | null;
  estimated_minutes: number | null;
  external_url: string | null;
  storage_path: string | null;
  youtube_url: string | null;
  is_required: boolean;
  publishedHref: string;
  taxonomyIssues: string[];
  taxonomyScore: number;
};

const initialState: AdminActionState = {};

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

export function ContentEditForm({
  content,
  moduleOptions,
  taxonomyPresets
}: {
  content: EditableContent;
  moduleOptions: ModuleOption[];
  taxonomyPresets: ContentTaxonomyPreset[];
}) {
  const [state, formAction, pending] = useActionState(updateContentAction, initialState);
  const initialPreset = useMemo(
    () => taxonomyPresets.find((preset) => preset.theme === content.category) ?? taxonomyPresets[0] ?? null,
    [content.category, taxonomyPresets]
  );
  const [title, setTitle] = useState(content.title);
  const [summary, setSummary] = useState(content.summary ?? "");
  const [category, setCategory] = useState(content.category ?? "");
  const [subcategory, setSubcategory] = useState(content.subcategory ?? "");
  const [moduleId, setModuleId] = useState(content.module_id ?? "");
  const [contentType, setContentType] = useState(content.content_type);
  const [status, setStatus] = useState(content.status);
  const [tags, setTags] = useState(content.tagsInput);
  const [externalUrl, setExternalUrl] = useState(content.external_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(content.youtube_url ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(content.estimated_minutes ?? ""));
  const [isRequired, setIsRequired] = useState(content.is_required);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfUploadError, setPdfUploadError] = useState("");
  const [pdfUploadState, setPdfUploadState] = useState<"idle" | "uploading" | "uploaded">("idle");
  const [uploadedPdfPath, setUploadedPdfPath] = useState("");
  const [removePdf, setRemovePdf] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState(initialPreset?.id ?? "");
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const tagList = tags
    .split(",")
    .map(normalizeTag)
    .filter(Boolean);
  const selectedTheme =
    taxonomyPresets.find((preset) => preset.id === selectedThemeId) ??
    taxonomyPresets.find((preset) => preset.theme === category) ??
    taxonomyPresets[0] ??
    null;
  const selectedSubtheme =
    selectedTheme?.subthemes.find((item) => item.label === subcategory) ??
    selectedTheme?.subthemes[0] ??
    null;
  const taxonomyIssues = [
    summary.trim() ? null : "Résumé manquant",
    category.trim() ? null : "Thème manquant",
    subcategory.trim() ? null : "Sous-thème manquant",
    tagList.length >= 3 ? null : "Moins de 3 sujets abordés"
  ].filter(Boolean) as string[];
  const taxonomyScore = 4 - taxonomyIssues.length;
  const isUploadingPdf = pdfUploadState === "uploading";
  const isBusy = pending || isUploadingPdf;
  const hasBlockingPdfError = Boolean(pdfUploadError && pdfFileName && !pdfFile);

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
    <form action={formAction} className="content-edit-shell admin-form" onSubmit={handleSubmit}>
      <input name="content_id" type="hidden" value={content.id} />
      <input name="uploaded_storage_path" type="hidden" value={uploadedPdfPath} />
      <input name="remove_pdf" type="hidden" value={removePdf ? "true" : ""} />

      <section className="panel panel-highlight content-edit-hero">
        <div className="content-edit-copy">
          <span className="eyebrow">Edition contenu</span>
          <h3>{title || content.title}</h3>
          <p>
            Corrige le positionnement, les sujets abordés, le statut et le rattachement parcours sans recréer la
            ressource.
          </p>

          <div className="tag-row">
            <Badge tone={taxonomyScore >= 3 ? "success" : "warning"}>taxonomie {taxonomyScore}/4</Badge>
            <Badge tone={status === "published" ? "success" : status === "draft" ? "warning" : "accent"}>{status}</Badge>
            <Badge tone="neutral">{content.slug}</Badge>
          </div>
        </div>

        <div className="content-edit-actions">
          <Link className="button button-secondary" href="/admin/content">
            Retour studio
          </Link>
          {status === "published" ? (
            <Link className="button button-secondary" href={content.publishedHref}>
              Voir la ressource
            </Link>
          ) : null}
          <button className="button" disabled={isBusy || !title.trim() || hasBlockingPdfError} type="submit">
            {isUploadingPdf ? "Upload PDF..." : pending ? "Mise à jour..." : "Enregistrer"}
          </button>
        </div>
      </section>

      <section className="content-edit-layout">
        <div className="content-edit-main">
          <section className="panel">
            <div className="panel-header">
              <h3>Promesse et diffusion</h3>
              <p>Stabilise ce que la ressource apporte, puis son état réel dans la bibliothèque.</p>
            </div>

            <div className="content-studio-grid">
              <label className="form-grid-span">
                Titre
                <input name="title" onChange={(event) => setTitle(event.target.value)} required type="text" value={title} />
              </label>

              <label className="form-grid-span">
                Résumé
                <textarea name="summary" onChange={(event) => setSummary(event.target.value)} rows={4} value={summary} />
              </label>

              <label>
                Type
                <select name="content_type" onChange={(event) => setContentType(event.target.value)} value={contentType}>
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
                <select name="status" onChange={(event) => setStatus(event.target.value)} value={status}>
                  <option value="draft">draft</option>
                  <option value="scheduled">scheduled</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>

              <label>
                Durée estimée
                <input
                  min="0"
                  name="estimated_minutes"
                  onChange={(event) => setEstimatedMinutes(event.target.value)}
                  type="number"
                  value={estimatedMinutes}
                />
              </label>

              <label className="content-required-toggle">
                <input checked={isRequired} name="is_required" onChange={(event) => setIsRequired(event.target.checked)} type="checkbox" />
                <span>
                  Contenu obligatoire
                  <small>Rend cette ressource prioritaire dans les parcours et les arbitrages admin.</small>
                </span>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Taxonomie</h3>
              <p>Le coach doit pouvoir retrouver ce contenu par intention, thème et sujet abordé.</p>
            </div>

            {taxonomyPresets.length ? (
              <div className="content-taxonomy-presets">
                <div className="content-taxonomy-theme-grid">
                  {taxonomyPresets.map((preset) => (
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
                        key={subtheme.id ?? subtheme.label}
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
            ) : null}

            <div className="content-studio-grid">
              <label>
                Thème
                <input name="category" onChange={(event) => setCategory(event.target.value)} type="text" value={category} />
              </label>

              <label>
                Sous-thème
                <input name="subcategory" onChange={(event) => setSubcategory(event.target.value)} type="text" value={subcategory} />
              </label>

              <label className="form-grid-span">
                Sujets abordés
                <input name="tags" onChange={(event) => setTags(event.target.value)} type="text" value={tags} />
              </label>

              <label className="form-grid-span">
                Module de parcours
                <select name="module_id" onChange={(event) => setModuleId(event.target.value)} value={moduleId}>
                  <option value="">Hors parcours</option>
                  {moduleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Accès</h3>
              <p>Garde les liens propres pour éviter les contenus publiés impossibles à exploiter.</p>
            </div>

            <div className="content-studio-grid">
              <div className="content-pdf-uploader form-grid-span">
                <div>
                  <span className="eyebrow">Cours PDF</span>
                  <strong>
                    {removePdf
                      ? "PDF marqué pour suppression"
                      : content.storage_path
                        ? "PDF déjà rattaché"
                        : "Ajouter un PDF ECCE"}
                  </strong>
                  <p>
                    Remplace ou retire le support PDF lu par les coachés dans l&apos;application.
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
                      setRemovePdf(false);

                      if (file) {
                        setContentType("document");
                      }
                    }}
                    type="file"
                  />
                </label>
                <small>
                  {pdfFileName
                    ? pdfUploadError
                      ? pdfUploadError
                      : uploadedPdfPath
                        ? "Nouveau PDF téléversé, prêt à être enregistré."
                        : isUploadingPdf
                          ? "Téléversement direct vers Supabase..."
                          : `Nouveau PDF prêt : ${pdfFileName}`
                    : removePdf
                      ? "Le PDF actuel sera supprimé à l'enregistrement."
                      : content.storage_path
                      ? "Le PDF actuel sera conservé si aucun nouveau fichier n'est déposé."
                      : "Format accepté : PDF jusqu'à 100 Mo."}
                </small>
                {content.storage_path || pdfFileName || removePdf ? (
                  <div className="table-actions">
                    {pdfFileName ? (
                      <button className="button button-secondary button-small" disabled={isBusy} onClick={clearSelectedPdf} type="button">
                        Retirer la sélection
                      </button>
                    ) : null}
                    {content.storage_path && !removePdf ? (
                      <button
                        className="button button-secondary button-small"
                        disabled={isBusy}
                        onClick={() => {
                          clearSelectedPdf();
                          setRemovePdf(true);
                        }}
                        type="button"
                      >
                        Supprimer le PDF
                      </button>
                    ) : null}
                    {removePdf ? (
                      <button
                        className="button button-secondary button-small"
                        disabled={isBusy}
                        onClick={() => setRemovePdf(false)}
                        type="button"
                      >
                        Conserver le PDF
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <label className="form-grid-span">
                Lien externe
                <input name="external_url" onChange={(event) => setExternalUrl(event.target.value)} type="url" value={externalUrl} />
                <small>Optionnel si la ressource utilise le PDF ECCE intégré.</small>
              </label>

              <label className="form-grid-span">
                Lien YouTube
                <input name="youtube_url" onChange={(event) => setYoutubeUrl(event.target.value)} type="url" value={youtubeUrl} />
              </label>
            </div>
          </section>
        </div>

        <aside className="content-edit-side">
          <section className="panel panel-accent">
            <div className="panel-header">
              <h3>Corrections utiles</h3>
              <p>La dette éditoriale qui empêche les coachs de retrouver vite cette ressource.</p>
            </div>

            {taxonomyIssues.length ? (
              <div className="admin-content-issue-list">
                {taxonomyIssues.map((issue) => (
                  <span key={issue}>{issue}</span>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state-compact">
                <strong>Taxonomie prête.</strong>
                <p>Ce contenu est correctement repérable dans la bibliothèque.</p>
              </div>
            )}

            {state.error || pdfUploadError ? <p className="form-error">{state.error ?? pdfUploadError}</p> : null}
            {state.success ? <p className="form-success">{state.success}</p> : null}
          </section>
        </aside>
      </section>
    </form>
  );
}
