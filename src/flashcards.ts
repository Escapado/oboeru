import { App, TFile } from 'obsidian';

export type Rating = 1 | 2 | 3 | 4;
export type RatingName = 'again' | 'hard' | 'good' | 'easy';

export const RATING_NAMES: Record<Rating, RatingName> = {
  1: 'again',
  2: 'hard',
  3: 'good',
  4: 'easy'
};

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy'
};

const DEFAULT_W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542
];

const REQUEST_RETENTION = 0.9;
const MAXIMUM_INTERVAL = 36500;
const DAILY_LIMIT = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DECAY = -(DEFAULT_W[20] ?? 0.0658);
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

const METADATA_PREFIX = '<!--OBOERU:';
const METADATA_SUFFIX = '-->';

export interface CardMeta {
  v: 1;
  algo: 'fsrs-6';
  reviewedAt: string;
  dueAt: string;
  s: number;
  d: number;
  rating: Rating;
  reviews: number;
  lapses: number;
}

interface CardMetaInput {
  v: number;
  algo: string;
  reviewedAt: string;
  dueAt: string;
  s: number;
  d: number;
  rating: Rating;
  reviews: number;
  lapses: number;
}

export interface ParsedCard {
  order: number;
  format: 'single' | 'multi';
  question: string;
  answer: string;
  questionLine: number;
  metaLine: number | null;
  metadata: CardMeta | null;
}

export interface DeckSummary {
  file: TFile;
  total: number;
  due: number;
  newCount: number;
}

interface CardState {
  s: number;
  d: number;
  lastReviewMs: number;
  reviews: number;
  lapses: number;
}

export async function listFlashcardDecks(app: App): Promise<DeckSummary[]> {
  const files = app.vault.getMarkdownFiles();
  const decks: DeckSummary[] = [];

  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    const hasTag = cache?.tags?.some(tag => tag.tag.startsWith('#flashcards')) ?? false;
    if (!hasTag) {
      continue;
    }

    const cards = await loadFlashcards(app, file);
    const counts = countDeck(cards);

    decks.push({
      file,
      total: cards.length,
      due: counts.due,
      newCount: counts.newCount
    });
  }

  return decks.sort((a, b) => a.file.basename.localeCompare(b.file.basename));
}

export async function loadFlashcards(app: App, file: TFile): Promise<ParsedCard[]> {
  const content = await app.vault.read(file);
  return parseFlashcards(content);
}

export function buildReviewQueue(cards: ParsedCard[], mode: 'review' | 'cram'): ParsedCard[] {
  if (mode === 'cram') {
    return shuffleArray([...cards]);
  }

  const now = Date.now();
  const dueCards: ParsedCard[] = [];
  const newCards: ParsedCard[] = [];

  for (const card of cards) {
    const meta = normalizeMetadata(card.metadata);
    if (!meta) {
      newCards.push(card);
      continue;
    }
    const dueMs = Date.parse(meta.dueAt);
    if (Number.isNaN(dueMs) || dueMs <= now) {
      dueCards.push(card);
    }
  }

  dueCards.sort((a, b) => {
    const aDue = a.metadata?.dueAt ? Date.parse(a.metadata.dueAt) : 0;
    const bDue = b.metadata?.dueAt ? Date.parse(b.metadata.dueAt) : 0;
    return aDue - bDue;
  });

  const queue = [...dueCards];
  if (queue.length < DAILY_LIMIT) {
    queue.push(...newCards.slice(0, DAILY_LIMIT - queue.length));
  }

  return shuffleArray(queue);
}

export function getRatingPreviews(card: ParsedCard, now: Date): Record<RatingName, number> {
  const state = metaToState(card.metadata);
  const previews: Record<RatingName, number> = {
    again: 1,
    hard: 1,
    good: 1,
    easy: 1
  };

  (Object.keys(RATING_NAMES) as Array<`${Rating}`>).forEach(key => {
    const rating = Number(key) as Rating;
    const next = computeNext(state, rating, now);
    previews[RATING_NAMES[rating]] = next.intervalDays;
  });

  return previews;
}

export async function applyRating(
  app: App,
  file: TFile,
  cardOrder: number,
  rating: Rating,
  now: Date
): Promise<CardMeta | null> {
  const content = await app.vault.read(file);
  const cards = parseFlashcards(content);
  const card = cards.find(item => item.order === cardOrder);
  if (!card) {
    return null;
  }

  const state = metaToState(card.metadata);
  const result = computeNext(state, rating, now);
  const nextMeta = result.meta;

  const lines = content.split(/\r?\n/);
  const metadataLine = serializeMetadata(nextMeta);

  if (card.metaLine !== null && card.metaLine < lines.length) {
    lines[card.metaLine] = metadataLine;
  } else {
    // Insert metadata after the question line
    const insertIndex = card.questionLine + 1;
    lines.splice(insertIndex, 0, metadataLine);
  }

  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  await app.vault.modify(file, lines.join(newline));

  return nextMeta;
}

