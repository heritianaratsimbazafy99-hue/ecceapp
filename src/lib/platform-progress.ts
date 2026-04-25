import {
  getLearnerProgressLaneLabel,
  type BadgeTone,
  type LearnerProgressLane
} from "@/lib/platform-display";
import { formatDate, getDateValue } from "@/lib/platform-data-utils";

type SearchValue = string | null | undefined;

export type LearnerProgressEvent = {
  id: string;
  lane: LearnerProgressLane;
  laneLabel: string;
  title: string;
  description: string;
  occurredAt: string;
  occurredAtIso: string;
  tone: BadgeTone;
  href: string | null;
  ctaLabel: string | null;
  meta: string[];
  searchText: string;
};

export function buildLearnerProgressEvent({
  id,
  lane,
  title,
  description,
  occurredAtIso,
  tone,
  href,
  ctaLabel,
  meta = [],
  searchValues
}: {
  id: string;
  lane: LearnerProgressLane;
  title: string;
  description: string;
  occurredAtIso: string;
  tone: BadgeTone;
  href: string | null;
  ctaLabel: string | null;
  meta?: SearchValue[];
  searchValues?: SearchValue[];
}): LearnerProgressEvent {
  const metaValues = compactSearchValues(meta);

  return {
    id,
    lane,
    laneLabel: getLearnerProgressLaneLabel(lane),
    title,
    description,
    occurredAt: formatDate(occurredAtIso),
    occurredAtIso,
    tone,
    href,
    ctaLabel,
    meta: metaValues,
    searchText: buildLearnerProgressSearchText(searchValues ?? [title, description, ...metaValues])
  };
}

export function sortProgressItemsByRecency<T extends { occurredAtIso: string }>(items: T[]) {
  return [...items].sort(
    (left, right) => (getDateValue(right.occurredAtIso) ?? 0) - (getDateValue(left.occurredAtIso) ?? 0)
  );
}

function buildLearnerProgressSearchText(values: SearchValue[]) {
  return compactSearchValues(values).join(" ").toLowerCase();
}

function compactSearchValues(values: SearchValue[]) {
  return values.filter((value): value is string => Boolean(value));
}
