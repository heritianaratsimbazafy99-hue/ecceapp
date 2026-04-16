"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { submitQuizAttemptAction, type QuizActionState } from "@/app/(platform)/quiz/actions";
import { CelebrationBurst } from "@/components/feedback/celebration-burst";

type QuizQuestion = {
  id: string;
  prompt: string;
  helper_text: string | null;
  question_type: string;
  points: number;
  quiz_question_choices?: Array<{
    id: string;
    label: string;
    position: number;
  }>;
};

type QuizPlayerExperienceProps = {
  assignmentId?: string | null;
  attemptsAllowed: number;
  initialAttemptCount: number;
  passingScore?: number | null;
  quizId: string;
  questions: QuizQuestion[];
  randomizeQuestions?: boolean;
  timeLimitMinutes?: number | null;
  title: string;
};

const initialState: QuizActionState = {};

function shuffleQuestions<T>(items: T[]) {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[targetIndex]] = [clone[targetIndex], clone[index]];
  }

  return clone;
}

export function QuizPlayerExperience({
  assignmentId,
  attemptsAllowed,
  initialAttemptCount,
  passingScore,
  quizId,
  questions,
  randomizeQuestions = false,
  timeLimitMinutes,
  title
}: QuizPlayerExperienceProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const storageKey = `ecce-quiz-draft-${quizId}`;
  const [state, formAction, pending] = useActionState(submitQuizAttemptAction, initialState);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(
    timeLimitMinutes ? timeLimitMinutes * 60 : null
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedDraftRaw = window.sessionStorage.getItem(storageKey);

    if (savedDraftRaw) {
      try {
        const savedDraft = JSON.parse(savedDraftRaw) as {
          currentIndex?: number;
          questionOrder?: string[];
          responses?: Record<string, string>;
          reviewMode?: boolean;
          timeLeftSeconds?: number | null;
        };

        setQuestionOrder(savedDraft.questionOrder?.length ? savedDraft.questionOrder : []);
        setResponses(savedDraft.responses ?? {});
        setCurrentIndex(
          typeof savedDraft.currentIndex === "number"
            ? Math.min(savedDraft.currentIndex, Math.max(questions.length - 1, 0))
            : 0
        );
        setReviewMode(Boolean(savedDraft.reviewMode));

        if (typeof savedDraft.timeLeftSeconds === "number") {
          setTimeLeftSeconds(savedDraft.timeLeftSeconds);
        }
      } catch {
        window.sessionStorage.removeItem(storageKey);
      }
    }

    setIsHydrated(true);
  }, [questions.length, storageKey]);

  useEffect(() => {
    if (!isHydrated || questionOrder.length) {
      return;
    }

    const nextOrder = randomizeQuestions
      ? shuffleQuestions(questions).map((question) => question.id)
      : questions.map((question) => question.id);
    setQuestionOrder(nextOrder);
  }, [isHydrated, questionOrder.length, questions, randomizeQuestions]);

  const orderedQuestions = !questionOrder.length
    ? questions
    : (() => {
        const questionById = new Map(questions.map((question) => [question.id, question]));
        return questionOrder
          .map((questionId) => questionById.get(questionId))
          .filter(Boolean) as QuizQuestion[];
      })();

  const answeredCount = orderedQuestions.reduce((total, question) => {
    return responses[question.id]?.trim() ? total + 1 : total;
  }, 0);

  const progressValue = orderedQuestions.length
    ? Math.round(((reviewMode ? orderedQuestions.length : currentIndex + 1) / orderedQuestions.length) * 100)
    : 0;
  const remainingAttempts = Math.max(0, attemptsAllowed - initialAttemptCount);
  const activeQuestion = orderedQuestions[currentIndex];

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!questionOrder.length) {
      return;
    }

    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        currentIndex,
        questionOrder,
        responses,
        reviewMode,
        timeLeftSeconds
      })
    );
  }, [currentIndex, isHydrated, questionOrder, responses, reviewMode, storageKey, timeLeftSeconds]);

  useEffect(() => {
    if (state.success) {
      window.sessionStorage.removeItem(storageKey);
      setReviewMode(true);
    }
  }, [state.success, storageKey]);

  useEffect(() => {
    if (pending || timeLeftSeconds === null || timeLeftSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimeLeftSeconds((current) => (current === null ? null : current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pending, timeLeftSeconds]);

  useEffect(() => {
    if (pending || timeLeftSeconds !== 0) {
      return;
    }

    formRef.current?.requestSubmit();
  }, [pending, timeLeftSeconds]);

  useEffect(() => {
    const activeSingleChoiceQuestion =
      reviewMode || !activeQuestion || activeQuestion.question_type !== "single_choice"
        ? null
        : activeQuestion;

    if (!activeSingleChoiceQuestion) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const choiceIndex = Number(event.key) - 1;

      if (!Number.isInteger(choiceIndex) || choiceIndex < 0) {
        return;
      }

      const sortedChoices = [...(activeSingleChoiceQuestion.quiz_question_choices ?? [])].sort(
        (left, right) => left.position - right.position
      );
      const selectedChoice = sortedChoices[choiceIndex];

      if (!selectedChoice) {
        return;
      }

      setResponses((currentResponses) => ({
        ...currentResponses,
        [activeSingleChoiceQuestion.id]: selectedChoice.id
      }));
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeQuestion, reviewMode]);

  const goToQuestion = (index: number) => {
    setReviewMode(false);
    setCurrentIndex(index);
  };

  const minutes = timeLeftSeconds === null ? null : Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds === null ? null : timeLeftSeconds % 60;

  return (
    <form action={formAction} className="quiz-player-shell" ref={formRef}>
      <input name="quiz_id" type="hidden" value={quizId} />
      {assignmentId ? <input name="assignment_id" type="hidden" value={assignmentId} /> : null}
      {orderedQuestions.map((question) =>
        responses[question.id] ? (
          <input key={question.id} name={`question_${question.id}`} type="hidden" value={responses[question.id]} />
        ) : null
      )}

      <CelebrationBurst
        active={Boolean(state.success)}
        body={
          state.pendingManualReview
            ? "Les réponses ouvertes sont parties en correction coach."
            : state.badgeTitle
              ? `Badge débloqué : ${state.badgeTitle}.`
              : "Ton score est enregistré dans ECCE."
        }
        title={state.pendingManualReview ? "Quiz envoyé" : state.badgeTitle ? "Badge débloqué" : "Quiz terminé"}
        tone={state.badgeTitle ? "badge" : "success"}
        triggerKey={`${state.success ?? ""}-${state.score ?? ""}-${state.badgeTitle ?? ""}`}
      />

      <section className="panel panel-highlight quiz-player-hero">
        <div className="quiz-player-hero-copy">
          <span className="eyebrow">Mode live</span>
          <h3>{title}</h3>
          <p>Une question à la fois, une progression lisible, une relecture finale avant l&apos;envoi.</p>
        </div>

        <div className="quiz-player-hero-metrics">
          <article>
            <strong>{answeredCount}/{orderedQuestions.length}</strong>
            <span>répondues</span>
          </article>
          <article>
            <strong>{remainingAttempts}</strong>
            <span>tentative(s) restante(s)</span>
          </article>
          <article>
            <strong>{passingScore ?? "—"}%</strong>
            <span>score cible</span>
          </article>
        </div>
      </section>

      <section className="quiz-player-progress">
        <div className="quiz-player-progress-meta">
          <span>{reviewMode ? "Relecture finale" : `Question ${Math.min(currentIndex + 1, orderedQuestions.length)} / ${orderedQuestions.length}`}</span>
          <span>{progressValue}% du parcours</span>
        </div>
        <div className="engagement-bar">
          <span style={{ width: `${progressValue}%` }} />
        </div>
      </section>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? (
        <p className="form-success">
          {state.success} {state.score ? `Score actuel : ${state.score}` : ""}
        </p>
      ) : null}

      <div className="quiz-player-stage">
        <aside className="quiz-player-sidebar panel">
          <div className="panel-header">
            <h3>Tableau de bord</h3>
            <p>Repère les questions déjà traitées et pilote ton rythme.</p>
          </div>

          <div className="quiz-player-chip-grid">
            {timeLeftSeconds !== null ? (
              <article className={`quiz-player-chip${timeLeftSeconds <= 30 ? " is-warning" : ""}`}>
                <strong>
                  {String(minutes ?? 0).padStart(2, "0")}:{String(seconds ?? 0).padStart(2, "0")}
                </strong>
                <span>temps restant</span>
              </article>
            ) : null}
            <article className="quiz-player-chip">
              <strong>{answeredCount}</strong>
              <span>réponse(s)</span>
            </article>
            <article className="quiz-player-chip">
              <strong>{orderedQuestions.reduce((total, question) => total + question.points, 0)}</strong>
              <span>points possibles</span>
            </article>
          </div>

          <div className="quiz-player-question-map">
            {orderedQuestions.map((question, index) => {
              const answered = Boolean(responses[question.id]?.trim());

              return (
                <button
                  className={`quiz-player-map-item${index === currentIndex && !reviewMode ? " is-active" : ""}${answered ? " is-answered" : ""}`}
                  key={question.id}
                  onClick={() => goToQuestion(index)}
                  type="button"
                >
                  <strong>Q{index + 1}</strong>
                  <span>{question.question_type === "single_choice" ? "Choix" : "Texte"}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel quiz-player-panel">
          {reviewMode ? (
            <>
              <div className="panel-header">
                <h3>Relecture avant envoi</h3>
                <p>Reviens sur une question si besoin, puis envoie la tentative complète.</p>
              </div>

              <div className="stack-list">
                {orderedQuestions.map((question, index) => {
                  const answer = responses[question.id]?.trim();
                  const answerLabel =
                    question.question_type === "single_choice"
                      ? [...(question.quiz_question_choices ?? [])]
                          .sort((left, right) => left.position - right.position)
                          .find((choice) => choice.id === answer)?.label ?? "Aucune réponse"
                      : answer || "Aucune réponse";

                  return (
                    <article className="quiz-review-card" key={question.id}>
                      <div>
                        <strong>Question {index + 1}</strong>
                        <p>{question.prompt}</p>
                        <small>{answerLabel}</small>
                      </div>

                      <button className="button button-secondary button-small" onClick={() => goToQuestion(index)} type="button">
                        Modifier
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="quiz-player-actions">
                <button className="button button-secondary" onClick={() => setReviewMode(false)} type="button">
                  Revenir aux questions
                </button>
                <button className="button" disabled={pending} type="submit">
                  {pending ? "Soumission..." : "Envoyer le quiz"}
                </button>
              </div>
            </>
          ) : activeQuestion ? (
            <>
              <div className="panel-header">
                <h3>{activeQuestion.prompt}</h3>
                <p>
                  {activeQuestion.helper_text || "Lis la question, réponds rapidement, puis passe à la suivante."}
                </p>
              </div>

              <div className="quiz-player-question-meta">
                <span>{activeQuestion.points} pt{activeQuestion.points > 1 ? "s" : ""}</span>
                <span>{activeQuestion.question_type === "single_choice" ? "Choix unique" : "Réponse ouverte"}</span>
              </div>

              {activeQuestion.question_type === "single_choice" ? (
                <div className="quiz-answer-grid">
                  {[...(activeQuestion.quiz_question_choices ?? [])]
                    .sort((left, right) => left.position - right.position)
                    .map((choice, index) => (
                      <button
                        className={`quiz-answer-card${responses[activeQuestion.id] === choice.id ? " is-selected" : ""}`}
                        key={choice.id}
                        onClick={() =>
                          setResponses((currentResponses) => ({
                            ...currentResponses,
                            [activeQuestion.id]: choice.id
                          }))
                        }
                        type="button"
                      >
                        <strong>{String.fromCharCode(65 + index)}</strong>
                        <span>{choice.label}</span>
                        <small>Touche {index + 1}</small>
                      </button>
                    ))}
                </div>
              ) : (
                <textarea
                  className="quiz-player-textarea"
                  onChange={(event) =>
                    setResponses((currentResponses) => ({
                      ...currentResponses,
                      [activeQuestion.id]: event.target.value
                    }))
                  }
                  placeholder="Rédige ta réponse ici..."
                  rows={8}
                  value={responses[activeQuestion.id] ?? ""}
                />
              )}

              <div className="quiz-player-actions">
                <button
                  className="button button-secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                  type="button"
                >
                  Précédente
                </button>

                {currentIndex < orderedQuestions.length - 1 ? (
                  <button
                    className="button"
                    onClick={() => setCurrentIndex((value) => Math.min(orderedQuestions.length - 1, value + 1))}
                    type="button"
                  >
                    Question suivante
                  </button>
                ) : (
                  <button className="button" onClick={() => setReviewMode(true)} type="button">
                    Passer à la relecture
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>Aucune question disponible.</strong>
              <p>Ce quiz n&apos;a pas encore été configuré.</p>
            </div>
          )}
        </section>
      </div>
    </form>
  );
}
