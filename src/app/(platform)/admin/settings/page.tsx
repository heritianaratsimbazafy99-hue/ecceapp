import Link from "next/link";

import {
  OrganizationBrandingForm,
  OrganizationPlatformSettingsForm
} from "@/app/(platform)/admin/settings/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminOrganizationSettingsPageData } from "@/lib/organization";

export default async function AdminSettingsPage() {
  const { branding, metrics, appUrl } = await getAdminOrganizationSettingsPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Réglages organisation"
        description="Centralise l'identité de marque, les messages d'accueil et les paramètres de plateforme pour arrêter les chaînes ECCE codées en dur."
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight organization-settings-hero">
        <div className="organization-brand-preview">
          <div className="organization-brand-preview-head">
            <span className="brand-mark">{branding.brandMark}</span>

            <div className="organization-brand-preview-copy">
              <span className="eyebrow">Brand system</span>
              <h3>{branding.displayName}</h3>
              <p>{branding.platformTagline}</p>
            </div>
          </div>

          <p className="organization-brand-preview-story">{branding.marketingHeadline}</p>
          <p className="organization-brand-preview-support">{branding.marketingSubheadline}</p>

          <div className="tag-row">
            <Badge tone="accent">{branding.slug}</Badge>
            <Badge tone={branding.allowCoachSelfSchedule ? "success" : "warning"}>
              {branding.allowCoachSelfSchedule ? "agenda coach ouvert" : "agenda coach verrouillé"}
            </Badge>
            <Badge tone="neutral">{branding.defaultLocale}</Badge>
          </div>
        </div>

        <div className="organization-settings-metrics">
          <article>
            <strong>{branding.defaultTimezone}</strong>
            <span>fuseau des nouveaux comptes</span>
          </article>
          <article>
            <strong>{branding.supportEmail ?? "non défini"}</strong>
            <span>canal de support prioritaire</span>
          </article>
          <article>
            <strong>{branding.websiteUrl ?? appUrl ?? "interne uniquement"}</strong>
            <span>porte d&apos;entrée publique</span>
          </article>
          <article>
            <strong>{branding.shortName}</strong>
            <span>signature du workspace</span>
          </article>
        </div>
      </section>

      <section className="organization-settings-grid">
        <div className="organization-settings-stack">
          <section className="panel">
            <div className="panel-header">
              <h3>Identité et messaging</h3>
              <p>Le nom public, la baseline, les messages d&apos;accueil et les canaux de contact partent d&apos;ici.</p>
            </div>

            <OrganizationBrandingForm branding={branding} />
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Paramètres plateforme</h3>
              <p>Ce bloc pilote déjà le fuseau appliqué aux nouveaux comptes et l&apos;ouverture du planner coach dans l&apos;agenda.</p>
            </div>

            <OrganizationPlatformSettingsForm branding={branding} />
          </section>
        </div>

        <aside className="organization-settings-aside">
          <section className="panel">
            <div className="panel-header">
              <h3>Impact immédiat</h3>
              <p>Les surfaces ci-dessous relisent déjà ces réglages sans repasser par du code figé.</p>
            </div>

            <div className="stack-list">
              <article className="list-row list-row-stretch">
                <div>
                  <strong>Page publique</strong>
                  <p>Header et hero reprennent le nom, la baseline et le messaging de marque.</p>
                </div>
                <Badge tone="accent">/</Badge>
              </article>

              <article className="list-row list-row-stretch">
                <div>
                  <strong>Connexion</strong>
                  <p>L&apos;écran de sign-in réutilise désormais le branding et le support de l&apos;organisation.</p>
                </div>
                <Badge tone="accent">/auth/sign-in</Badge>
              </article>

              <article className="list-row list-row-stretch">
                <div>
                  <strong>Workspace</strong>
                  <p>La sidebar plateforme remonte le nom court, le marqueur et la signature active.</p>
                </div>
                <Badge tone="accent">layout</Badge>
              </article>

              <article className="list-row list-row-stretch">
                <div>
                  <strong>Agenda</strong>
                  <p>Le toggle de planification décide si un coach peut ouvrir la planification rapide.</p>
                </div>
                <Badge tone={branding.allowCoachSelfSchedule ? "success" : "warning"}>
                  {branding.allowCoachSelfSchedule ? "coach autorisé" : "coach limité"}
                </Badge>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Références live</h3>
              <p>Repères utiles pour relier branding, support et déploiement sans repasser par Supabase à l&apos;aveugle.</p>
            </div>

            <div className="organization-settings-reference-list">
              <div>
                <span className="eyebrow">App URL</span>
                <strong>{appUrl ?? "NEXT_PUBLIC_APP_URL non défini"}</strong>
              </div>

              <div>
                <span className="eyebrow">Support</span>
                <strong>{branding.supportEmail ?? "Aucun email défini"}</strong>
              </div>

              <div>
                <span className="eyebrow">Site vitrine</span>
                {branding.websiteUrl ? (
                  <Link href={branding.websiteUrl} target="_blank">
                    {branding.websiteUrl}
                  </Link>
                ) : (
                  <strong>Utilise actuellement l&apos;app comme point d&apos;entrée</strong>
                )}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
