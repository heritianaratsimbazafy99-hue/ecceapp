"use client";

import { useActionState } from "react";

import {
  createContentTaxonomySubthemeAction,
  createContentTaxonomyThemeAction,
  type AdminActionState
} from "@/app/(platform)/admin/actions";
import type { ContentTaxonomyPreset } from "@/components/content/content-studio-composer";
import { Badge } from "@/components/ui/badge";

const initialState: AdminActionState = {};

export function ContentTaxonomyManager({
  taxonomyPresets
}: {
  taxonomyPresets: ContentTaxonomyPreset[];
}) {
  const [themeState, themeAction, themePending] = useActionState(
    createContentTaxonomyThemeAction,
    initialState
  );
  const [subthemeState, subthemeAction, subthemePending] = useActionState(
    createContentTaxonomySubthemeAction,
    initialState
  );
  const hasManagedTaxonomy = taxonomyPresets.length > 0;

  return (
    <section className="panel admin-content-taxonomy-manager" id="content-taxonomy">
      <div className="panel-header-rich">
        <div>
          <span className="eyebrow">Taxonomie administrable</span>
          <h3>Thèmes, sous-thèmes et sujets abordés</h3>
          <p>
            Pilote l’architecture de la bibliothèque sans toucher au code : le studio de création réutilise ces repères
            pour guider les prochains contenus.
          </p>
        </div>

        <div className="messaging-inline-stats">
          <article>
            <strong>{taxonomyPresets.length}</strong>
            <span>thème(s)</span>
          </article>
          <article>
            <strong>{taxonomyPresets.reduce((total, preset) => total + preset.subthemes.length, 0)}</strong>
            <span>sous-thème(s)</span>
          </article>
        </div>
      </div>

      <div className="admin-content-taxonomy-layout">
        <div className="admin-content-taxonomy-map">
          {hasManagedTaxonomy ? (
            taxonomyPresets.map((preset) => (
              <article className="library-taxonomy-card" key={preset.id}>
                <div className="tag-row">
                  <Badge tone="accent">{preset.theme}</Badge>
                  <Badge tone="neutral">{preset.subthemes.length} sous-thème(s)</Badge>
                </div>

                <p>{preset.description || "Aucune description renseignée pour le moment."}</p>

                <div className="library-subtheme-list">
                  {preset.subthemes.map((subtheme) => (
                    <span className="library-subtheme-button" key={subtheme.id ?? subtheme.label}>
                      <span>{subtheme.label}</span>
                      <strong>{subtheme.topics.length}</strong>
                    </span>
                  ))}
                </div>

                {preset.subthemes.some((subtheme) => subtheme.topics.length > 0) ? (
                  <div className="library-topic-row">
                    {preset.subthemes
                      .flatMap((subtheme) => subtheme.topics)
                      .slice(0, 8)
                      .map((topic) => (
                        <span className="library-topic-pill" key={`${preset.id}-${topic}`}>
                          {topic}
                        </span>
                      ))}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="empty-state">
              <strong>Aucune taxonomie administrable détectée.</strong>
              <p>Exécute la migration Supabase du bloc pour activer les thèmes pilotables depuis l’admin.</p>
            </div>
          )}
        </div>

        <div className="admin-content-taxonomy-forms">
          <form action={themeAction} className="admin-content-taxonomy-form">
            <div className="panel-header">
              <h3>Nouveau thème</h3>
              <p>Exemple : Fondamentaux, Business coaching, Pratique coach.</p>
            </div>

            <label>
              Thème
              <input name="label" placeholder="Business coaching" required type="text" />
            </label>

            <label>
              Description
              <textarea
                name="description"
                placeholder="Contenus pour structurer l’offre, la prospection et la conversion."
                rows={3}
              />
            </label>

            <label>
              Position
              <input defaultValue="50" min="0" name="position" type="number" />
            </label>

            {themeState.error ? <p className="form-error">{themeState.error}</p> : null}
            {themeState.success ? <p className="form-success">{themeState.success}</p> : null}

            <button className="button button-secondary" disabled={themePending} type="submit">
              {themePending ? "Ajout..." : "Ajouter le thème"}
            </button>
          </form>

          <form action={subthemeAction} className="admin-content-taxonomy-form">
            <div className="panel-header">
              <h3>Nouveau sous-thème</h3>
              <p>Les sujets deviennent les suggestions de tags du studio de contenu.</p>
            </div>

            <label>
              Thème parent
              <select disabled={!hasManagedTaxonomy} name="theme_id" required>
                <option value="">Choisir un thème</option>
                {taxonomyPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.theme}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sous-thème
              <input disabled={!hasManagedTaxonomy} name="label" placeholder="Acquisition client" required type="text" />
            </label>

            <label>
              Sujets abordés
              <input
                disabled={!hasManagedTaxonomy}
                name="topics"
                placeholder="prospection, contenu, vente, conversion"
                type="text"
              />
            </label>

            <label>
              Position
              <input defaultValue="50" disabled={!hasManagedTaxonomy} min="0" name="position" type="number" />
            </label>

            {subthemeState.error ? <p className="form-error">{subthemeState.error}</p> : null}
            {subthemeState.success ? <p className="form-success">{subthemeState.success}</p> : null}

            <button className="button button-secondary" disabled={subthemePending || !hasManagedTaxonomy} type="submit">
              {subthemePending ? "Ajout..." : "Ajouter le sous-thème"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
