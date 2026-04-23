"use client";

import { useActionState, useEffect, useState } from "react";

import { createQuizAction, type AdminActionState } from "@/app/(platform)/admin/actions";
import { CelebrationBurst } from "@/components/feedback/celebration-burst";

type ContentOption = {
  id: string;
  label: string;
};

type ModuleOption = {
  id: string;
  label: string;
};

type QuestionType = "single_choice" | "text";

type DraftChoice = {
  id: string;
  label: string;
};

type DraftQuestion = {
  id: string;
  prompt: string;
  helperText: string;
  questionType: QuestionType;
  points: number;
  choices: DraftChoice[];
  correctChoiceId: string;
};

const initialState: AdminActionState = {};

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function createDraftChoice(label = ""): DraftChoice {
  return {
    id: createId(),
    label
  };
}

function createDraftQuestion(questionType: QuestionType = "single_choice"): DraftQuestion {
  const choices =
    questionType === "single_choice"
      ? [
          createDraftChoice("Réponse 1"),
          createDraftChoice("Réponse 2"),
          createDraftChoice("Réponse 3"),
          createDraftChoice("Réponse 4")
        ]
      : [];

  return {
    id: createId(),
    prompt: "",
    helperText: "",
    questionType,
    points: 1,
    choices,
    correctChoiceId: choices[0]?.id ?? ""
  };
}

function estimateDurationMinutes(questionCount: number) {
  return Math.max(3, Math.round(questionCount * 0.75));
}

function isQuestionReady(question: DraftQuestion) {
  if (!question.prompt.trim()) {
    return false;
  }

  if (question.questionType === "text") {
    return true;
  }

  const validChoices = question.choices.filter((choice) => choice.label.trim());
  return validChoices.length >= 2 && validChoices.some((choice) => choice.id === question.correctChoiceId);
}

