<script lang="ts">
	import type { ParsedCard, Rating, RatingName } from "../flashcards";
	import { RATING_LABELS } from "../flashcards";

	interface Props {
		deckName: string;
		mode: "review" | "cram";
		queue: ParsedCard[];
		getIntervals: (card: ParsedCard) => Record<RatingName, number>;
		onRate: (card: ParsedCard, rating: Rating) => Promise<void> | void;
	}

	let { deckName, mode, queue, getIntervals, onRate }: Props = $props();

	let index = $state(0);
	let showAnswer = $state(false);
	let busy = $state(false);

	// Cram mode state
	let cramQueue = $state<ParsedCard[]>([]);
	let cramAgainPile = $state<ParsedCard[]>([]);
	let cramRound = $state(1);
	let cramTotalCards = $state(0);

	// Initialize cram mode state
	$effect(() => {
		if (mode === "cram") {
			cramQueue = [...queue];
			cramTotalCards = queue.length;
		}
	});

	const ratings: Rating[] = [1, 2, 3, 4];
	const cramRatings: Rating[] = [1, 3]; // Only "Again" and "Good" for cram mode
	const ratingOrder: RatingName[] = ["again", "hard", "good", "easy"];

	let current = $derived(
		mode === "cram" ? (cramQueue[index] ?? null) : (queue[index] ?? null),
	);
	let done = $derived(
		mode === "cram"
			? index >= cramQueue.length && cramAgainPile.length === 0
			: index >= queue.length,
	);
	let intervals = $derived(current ? getIntervals(current) : null);

	// Progress for cram mode
	let cramProgress = $derived.by(() => {
		if (mode !== "cram") return null;
		const totalReviewed = cramTotalCards - cramQueue.length + index;
		const remaining = cramQueue.length - index + cramAgainPile.length;
		return { totalReviewed, remaining, round: cramRound };
	});

	function formatInterval(days: number | undefined) {
		if (!days || days <= 0) {
			return "now";
		}
		if (days === 1) {
			return "1d";
		}
		return `${days}d`;
	}

	function shuffleArray<T>(array: T[]): T[] {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
		}
		return shuffled;
	}

	async function handleRate(rating: Rating) {
		if (!current || busy) {
			return;
		}
		busy = true;
		try {
			if (mode === "cram") {
				// Cram mode: local state only
				if (rating === 1) {
					// "Again" - add to retry pile
					cramAgainPile.push(current);
				}
				// "Good" (rating 3) - card is done, don't add to pile

				index += 1;
				showAnswer = false;

				// If we finished this round and have cards to retry
				if (index >= cramQueue.length && cramAgainPile.length > 0) {
					cramQueue = shuffleArray([...cramAgainPile]);
					cramAgainPile = [];
					index = 0;
					cramRound += 1;
				}
			} else {
				// Review mode: save to file
				await onRate(current, rating);
				index += 1;
				showAnswer = false;
			}
		} finally {
			busy = false;
		}
	}
</script>

<div class="oboeru-modal">
	<div class="oboeru-modal-header">
		<div>
			<div class="oboeru-title">{deckName}</div>
			<div class="oboeru-subtitle">
				{mode === "cram" ? "Cram session" : "Review session"}
			</div>
		</div>
		<div class="oboeru-progress">
			{#if mode === "cram" && cramProgress}
				{#if done}
					Complete!
				{:else}
					Round {cramProgress.round} • {cramProgress.remaining} remaining
				{/if}
			{:else if queue.length > 0}
				{Math.min(index + 1, queue.length)} / {queue.length}
			{/if}
		</div>
	</div>

	{#if queue.length === 0}
		<div class="oboeru-empty">No cards due in this deck yet.</div>
	{:else if done}
		<div class="oboeru-empty">Session complete. Nice work.</div>
	{:else if current}
		<div class="oboeru-card">
			<div class="oboeru-question">{current.question}</div>
			{#if showAnswer}
				<div class="oboeru-answer">{current.answer}</div>
			{/if}
		</div>

		<div class="oboeru-controls">
			<button
				class="oboeru-button mod-cta"
				onclick={() => (showAnswer = !showAnswer)}
			>
				{showAnswer ? "Hide answer" : "Show answer"}
			</button>
		</div>

		<div class="oboeru-ratings">
			{#each mode === "cram" ? cramRatings : ratings as rating}
				{@const intervalName = ratingOrder[rating - 1]}
				<button
					class="oboeru-button"
					disabled={!showAnswer || busy}
					onclick={() => handleRate(rating)}
				>
					<div class="oboeru-rating-label">{RATING_LABELS[rating]}</div>
					{#if mode === "review" && intervals && intervalName}
						<div class="oboeru-rating-interval">
							{formatInterval(intervals[intervalName])}
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