export function parseFlashcards(content: string): ParsedCard[] {
  const lines = content.split(/\r?\n/);
  const cards: ParsedCard[] = [];
  let order = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isMetadataLine(line) || !line) {
      continue;
    }

    const colonIndex = line.indexOf('::');
    if (colonIndex !== -1) {
      const question = line.slice(0, colonIndex).trim();
      const answer = line.slice(colonIndex + 2).trim();
      if (question && answer) {
        const metaLine = isMetadataLine(lines[i + 1]) ? i + 1 : null;
        const metadata = metaLine !== null && lines[metaLine] !== undefined ? parseMetadataLine(lines[metaLine]) : null;
        cards.push({
          order,
          format: 'single',
          question,
          answer,
          questionLine: i,
          metaLine,
          metadata
        });
        order += 1;
        continue;
      }
    }

    if (!line.trim()) {
      continue;
    }

    let metaLine: number | null = null;
    let markerIndex = i + 1;
    if (isMetadataLine(lines[markerIndex])) {
      metaLine = markerIndex;
      markerIndex += 1;
    }

    if (lines[markerIndex]?.trim() === '?') {
      const answerStart = markerIndex + 1;
      let endIndex = answerStart;
      while (endIndex < lines.length && lines[endIndex]?.trim() !== '+++') {
        endIndex += 1;
      }
      if (endIndex < lines.length && lines[endIndex]?.trim() === '+++') {
        const answer = lines.slice(answerStart, endIndex).join('\n').trim();
        const metadataLineText = metaLine !== null ? lines[metaLine] : undefined;
        const metadata = metadataLineText !== undefined ? parseMetadataLine(metadataLineText) : null;
        cards.push({
          order,
          format: 'multi',
          question: line.trim(),
          answer,
          questionLine: i,
          metaLine,
          metadata
        });
        order += 1;
        i = endIndex;
      }
    }
  }

  return cards;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

function countDeck(cards: ParsedCard[]) {
  let due = 0;
  let newCount = 0;
  const now = Date.now();

  for (const card of cards) {
    const meta = normalizeMetadata(card.metadata);
    if (!meta) {
      newCount += 1;
      continue;
    }
    const dueMs = Date.parse(meta.dueAt);
    if (Number.isNaN(dueMs) || dueMs <= now) {
      due += 1;
    }
  }

  return { due, newCount };
}

function normalizeMetadata(meta: CardMeta | null): CardMeta | null {
  if (!meta) {
    return null;
  }
  if (!meta.reviewedAt || !meta.dueAt) {
    return null;
  }
  if (!Number.isFinite(meta.s) || !Number.isFinite(meta.d)) {
    return null;
  }
  return meta;
}

function parseMetadataLine(line: string): CardMeta | null {
  if (!isMetadataLine(line)) {
    return null;
  }
  const trimmed = line.trim();
  const payload = trimmed.slice(METADATA_PREFIX.length, -METADATA_SUFFIX.length).trim();
  try {
    const parsed = JSON.parse(payload) as CardMetaInput;
    // Validate the parsed object has expected structure
    if (parsed.v !== 1 || parsed.algo !== 'fsrs-6') {
      return null;
    }
    return parsed as CardMeta;
  } catch {
    return null;
  }
}

function serializeMetadata(meta: CardMeta | CardMetaInput): string {
  return `${METADATA_PREFIX}${JSON.stringify(meta)}${METADATA_SUFFIX}`;
}

function isMetadataLine(line: string | undefined): boolean {
  if (!line) {
    return false;
  }
  const trimmed = line.trim();
  return trimmed.startsWith(METADATA_PREFIX) && trimmed.endsWith(METADATA_SUFFIX);
}

function metaToState(meta: CardMeta | null): CardState | null {
  const normalized = normalizeMetadata(meta);
  if (!normalized) {
    return null;
  }
  const lastReviewMs = Date.parse(normalized.reviewedAt);
  if (Number.isNaN(lastReviewMs)) {
    return null;
  }
  return {
    s: normalized.s,
    d: normalized.d,
    lastReviewMs,
    reviews: normalized.reviews ?? 0,
    lapses: normalized.lapses ?? 0
  };
}

