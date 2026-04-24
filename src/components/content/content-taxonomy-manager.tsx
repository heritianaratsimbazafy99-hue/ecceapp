"use client";

import { useActionState } from "react";

import {
  createContentTaxonomySubthemeAction,
  createContentTaxonomyThemeAction,
  deleteContentTaxonomySubthemeAction,
  deleteContentTaxonomyThemeAction,
  updateContentTaxonomySubthemeAction,
  updateContentTaxonomyThemeAction,
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
  const [themeUpdateState, themeUpdateAction, themeUpdatePending] = useActionState(
    updateContentTaxonomyThemeAction,
    initialState
  );
  const [themeDeleteState, themeDeleteAction, themeDeletePending] = useActionState(
    deleteContentTaxonomyThemeAction,
    initialState
  );
  const [subthemeUpdateState, subthemeUpdateAction, subthemeUpdatePending] = useActionState(
    updateContentTaxonomySubthemeAction,
    initialState
  );
  const [subthemeDeleteState, subthemeDeleteAction, subthemeDeletePending] = useActionState(
    deleteContentTaxonomySubthemeAction,
    initialState
  );
  const hasManagedTaxonomy = taxonomyPresets.length > 0;
  const subthemeCount = taxonomyPresets.reduce((total, preset) => total + preset.subthemes.length, 0);

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
            <strong>{subthemeCount}</strong>
            <span>sous-thème(s)</span>
          </article>
        </div>
      </div>

      <div className="admin-content-taxonomy-feedback">
        {[themeState, subthemeState, themeUpdateState, themeDeleteState, subthemeUpdateState, subthemeDeleteState].map(
          (actionState, index) =>
            actionState.error ? (
              <p className="form-error" key={`error-${index}`}>
                {actionState.error}
              </p>
            ) : actionState.success ? (
              <p className="form-success" key={`success-${index}`}>
                {actionState.success}
              </p>
            ) : null
        )}
      </div>

      <div className="admin-content-taxonomy-layout">
        <div className="admin-content-taxonomy-map">
          {hasManagedTaxonomy ? (
            taxonomyPresets.map((preset) => (
              <article className="admin-content-taxonomy-edit-card" key={preset.id}>
                <form action={themeUpdateAction} className="admin-content-taxonomy-edit-form">
                  <input name="theme_id" type="hidden" value={preset.id} />

                  <div className="tag-row">
                    <Badge tone="accent">{preset.theme}</Badge>
                    <Badge tone="neutral">{preset.subthemes.length} sous-thème(s)</Badge>
                    <Badge tone="neutral">ordre {preset.position ?? 0}</Badge>
                  </div>

                  <div className="admin-content-taxonomy-inline-grid">
                    <label>
                      Thème
                      <input defaultValue={preset.theme} name="label" required type="text" />
                    </label>
                    <label>
                      Position
                      <input defaultValue={preset.position ?? 0} min="0" name="position" type="number" />
                    </label>
                  </div>

                  <label>
                    Description
                    <textarea defaultValue={preset.description} name="description" rows={3} />
                  </label>

                  <div className="admin-content-card-actions">
                    <button className="button button-secondary button-small" disabled={themeUpdatePending} type="submit">
                      {themeUpdatePending ? "Mise à jour..." : "Mettre à jour"}
                    </button>
                  </div>
                </form>

                <div className="admin-content-taxonomy-subtheme-editor">
                  {preset.subthemes.length ? (
                    preset.subthemes.map((subtheme) => (
                      <article className="admin-content-taxonomy-subtheme-card" key={subtheme.id ?? subtheme.label}>
                        <form action={subthemeUpdateAction} className="admin-content-taxonomy-edit-form">
                          <input name="subtheme_id" type="hidden" value={subtheme.id ?? ""} />

                          <div className="admin-content-taxonomy-inline-grid">
                            <label>
                              Sous-thème
                              <input defaultValue={subtheme.label} name="label" required type="text" />
                            </label>
                            <label>
                              Position
                              <input defaultValue={subtheme.position ?? 0} min="0" name="position" type="number" />
                            </label>
                          </div>

                          <label>
                            Thème parent
                            <select defaultValue={preset.id} name="theme_id" required>
                              {taxonomyPresets.map((theme) => (
                                <option key={theme.id} value={theme.id}>
                                  {theme.theme}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            Sujets abordés
                            <input defaultValue={subtheme.topics.join(", ")} name="topics" type="text" />
                          </label>

                          <div className="admin-content-card-actions">
                            <button className="button button-secondary button-small" disabled={subthemeUpdatePending} type="submit">
                              {subthemeUpdatePending ? "Mise à jour..." : "Mettre à jour"}
                            </button>
                          </div>
                        </form>

                        {subtheme.id ? (
                          <form
                            action={subthemeDeleteAction}
                            className="admin-content-taxonomy-delete-form"
                            onSubmit={(event) => {
                              if (!window.confirm(`Supprimer le sous-thème "${subtheme.label}" ?`)) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input name="subtheme_id" type="hidden" value={subtheme.id} />
                            <button className="button button-ghost button-small" disabled={subthemeDeletePending} type="submit">
                              Supprimer le sous-thème
                            </button>
                          </form>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="empty-state empty-state-compact">
                      <strong>Aucun sous-thème.</strong>
                      <p>Ajoute un sous-thème pour rendre ce thème exploitable dans le studio.</p>
                    </div>
                  )}
                </div>

                <form
                  action={themeDeleteAction}
                  className="admin-content-taxonomy-delete-form"
                  onSubmit={(event) => {
                    if (!window.confirm(`Supprimer le thème "${preset.theme}" et ses sous-thèmes ?`)) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input name="theme_id" type="hidden" value={preset.id} />
                  <div>
                    <strong>Suppression du thème</strong>
                    <p>Les sous-thèmes rattachés seront retirés de la taxonomie, sans modifier les contenus déjà classés.</p>
                  </div>
                  <button className="button button-ghost button-small" disabled={themeDeletePending} type="submit">
                    Supprimer le thème
                  </button>
                </form>
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

            <button className="button button-secondary" disabled={subthemePending || !hasManagedTaxonomy} type="submit">
              {subthemePending ? "Ajout..." : "Ajouter le sous-thème"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
