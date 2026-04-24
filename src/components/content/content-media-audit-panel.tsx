"use client";

import { useActionState } from "react";

import {
  cleanupOrphanContentPdfFilesAction,
  type AdminActionState
} from "@/app/(platform)/admin/actions";
import { Badge } from "@/components/ui/badge";

type BadgeTone = "neutral" | "accent" | "warning" | "success";

type ContentMediaAudit = {
  canRunCleanup: boolean;
  cleanupWindowHours: number;
  attachedPdfCount: number;
  storedPdfCount: number;
  orphanCount: number;
  historicalOrphanCount: number;
  orphanSizeLabel: string;
  contentWithoutSupportCount: number;
  storageStatusLabel: string;
  storageAuditError: string | null;
  contentWithoutSupport: Array<{
    id: string;
    title: string;
    status: string;
    statusTone: BadgeTone;
    contentType: string;
    moduleLabel: string;
    editHref: string;
    reason: string;
  }>;
  orphanPreview: Array<{
    path: string;
    name: string;
    sizeLabel: string;
    createdAt: string;
  }>;
  metrics: Array<{
    label: string;
    value: string;
    delta: string;
    tone: BadgeTone;
  }>;
};

const initialState: AdminActionState = {};

export function ContentMediaAuditPanel({ audit }: { audit: ContentMediaAudit }) {
  const [state, formAction, pending] = useActionState(cleanupOrphanContentPdfFilesAction, initialState);
  const cleanupDisabled = pending || !audit.canRunCleanup || audit.historicalOrphanCount === 0 || Boolean(audit.storageAuditError);

  return (
    <section className="panel content-media-audit" id="content-media-audit">
      <div className="panel-header-rich">
        <div>
          <span className="eyebrow">Médias de cours</span>
          <h3>PDF attachés, supports manquants et maintenance du bucket</h3>
          <p>
            Une lecture rapide pour sécuriser les cours PDF, éviter les contenus publiés sans support et garder le
            stockage propre.
          </p>
        </div>

        <div className="tag-row">
          <Badge tone={audit.storageAuditError ? "warning" : audit.canRunCleanup ? "success" : "neutral"}>
            {audit.storageStatusLabel}
          </Badge>
          <Badge tone={audit.contentWithoutSupportCount ? "warning" : "success"}>
            {audit.contentWithoutSupportCount} sans support
          </Badge>
        </div>
      </div>

      <div className="content-media-stat-grid">
        {audit.metrics.map((metric) => (
          <article key={metric.label}>
            <div className="tag-row">
              <Badge tone={metric.tone}>{metric.label}</Badge>
            </div>
            <strong>{metric.value}</strong>
            <span>{metric.delta}</span>
          </article>
        ))}
      </div>

      <div className="content-media-audit-grid">
        <section className="content-media-audit-card">
          <div className="panel-header">
            <h3>Contenus sans support ouvrable</h3>
            <p>Les ressources publiées ci-dessous doivent recevoir un PDF ou un lien exploitable côté coaché.</p>
          </div>

          {audit.contentWithoutSupport.length ? (
            <div className="stack-list">
              {audit.contentWithoutSupport.map((content) => (
                <article className="list-row list-row-stretch" key={content.id}>
                  <div>
                    <strong>{content.title}</strong>
                    <p>
                      {content.moduleLabel} · {content.reason}
                    </p>
                    <div className="tag-row">
                      <Badge tone={content.statusTone}>{content.status}</Badge>
                      <Badge tone="neutral">{content.contentType}</Badge>
                    </div>
                  </div>

                  <div className="list-row-meta">
                    <a className="button button-secondary button-small" href={content.editHref}>
                      Corriger
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state-compact">
              <strong>Bibliothèque lisible.</strong>
              <p>Les contenus publiés visibles disposent d’un support ou d’un lien d’ouverture.</p>
            </div>
          )}
        </section>

        <section className="content-media-audit-card">
          <div className="panel-header">
            <h3>PDF orphelins historiques</h3>
            <p>Les fichiers non reliés à un contenu peuvent venir d’un upload interrompu ou d’une ancienne édition.</p>
          </div>

          {audit.storageAuditError ? (
            <p className="form-error">{audit.storageAuditError}</p>
          ) : null}

          {audit.canRunCleanup ? (
            <>
              <div className="tag-row">
                <Badge tone={audit.orphanCount ? "warning" : "success"}>{audit.orphanCount} orphelin(s)</Badge>
                <Badge tone={audit.historicalOrphanCount ? "warning" : "neutral"}>
                  {audit.historicalOrphanCount} nettoyable(s)
                </Badge>
                <Badge tone="neutral">{audit.orphanSizeLabel}</Badge>
              </div>

              {audit.orphanPreview.length ? (
                <div className="content-media-file-list">
                  {audit.orphanPreview.map((file) => (
                    <article className="content-media-file-row" key={file.path}>
                      <div>
                        <strong>{file.name}</strong>
                        <span>{file.createdAt} · {file.sizeLabel}</span>
                        <code>{file.path}</code>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state empty-state-compact">
                  <strong>Aucun PDF orphelin détecté.</strong>
                  <p>Le bucket est aligné avec les contenus rattachés.</p>
                </div>
              )}

              <form action={formAction} className="content-media-cleanup-form">
                <input name="cleanup_window_hours" type="hidden" value={audit.cleanupWindowHours} />
                <button className="button button-ghost button-small" disabled={cleanupDisabled} type="submit">
                  {pending ? "Nettoyage..." : `Nettoyer les fichiers de plus de ${audit.cleanupWindowHours}h`}
                </button>
                {state.error ? <p className="form-error">{state.error}</p> : null}
                {state.success ? <p className="form-success">{state.success}</p> : null}
              </form>
            </>
          ) : (
            <div className="empty-state empty-state-compact">
              <strong>Maintenance réservée admin.</strong>
              <p>Les coachs et professeurs voient l’état pédagogique sans accéder au détail brut du stockage.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