function computeNext(state: CardState | null, rating: Rating, now: Date): {
  intervalDays: number;
  meta: CardMeta;
} {
  const ratingName = RATING_NAMES[rating];
  let s: number;
  let d: number;

  if (!state) {
    d = initDifficulty(rating);
    s = initStability(rating);
  } else {
    const elapsedDays = Math.max(0, (now.getTime() - state.lastReviewMs) / MS_PER_DAY);
    d = nextDifficulty(state.d, rating);

    if (elapsedDays < 1) {
      s = nextShortTermStability(state.s, rating);
    } else {
      const retrievability = forgettingCurve(elapsedDays, state.s);
      if (rating === 1) {
        s = nextForgetStability(state.d, state.s, retrievability);
      } else {
        s = nextRecallStability(state.d, state.s, retrievability, ratingName);
      }
    }
  }

  const intervalDays = nextInterval(s);
  const dueAt = new Date(now.getTime() + intervalDays * MS_PER_DAY).toISOString();

  return {
    intervalDays,
    meta: {
      v: 1 as const,
      algo: 'fsrs-6' as const,
      reviewedAt: now.toISOString(),
      dueAt,
      s,
      d,
      rating,
      reviews: (state?.reviews ?? 0) + 1,
      lapses: (state?.lapses ?? 0) + (rating === 1 ? 1 : 0)
    }
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function forgettingCurve(elapsedDays: number, stability: number): number {
  return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);
}

function nextInterval(stability: number): number {
  const rawInterval = stability / FACTOR * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return clamp(Math.round(rawInterval), 1, MAXIMUM_INTERVAL);
}

function initDifficulty(rating: Rating): number {
  const w4 = DEFAULT_W[4] ?? 6.4133;
  const w5 = DEFAULT_W[5] ?? 0.8334;
  const value = w4 - Math.exp(w5 * (rating - 1)) + 1;
  return round2(clamp(value, 1, 10));
}

function initStability(rating: Rating): number {
  const w = DEFAULT_W[rating - 1];
  if (w === undefined) {
    return 0.1;
  }
  return round2(Math.max(w, 0.1));
}

function linearDamping(delta: number, current: number): number {
  return delta * (10 - current) / 9;
}

function meanReversion(init: number, current: number): number {
  const w7 = DEFAULT_W[7] ?? 0.001;
  return w7 * init + (1 - w7) * current;
}

function nextDifficulty(current: number, rating: Rating): number {
  const w6 = DEFAULT_W[6] ?? 0.8334;
  const delta = -w6 * (rating - 3);
  const next = current + linearDamping(delta, current);
  const reverted = meanReversion(initDifficulty(4), next);
  return round2(clamp(reverted, 1, 10));
}

function nextRecallStability(d: number, s: number, r: number, rating: RatingName): number {
  const w8 = DEFAULT_W[8] ?? 0;
  const w9 = DEFAULT_W[9] ?? 0;
  const w10 = DEFAULT_W[10] ?? 0;
  const w15 = DEFAULT_W[15] ?? 1;
  const w16 = DEFAULT_W[16] ?? 1;
  const hardPenalty = rating === 'hard' ? w15 : 1;
  const easyBonus = rating === 'easy' ? w16 : 1;
  const result = s * (1 + Math.exp(w8) * (11 - d) * Math.pow(s, -w9) *
    (Math.exp((1 - r) * w10) - 1) * hardPenalty * easyBonus);
  return round2(result);
}

function nextForgetStability(d: number, s: number, r: number): number {
  const w11 = DEFAULT_W[11] ?? 1;
  const w12 = DEFAULT_W[12] ?? 0;
  const w13 = DEFAULT_W[13] ?? 0;
  const w14 = DEFAULT_W[14] ?? 0;
  const w17 = DEFAULT_W[17] ?? 0;
  const w18 = DEFAULT_W[18] ?? 0;
  const sMin = s / Math.exp(w17 * w18);
  const result = w11 * Math.pow(d, -w12) *
    (Math.pow(s + 1, w13) - 1) * Math.exp((1 - r) * w14);
  return round2(Math.min(result, sMin));
}

function nextShortTermStability(s: number, rating: Rating): number {
  const w17 = DEFAULT_W[17] ?? 1.8729;
  const w18 = DEFAULT_W[18] ?? 0.5425;
  const w19 = DEFAULT_W[19] ?? 0.0912;
  let sinc = Math.exp(w17 * (rating - 3 + w18)) * Math.pow(s, -w19);
  if (rating >= 3) {
    sinc = Math.max(sinc, 1);
  }
  return round2(s * sinc);
}
