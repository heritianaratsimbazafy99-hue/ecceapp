import Link from "next/link";

import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getCommunityPageData } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

function buildCommunityHref({
  query,
  cohortId,
  role
}: {
  query?: string;
  cohortId?: string;
  role?: string;
}) {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("query", query);
  }

  if (cohortId) {
    searchParams.set("cohort", cohortId);
  }

  if (role && role !== "all") {
    searchParams.set("role", role);
  }

  const value = searchParams.toString();
  return value ? `/community?${value}` : "/community";
}

export default async function CommunityPage({
  searchParams
}: {
  searchParams: Promise<{
    query?: string;
    cohort?: string;
    role?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    context,
    filters,
    metrics,
    hero,
    cohortOptions,
    cohortCards,
    members,
    totalMatchingMembers,
    coachDirectory,
    playbook
  } = await getCommunityPageData({
    query: params.query,
    cohortId: params.cohort,
    role: params.role
  });
  const canUseMessaging = context.roles.includes("coach") || context.roles.includes("coachee");

  return (
    <div className="page-shell">
      <PlatformTopbar
        actions={
          <>
            {canUseMessaging ? (
              <Link className="button button-secondary" href="/messages">
                Messages
              </Link>
            ) : null}
            <Link className="button" href="/library">
              Bibliothèque
            </Link>
          </>
        }
        description="Socle V2 pour structurer l’annuaire, les groupes privés et les responsabilités coach sans perdre la clarté SaaS."
        title="Communauté"
      />

      <section className="metric-grid metric-grid-compact">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel panel-highlight community-command-hero">
        <div className="community-command-copy">
          <span className="eyebrow">{hero.eyebrow}</span>
          <h3>{hero.title}</h3>
          <p>{hero.summary}</p>

          <div className="tag-row">
            <Badge tone="neutral">{filters.summary}</Badge>
            <Badge tone="accent">{totalMatchingMembers} résultat(s)</Badge>
          </div>

          <div className="community-actions">
            <Link className="button" href={buildCommunityHref({ role: "coach", cohortId: filters.cohortId, query: filters.query })}>
              Voir les coachs
            </Link>
            <Link className="button button-secondary" href={buildCommunityHref({ role: "coachee", cohortId: filters.cohortId, query: filters.query })}>
              Voir les coachés
            </Link>
            <Link className="button button-secondary" href="/agenda">
              Agenda
            </Link>
          </div>
        </div>

        <div className="community-playbook-grid">
          {playbook.map((item) => (
            <article className="community-playbook-card" key={item.title}>
              <Badge tone={item.tone}>{item.badge}</Badge>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel library-search-panel">
        <div className="library-search-head">
          <div>
            <span className="eyebrow">Filtrer la communauté</span>
            <h3>Recherche, groupe privé et rôle</h3>
            <p>Réduis l’annuaire au périmètre utile avant d’ouvrir un profil, une conversation ou une cohorte.</p>
          </div>

          <Link className="button button-secondary" href="/community">
            Réinitialiser
          </Link>
        </div>

        <form className="community-filter-form" method="get">
          <label className="conversation-search">
            <span>Recherche</span>
            <input defaultValue={filters.query} name="query" placeholder="Nom, rôle, cohorte, thème" type="search" />
          </label>

          <label className="conversation-composer-field">
            <span>Groupe privé</span>
            <select defaultValue={filters.cohortId} name="cohort">
              <option value="">Tous les groupes visibles</option>
              {cohortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} · {option.memberCount} membre(s)
                </option>
              ))}
            </select>
          </label>

          <label className="conversation-composer-field">
            <span>Rôle</span>
            <select defaultValue={filters.role} name="role">
              <option value="all">Tous les rôles</option>
              <option value="coach">Coachs</option>
              <option value="coachee">Coachés</option>
              <option value="professor">Professors</option>
              <option value="admin">Admins</option>
            </select>
          </label>

          <div className="community-filter-actions">
            <button className="button" type="submit">
              Filtrer
            </button>
          </div>
        </form>
      </section>

      <section className="community-command-layout">
        <div className="community-main-stack">
          <section className="panel">
            <div className="panel-header-rich">
              <div>
                <span className="eyebrow">Groupes privés</span>
                <h3>Cohortes prêtes pour la communauté</h3>
              </div>
              <Badge tone="neutral">{cohortCards.length} visible(s)</Badge>
            </div>

            {cohortCards.length ? (
              <div className="community-group-grid">
                {cohortCards.map((cohort) => (
                  <Link
                    className={cn("community-group-card", cohort.isActive && "is-active")}
                    href={buildCommunityHref({
                      query: filters.query,
                      role: filters.role,
                      cohortId: cohort.isActive ? "" : cohort.id
                    })}
                    key={cohort.id}
                  >
                    <div className="community-group-head">
                      <strong>{cohort.name}</strong>
                      <Badge tone={cohort.tone}>{cohort.statusLabel}</Badge>
                    </div>
                    <p>{cohort.memberPreview}</p>
                    <div className="community-group-kpis">
                      <span>{cohort.memberCount} membre(s)</span>
                      <span>{cohort.coachCount} coach(s)</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>Aucun groupe privé visible.</strong>
                <p>Les cohortes existantes alimenteront cette zone dès qu’elles seront dans ton périmètre.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header-rich">
              <div>
                <span className="eyebrow">Annuaire</span>
                <h3>Membres actionnables</h3>
              </div>
              <Badge tone="neutral">{totalMatchingMembers} résultat(s)</Badge>
            </div>

            {members.length ? (
              <div className="community-member-list">
                {members.map((member) => (
                  <article className="community-member-card" key={member.id}>
                    <div className="community-member-copy">
                      <div className="community-member-head">
                        <strong>{member.name}</strong>
                        <div className="tag-row">
                          <Badge tone={member.tone}>{member.roleLabels.join(" · ")}</Badge>
                          <Badge tone={member.statusTone}>{member.status}</Badge>
                        </div>
                      </div>
                      <p>{member.bio}</p>
                      <div className="community-member-meta">
                        {(member.cohortLabels.length ? member.cohortLabels : ["Aucune cohorte"]).slice(0, 3).map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    </div>

                    {member.actionHref ? (
                      <Link className="button button-secondary button-small" href={member.actionHref}>
                        {member.actionLabel}
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>Aucun membre ne correspond aux filtres.</strong>
                <p>Élargis le groupe ou le rôle pour retrouver plus de profils.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="community-side-stack">
          <section className="panel">
            <div className="panel-header">
              <span className="eyebrow">Coachs responsables</span>
              <h3>Couverture du périmètre</h3>
            </div>

            {coachDirectory.length ? (
              <div className="community-coach-list">
                {coachDirectory.map((coach) => (
                  <article className="community-coach-card" key={coach.id}>
                    <div>
                      <strong>{coach.name}</strong>
                      <p>{coach.assignedCount} coaché(s) couvert(s)</p>
                      <div className="community-member-meta">
                        {(coach.cohortLabels.length ? coach.cohortLabels : ["Assignations directes"]).slice(0, 3).map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    </div>

                    {coach.actionHref ? (
                      <Link className="button button-secondary button-small" href={coach.actionHref}>
                        Message
                      </Link>
                    ) : (
                      <Badge tone={coach.status === "active" ? "success" : "neutral"}>{coach.status}</Badge>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>Aucun coach visible.</strong>
                <p>Les assignations coach alimenteront cette couverture automatiquement.</p>
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
