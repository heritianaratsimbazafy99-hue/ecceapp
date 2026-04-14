import {
  AddQuizQuestionForm,
  AssignRoleForm,
  CreateAssignmentForm,
  CreateContentForm,
  CreateQuizForm,
  CreateUserForm,
  DeleteQuizQuestionButton
} from "@/app/(platform)/admin/forms";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { EngagementMeter } from "@/components/platform/engagement-meter";
import { MetricCard } from "@/components/platform/metric-card";
import { Badge } from "@/components/ui/badge";
import { getAdminPageData } from "@/lib/platform-data";

function roleTone(role: string) {
  switch (role) {
    case "admin":
      return "warning";
    case "coach":
      return "accent";
    case "professor":
      return "success";
    default:
      return "neutral";
  }
}

export default async function AdminPage() {
  const {
    metrics,
    analyticsOverview,
    engagementSignals,
    attentionLearners,
    users,
    userOptions,
    cohortOptions,
    contents,
    contentOptions,
    quizzes,
    quizOptions,
    assignments
  } = await getAdminPageData();

  return (
    <div className="page-shell">
      <PlatformTopbar
        title="Pilotage admin"
        description="Back-office réel ECCE pour piloter utilisateurs, contenus et santé pédagogique globale de l'école."
      />

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel panel-highlight">
          <div className="panel-header">
            <h3>Analytics pédagogiques</h3>
            <p>Vue agrégée de la dynamique ECCE pour décider vite où concentrer l&apos;accompagnement.</p>
          </div>

          <EngagementMeter
            band={
              analyticsOverview.averageScore >= 75
                ? "strong"
                : analyticsOverview.averageScore >= 45
                  ? "watch"
                  : "risk"
            }
            bandLabel={
              analyticsOverview.averageScore >= 75
                ? "Cohorte saine"
                : analyticsOverview.averageScore >= 45
                  ? "Surveillance utile"
                  : "Relance prioritaire"
            }
            caption={`${analyticsOverview.totalPublishedContents} contenus publiés · ${analyticsOverview.totalAssignments} assignations actives`}
            score={analyticsOverview.averageScore}
            trend={analyticsOverview.atRiskCount > 0 ? "down" : "steady"}
            trendLabel={
              analyticsOverview.atRiskCount > 0
                ? `${analyticsOverview.atRiskCount} coaché(s) demandent une relance`
                : "dynamique globale stable"
            }
          />

          <div className="analytics-list section-spacer">
            <article className="analytics-item">
              <span>Complétion moyenne</span>
              <strong>{analyticsOverview.completionRate !== null ? `${analyticsOverview.completionRate}%` : "n/a"}</strong>
              <small>{analyticsOverview.strongCount} coaché(s) très engagés</small>
            </article>
            <article className="analytics-item">
              <span>Ponctualité moyenne</span>
              <strong>{analyticsOverview.onTimeRate !== null ? `${analyticsOverview.onTimeRate}%` : "n/a"}</strong>
              <small>{analyticsOverview.watchCount} à surveiller</small>
            </article>
            <article className="analytics-item">
              <span>Quiz moyen</span>
              <strong>{analyticsOverview.averageQuizScore !== null ? `${analyticsOverview.averageQuizScore}%` : "n/a"}</strong>
              <small>{analyticsOverview.recentlyActiveCount} actifs cette semaine</small>
            </article>
            <article className="analytics-item">
              <span>Ressources actives</span>
              <strong>{analyticsOverview.totalQuizzes}</strong>
              <small>{analyticsOverview.totalCoaches} coach(s) mobilisés</small>
            </article>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Coachés à relancer</h3>
            <p>Ceux qui combinent retard, faible activité récente ou faible complétion.</p>
          </div>

          {attentionLearners.length ? (
            <div className="stack-list">
              {attentionLearners.map((learner) => (
                <article className="list-row list-row-stretch" key={learner.id}>
                  <div>
                    <strong>{learner.name}</strong>
                    <p>
                      {learner.lastActivityLabel} · {learner.nextFocus}
                    </p>
                  </div>
                  <div className="list-row-meta">
                    <Badge tone={learner.band === "risk" ? "warning" : "accent"}>{learner.bandLabel}</Badge>
                    <strong>{learner.score}%</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune alerte majeure.</strong>
              <p>Les signaux d&apos;engagement restent sains à ce stade.</p>
            </div>
          )}
        </div>
      </section>

      <section className="admin-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Créer un utilisateur</h3>
            <p>Création du compte Supabase, du profil ECCE et attribution du premier rôle.</p>
          </div>
          <CreateUserForm />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Attribuer un rôle</h3>
            <p>Ajoute un rôle complémentaire à un utilisateur déjà créé.</p>
          </div>
          <AssignRoleForm userOptions={userOptions} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Créer un contenu</h3>
          <p>Premier back-office branché sur `content_items` pour alimenter la bibliothèque réelle.</p>
        </div>
        <CreateContentForm />
      </section>

      <section className="admin-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Créer un quiz</h3>
            <p>Création réelle dans `quizzes`, avec première question optionnelle.</p>
          </div>
          <CreateQuizForm contentOptions={contentOptions} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Créer une assignation</h3>
            <p>Définis une deadline pour un contenu ou un quiz vers un utilisateur ou une cohorte.</p>
          </div>
          <CreateAssignmentForm
            cohortOptions={cohortOptions}
            contentOptions={contentOptions}
            quizOptions={quizOptions}
            userOptions={userOptions}
          />
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Utilisateurs ECCE</h3>
            <p>Vue réelle des profils et des rôles actuellement enregistrés.</p>
          </div>

          {users.length ? (
            <div className="data-table">
              <div className="table-head">
                <span>Utilisateur</span>
                <span>Statut</span>
                <span>Rôles</span>
              </div>
              {users.map((user) => (
                <article className="table-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <p>{user.email}</p>
                  </div>
                  <div>
                    <Badge tone={user.status === "active" ? "success" : "warning"}>
                      {user.status}
                    </Badge>
                  </div>
                  <div className="tag-row">
                    {user.roles.length ? (
                      user.roles.map((role) => (
                        <Badge key={`${user.id}-${role}`} tone={roleTone(role)}>
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge tone="neutral">sans rôle</Badge>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun utilisateur métier pour l&apos;instant.</strong>
              <p>Crée ton premier coach, coaché ou professeur depuis le formulaire ci-dessus.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Contenus enregistrés</h3>
            <p>Les éléments créés ici apparaîtront ensuite dans la bibliothèque publique selon leur statut.</p>
          </div>

          {contents.length ? (
            <div className="stack-list">
              {contents.map((content) => (
                <article className="list-row" key={content.id}>
                  <div>
                    <strong>{content.title}</strong>
                    <p>
                      {content.category || "Sans catégorie"} · {content.content_type} ·{" "}
                      {content.estimated_minutes ? `${content.estimated_minutes} min` : "durée libre"}
                    </p>
                  </div>
                  <Badge tone={content.status === "published" ? "success" : "neutral"}>
                    {content.status}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun contenu n&apos;a encore été créé.</strong>
              <p>Utilise le formulaire ci-dessus pour alimenter la bibliothèque ECCE.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Vue engagement coachés</h3>
          <p>Un radar simple pour repérer les dynamiques fortes et les points de friction individuels.</p>
        </div>

        {engagementSignals.length ? (
          <div className="stack-list">
            {engagementSignals.slice(0, 8).map((learner) => (
              <article className="list-row list-row-stretch" key={learner.id}>
                <div className="analytics-copy">
                  <strong>{learner.name}</strong>
                  <p>
                    {learner.cohorts.length ? learner.cohorts.join(", ") : "Sans cohorte"} · {learner.lastActivityLabel}
                  </p>
                  <p>{learner.nextFocus}</p>
                </div>

                <div className="analytics-meta">
                  <Badge tone={learner.band === "strong" ? "success" : learner.band === "risk" ? "warning" : "accent"}>
                    {learner.bandLabel}
                  </Badge>
                  <strong>{learner.score}%</strong>
                  <small>
                    complétion {learner.completionRate !== null ? `${learner.completionRate}%` : "n/a"} · quiz{" "}
                    {learner.averageQuizScore !== null ? `${learner.averageQuizScore}%` : "n/a"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucun signal coaché pour l&apos;instant.</strong>
            <p>Ajoute des coachés puis des assignations pour faire vivre ce radar pédagogique.</p>
          </div>
        )}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Quiz enregistrés</h3>
            <p>Base réelle des quizzes ECCE, prête pour les prochaines interfaces de passage et correction.</p>
          </div>

          {quizzes.length ? (
            <div className="stack-list">
              {quizzes.map((quiz) => (
                <article className="panel panel-subtle" key={quiz.id}>
                  <div className="panel-header">
                    <h3>{quiz.title}</h3>
                    <p>
                      {quiz.kind} · {quiz.attempts_allowed ?? 1} tentative(s)
                      {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ""}
                    </p>
                  </div>

                  <div className="table-actions">
                    <Badge tone={quiz.status === "published" ? "success" : "neutral"}>
                      {quiz.status ?? "draft"}
                    </Badge>
                    <Badge tone="accent">{quiz.quiz_questions?.length ?? 0} question(s)</Badge>
                  </div>

                  {quiz.quiz_questions?.length ? (
                    <div className="stack-list section-spacer">
                      {quiz.quiz_questions.map((question) => (
                        <article className="list-row list-row-stretch" key={question.id}>
                          <div>
                            <strong>
                              Q{question.position + 1} · {question.question_type}
                            </strong>
                            <p>{question.prompt}</p>
                            {question.helper_text ? <p>{question.helper_text}</p> : null}
                            {question.quiz_question_choices?.length ? (
                              <p>
                                {question.quiz_question_choices
                                  .sort((left, right) => left.position - right.position)
                                  .map((choice) => `${choice.is_correct ? "✓" : "•"} ${choice.label}`)
                                  .join(" · ")}
                              </p>
                            ) : null}
                          </div>
                          <div className="list-row-meta">
                            <Badge tone="neutral">{question.points} pt(s)</Badge>
                            <DeleteQuizQuestionButton questionId={question.id} quizId={quiz.id} />
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state empty-state-compact">
                      <strong>Aucune question pour ce quiz.</strong>
                      <p>Ajoute des questions ci-dessous pour le rendre exploitable.</p>
                    </div>
                  )}

                  <div className="section-spacer">
                    <AddQuizQuestionForm quizId={quiz.id} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucun quiz créé.</strong>
              <p>Crée ton premier quiz pour l’utiliser ensuite dans les deadlines.</p>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Deadlines et assignations</h3>
            <p>Vue réelle des assignations déjà programmées dans la plateforme.</p>
          </div>

          {assignments.length ? (
            <div className="stack-list">
              {assignments.map((assignment) => (
                <article className="list-row list-row-stretch" key={assignment.id}>
                  <div>
                    <strong>{assignment.title}</strong>
                    <p>
                      {assignment.type} · {assignment.asset}
                    </p>
                    <p>
                      cible : {assignment.target} · échéance : {assignment.due}
                    </p>
                  </div>
                  <Badge tone={assignment.type === "quiz" ? "warning" : "accent"}>
                    {assignment.type}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Aucune assignation active.</strong>
              <p>Crée une deadline pour commencer à alimenter le dashboard coaché.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