export function QuizStudioComposer({
  contentOptions,
  moduleOptions
}: {
  contentOptions: ContentOption[];
  moduleOptions: ModuleOption[];
}) {
  const [state, formAction, pending] = useActionState(createQuizAction, initialState);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("quiz");
  const [status, setStatus] = useState("published");
  const [attemptsAllowed, setAttemptsAllowed] = useState("1");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("12");
  const [passingScore, setPassingScore] = useState("70");
  const [contentItemId, setContentItemId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [createDraftQuestion("single_choice")]);
  const [activeQuestionId, setActiveQuestionId] = useState<string>("");

  useEffect(() => {
    if (!activeQuestionId && questions[0]) {
      setActiveQuestionId(questions[0].id);
    }
  }, [activeQuestionId, questions]);

  const activeQuestion =
    questions.find((question) => question.id === activeQuestionId) ??
    questions[0] ??
    createDraftQuestion("single_choice");

  const readyQuestions = questions
    .filter(isQuestionReady)
    .map((question, index) => ({
      prompt: question.prompt.trim(),
      helper_text: question.helperText.trim() || null,
      question_type: question.questionType,
      points: Math.max(1, Number(question.points) || 1),
      position: index,
      choices:
        question.questionType === "single_choice"
          ? question.choices
              .filter((choice) => choice.label.trim())
              .map((choice) => ({
                label: choice.label.trim(),
                is_correct: choice.id === question.correctChoiceId
              }))
          : []
    }));

  const totalPoints = readyQuestions.reduce((total, question) => total + question.points, 0);
  const estimatedDuration = estimateDurationMinutes(readyQuestions.length || questions.length);
  const completionRate = questions.length ? Math.round((readyQuestions.length / questions.length) * 100) : 0;

  const updateQuestion = (questionId: string, updater: (question: DraftQuestion) => DraftQuestion) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) => (question.id === questionId ? updater(question) : question))
    );
  };

  const addQuestion = (questionType: QuestionType) => {
    const nextQuestion = createDraftQuestion(questionType);
    setQuestions((currentQuestions) => [...currentQuestions, nextQuestion]);
    setActiveQuestionId(nextQuestion.id);
  };

  const duplicateQuestion = (questionId: string) => {
    const sourceQuestion = questions.find((question) => question.id === questionId);

    if (!sourceQuestion) {
      return;
    }

    const duplicatedQuestion: DraftQuestion = {
      ...sourceQuestion,
      id: createId(),
      choices: sourceQuestion.choices.map((choice) => ({
        ...choice,
        id: createId()
      }))
    };
    const originalCorrectIndex = sourceQuestion.choices.findIndex((choice) => choice.id === sourceQuestion.correctChoiceId);

    if (duplicatedQuestion.questionType === "single_choice") {
      duplicatedQuestion.correctChoiceId = duplicatedQuestion.choices[originalCorrectIndex]?.id ?? duplicatedQuestion.choices[0]?.id ?? "";
    }

    setQuestions((currentQuestions) => {
      const sourceIndex = currentQuestions.findIndex((question) => question.id === questionId);
      const nextQuestions = [...currentQuestions];
      nextQuestions.splice(sourceIndex + 1, 0, duplicatedQuestion);
      return nextQuestions;
    });
    setActiveQuestionId(duplicatedQuestion.id);
  };

  const moveQuestion = (questionId: string, direction: -1 | 1) => {
    setQuestions((currentQuestions) => {
      const sourceIndex = currentQuestions.findIndex((question) => question.id === questionId);

      if (sourceIndex < 0) {
        return currentQuestions;
      }

      const targetIndex = sourceIndex + direction;

      if (targetIndex < 0 || targetIndex >= currentQuestions.length) {
        return currentQuestions;
      }

      const nextQuestions = [...currentQuestions];
      const [question] = nextQuestions.splice(sourceIndex, 1);
      nextQuestions.splice(targetIndex, 0, question);
      return nextQuestions;
    });
  };

  const removeQuestion = (questionId: string) => {
    setQuestions((currentQuestions) => {
      if (currentQuestions.length === 1) {
        const resetQuestion = createDraftQuestion("single_choice");
        setActiveQuestionId(resetQuestion.id);
        return [resetQuestion];
      }

      const nextQuestions = currentQuestions.filter((question) => question.id !== questionId);
      const nextActiveQuestion = nextQuestions[0];

      if (activeQuestionId === questionId && nextActiveQuestion) {
        setActiveQuestionId(nextActiveQuestion.id);
      }

      return nextQuestions;
    });
  };

  const updateChoiceLabel = (questionId: string, choiceId: string, label: string) => {
    updateQuestion(questionId, (question) => ({
      ...question,
      choices: question.choices.map((choice) => (choice.id === choiceId ? { ...choice, label } : choice))
    }));
  };

  const addChoice = (questionId: string) => {
    updateQuestion(questionId, (question) => {
      if (question.questionType !== "single_choice" || question.choices.length >= 6) {
        return question;
      }

      return {
        ...question,
        choices: [...question.choices, createDraftChoice(`Réponse ${question.choices.length + 1}`)]
      };
    });
  };

  const removeChoice = (questionId: string, choiceId: string) => {
    updateQuestion(questionId, (question) => {
      if (question.questionType !== "single_choice" || question.choices.length <= 2) {
        return question;
      }

      const nextChoices = question.choices.filter((choice) => choice.id !== choiceId);

      return {
        ...question,
        choices: nextChoices,
        correctChoiceId:
          question.correctChoiceId === choiceId ? nextChoices[0]?.id ?? "" : question.correctChoiceId
      };
    });
  };

  const questionPayload = JSON.stringify(readyQuestions);

  return (
    <form action={formAction} className="quiz-studio-shell admin-form">
      <CelebrationBurst
        active={Boolean(state.success)}
        body="Le quiz est publié dans le studio ECCE avec son lot de questions prêtes à être jouées."
        title="Quiz studio créé"
        triggerKey={state.success}
      />

      <input name="title" type="hidden" value={title} />
      <input name="description" type="hidden" value={description} />
      <input name="kind" type="hidden" value={kind} />
      <input name="status" type="hidden" value={status} />
      <input name="attempts_allowed" type="hidden" value={attemptsAllowed} />
      <input name="time_limit_minutes" type="hidden" value={timeLimitMinutes} />
      <input name="passing_score" type="hidden" value={passingScore} />
      <input name="content_item_id" type="hidden" value={contentItemId} />
      <input name="module_id" type="hidden" value={moduleId} />
      <input name="randomize_questions" type="hidden" value={randomizeQuestions ? "true" : "false"} />
      <input name="questions_payload" type="hidden" value={questionPayload} />

      <div className="quiz-studio-main">
        <section className="panel panel-highlight quiz-studio-hero">
          <div className="quiz-studio-hero-copy">
            <span className="eyebrow">Quiz Studio</span>
            <h3>Construire un quiz comme une expérience, pas comme un simple formulaire</h3>
            <p>
              Cadre le quiz, compose les questions, affine le rythme et laisse le preview
              t&apos;aider à sentir le rendu final côté coaché.
            </p>
          </div>

          <div className="quiz-studio-hero-metrics">
            <article>
              <strong>{questions.length}</strong>
              <span>brouillon(s)</span>
            </article>
            <article>
              <strong>{readyQuestions.length}</strong>
              <span>question(s) prêtes</span>
            </article>
            <article>
              <strong>{totalPoints}</strong>
              <span>points au total</span>
            </article>
          </div>
        </section>

        <section className="panel quiz-briefing-panel">
          <div className="panel-header">
            <h3>Cadrage pédagogique</h3>
            <p>Pose l&apos;intention du quiz, le niveau d&apos;exigence et son lien éventuel avec une ressource.</p>
          </div>

          <div className="quiz-briefing-layout">
            <article className="quiz-briefing-card quiz-briefing-card-primary">
              <div className="quiz-briefing-card-head">
                <span className="eyebrow">Identité</span>
                <strong>Donne une personnalité claire au quiz</strong>
                <p>Le titre et la description doivent déjà faire sentir le ton, le niveau et le bénéfice.</p>
              </div>

              <div className="quiz-studio-grid">
                <label className="form-grid-span">
                  Titre du quiz
                  <input
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Quiz - Cadre de séance"
                    type="text"
                    value={title}
                  />
                </label>
                <label className="form-grid-span">
                  Description
                  <textarea
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Explique l'objectif pédagogique, l'énergie attendue et le niveau de difficulté."
                    rows={4}
                    value={description}
                  />
                </label>
                <label className="form-grid-span">
                  Ressource liée
                  <select onChange={(event) => setContentItemId(event.target.value)} value={contentItemId}>
                    <option value="">Aucun contenu rattaché</option>
                    {contentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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

            <div className="quiz-briefing-stack">
              <article className="quiz-briefing-card">
                <div className="quiz-briefing-card-head">
                  <span className="eyebrow">Règles</span>
                  <strong>Cadre de jeu</strong>
                </div>

                <div className="quiz-studio-grid">
                  <label>
                    Type
                    <select onChange={(event) => setKind(event.target.value)} value={kind}>
                      <option value="qcm">qcm</option>
                      <option value="quiz">quiz</option>
                      <option value="assessment">assessment</option>
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
                    Tentatives autorisées
                    <input min="1" onChange={(event) => setAttemptsAllowed(event.target.value)} type="number" value={attemptsAllowed} />
                  </label>
                  <label>
                    Temps limite (minutes)
                    <input min="0" onChange={(event) => setTimeLimitMinutes(event.target.value)} type="number" value={timeLimitMinutes} />
                  </label>
                  <label className="form-grid-span">
                    Score cible
                    <input min="0" onChange={(event) => setPassingScore(event.target.value)} step="0.01" type="number" value={passingScore} />
                  </label>
                </div>
              </article>

              <article className="quiz-briefing-card quiz-briefing-card-soft">
                <div className="quiz-briefing-card-head">
                  <span className="eyebrow">Expérience</span>
                  <strong>Rythme du passage</strong>
                </div>

                <label className="quiz-studio-toggle">
                  <input
                    checked={randomizeQuestions}
                    onChange={(event) => setRandomizeQuestions(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Mélanger les questions pendant le passage
                    <small>Pratique pour les évaluations ou les tentatives répétées.</small>
                  </span>
                </label>
              </article>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Storyboard des questions</h3>
            <p>Compose le rythme du quiz question par question, comme une scène live.</p>
          </div>

          <div className="quiz-studio-toolbar">
            <button className="button button-secondary" onClick={() => addQuestion("single_choice")} type="button">
              + Question à choix
            </button>
            <button className="button button-secondary" onClick={() => addQuestion("text")} type="button">
              + Question ouverte
            </button>
            <span>{completionRate}% du storyboard est prêt à publier.</span>
          </div>

          <div className="quiz-question-rail">
            {questions.map((question, index) => {
              const ready = isQuestionReady(question);

              return (
                <button
                  className={`quiz-question-pill${question.id === activeQuestion.id ? " is-active" : ""}${ready ? " is-ready" : ""}`}
                  key={question.id}
                  onClick={() => setActiveQuestionId(question.id)}
                  type="button"
                >
                  <strong>Q{index + 1}</strong>
                  <span>{question.questionType === "single_choice" ? "Choix" : "Texte"}</span>
                </button>
              );
            })}
          </div>

          <div className="quiz-builder-card">
            <div className="quiz-builder-card-head">
              <div>
                <strong>{activeQuestion.questionType === "single_choice" ? "Question à choix" : "Question ouverte"}</strong>
                <p>Travaille le wording, le rythme et la clarté avant publication.</p>
              </div>

              <div className="table-actions">
                <button className="button button-secondary button-small" onClick={() => moveQuestion(activeQuestion.id, -1)} type="button">
                  Monter
                </button>
                <button className="button button-secondary button-small" onClick={() => moveQuestion(activeQuestion.id, 1)} type="button">
                  Descendre
                </button>
                <button className="button button-secondary button-small" onClick={() => duplicateQuestion(activeQuestion.id)} type="button">
                  Dupliquer
                </button>
                <button className="button button-secondary button-small" onClick={() => removeQuestion(activeQuestion.id)} type="button">
                  Retirer
                </button>
              </div>
            </div>

            <div className="quiz-studio-grid">
              <label className="form-grid-span">
                Intitulé
                <textarea
                  onChange={(event) =>
                    updateQuestion(activeQuestion.id, (question) => ({
                      ...question,
                      prompt: event.target.value
                    }))
                  }
                  placeholder="Formule la question comme si elle devait être lue à voix haute dans une salle."
                  rows={4}
                  value={activeQuestion.prompt}
                />
              </label>
              <label className="form-grid-span">
                Aide / nuance
                <input
                  onChange={(event) =>
                    updateQuestion(activeQuestion.id, (question) => ({
                      ...question,
                      helperText: event.target.value
                    }))
                  }
                  placeholder="Indice, précision ou règle de réponse."
                  type="text"
                  value={activeQuestion.helperText}
                />
              </label>
              <label>
                Format
                <select
                  onChange={(event) =>
                    updateQuestion(activeQuestion.id, (question) => {
                      const nextType = event.target.value as QuestionType;
                      const nextChoices =
                        nextType === "single_choice"
                          ? question.choices.length
                            ? question.choices
                            : [createDraftChoice("Réponse 1"), createDraftChoice("Réponse 2")]
                          : [];

                      return {
                        ...question,
                        questionType: nextType,
                        choices: nextChoices,
                        correctChoiceId: nextChoices[0]?.id ?? ""
                      };
                    })
                  }
                  value={activeQuestion.questionType}
                >
                  <option value="single_choice">Choix unique</option>
                  <option value="text">Réponse ouverte</option>
                </select>
              </label>
              <label>
                Points
                <input
                  min="1"
                  onChange={(event) =>
                    updateQuestion(activeQuestion.id, (question) => ({
                      ...question,
                      points: Math.max(1, Number(event.target.value) || 1)
                    }))
                  }
                  type="number"
                  value={activeQuestion.points}
                />
              </label>
            </div>

            {activeQuestion.questionType === "single_choice" ? (
              <div className="quiz-choice-editor">
                <div className="quiz-choice-editor-head">
                  <div>
                    <strong>Réponses</strong>
                    <p className="quiz-choice-editor-note">
                      Clique sur A, B, C ou D pour définir la bonne réponse.
                    </p>
                  </div>
                  <button className="button button-secondary button-small" onClick={() => addChoice(activeQuestion.id)} type="button">
                    Ajouter un choix
                  </button>
                </div>

                <div className="stack-list">
                  {activeQuestion.choices.map((choice, index) => (
                    <div className="quiz-choice-row" key={choice.id}>
                      <button
                        aria-label={`Définir ${String.fromCharCode(65 + index)} comme bonne réponse`}
                        aria-pressed={activeQuestion.correctChoiceId === choice.id}
                        className={`quiz-correct-toggle${activeQuestion.correctChoiceId === choice.id ? " is-active" : ""}`}
                        onClick={() =>
                          updateQuestion(activeQuestion.id, (question) => ({
                            ...question,
                            correctChoiceId: choice.id
                          }))
                        }
                        title="Cliquer pour définir la bonne réponse"
                        type="button"
                      >
                        {String.fromCharCode(65 + index)}
                      </button>
                      <input
                        onChange={(event) => updateChoiceLabel(activeQuestion.id, choice.id, event.target.value)}
                        type="text"
                        value={choice.label}
                      />
                      <button
                        className="button button-secondary button-small"
                        onClick={() => removeChoice(activeQuestion.id, choice.id)}
                        type="button"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="quiz-open-answer-note">
                <strong>Correction coach</strong>
                <p>
                  Les réponses ouvertes seront envoyées en correction manuelle. Garde une consigne très claire
                  et précise pour obtenir des réponses exploitables.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="panel panel-subtle">
          <div className="panel-header">
            <h3>Prêt à publier</h3>
            <p>Le studio enverra uniquement les questions complètes. Les brouillons incomplets restent en local.</p>
          </div>

          <div className="quiz-studio-checklist">
            <div>
              <strong>{readyQuestions.length}</strong>
              <span>question(s) valides</span>
            </div>
            <div>
              <strong>{questions.length - readyQuestions.length}</strong>
              <span>brouillon(s) incomplets</span>
            </div>
            <div>
              <strong>{estimatedDuration} min</strong>
              <span>durée estimée</span>
            </div>
          </div>

          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}

          <button className="button" disabled={pending || !title.trim()} type="submit">
            {pending ? "Création du studio..." : "Créer le quiz"}
          </button>
        </section>
      </div>

      <aside className="quiz-studio-preview">
        <section className="panel panel-accent">
          <div className="panel-header">
            <h3>Aperçu live</h3>
            <p>Visualise immédiatement le rendu côté coaché pendant la construction.</p>
          </div>

          <div className="quiz-preview-stage">
            <div className="quiz-preview-head">
              <span className="eyebrow">Expérience apprenant</span>
              <strong>{title.trim() || "Titre du quiz"}</strong>
              <p>{description.trim() || "Ajoute une description claire pour donner le ton du quiz."}</p>
            </div>

            <div className="quiz-preview-progress">
              <span>{readyQuestions.length || 1} question(s)</span>
              <span>{estimatedDuration} min estimées</span>
            </div>

            <article className="quiz-preview-card">
              <small>
                Aperçu question active · {activeQuestion.points} pt{activeQuestion.points > 1 ? "s" : ""}
              </small>
              <h4>{activeQuestion.prompt.trim() || "Ta question apparaîtra ici dès que tu commenceras à l'écrire."}</h4>
              <p>{activeQuestion.helperText.trim() || "La consigne ou l'indice s'affichera ici pour guider la réponse."}</p>

              {activeQuestion.questionType === "single_choice" ? (
                <div className="quiz-preview-choices">
                  {activeQuestion.choices.map((choice, index) => (
                    <article
                      className={`quiz-preview-choice${activeQuestion.correctChoiceId === choice.id ? " is-correct" : ""}`}
                      key={choice.id}
                    >
                      <strong>{String.fromCharCode(65 + index)}</strong>
                      <span>{choice.label.trim() || `Réponse ${index + 1}`}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="quiz-preview-open">
                  <span>Zone de réponse ouverte</span>
                  <p>Le coaché rédigera ici sa réponse, puis elle passera en correction coach.</p>
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Signal de qualité</h3>
            <p>Checklist rapide inspirée des studios de quiz les plus fluides.</p>
          </div>

          <div className="quiz-quality-list">
            <article>
              <strong>Clarté</strong>
              <p>Une question = une seule idée, sans surcharge ni ambiguïté.</p>
            </article>
            <article>
              <strong>Rythme</strong>
              <p>Alterne questions courtes et questions réflexives pour éviter la fatigue.</p>
            </article>
            <article>
              <strong>Feedback</strong>
              <p>Utilise les aides et le score cible pour créer une sensation de progression.</p>
            </article>
          </div>
        </section>
      </aside>
    </form>
  );
}
