<script lang="ts">
	import type { TFile } from "obsidian";
	import type { DeckSummary } from "../flashcards";
	import { onMount } from "svelte";

	interface Props {
		loadDecks: () => Promise<DeckSummary[]>;
		openDeck: (file: TFile, mode: "review" | "cram") => void;
	}

	let { loadDecks, openDeck }: Props = $props();

	let decks = $state<DeckSummary[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function refresh() {
		loading = true;
		error = null;
		try {
			decks = await loadDecks();
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to load decks.";
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void refresh();
	});
</script>

<div class="oboeru-panel">
	<div class="oboeru-panel-header">
		<div>
			<div class="oboeru-title">Oboeru</div>
			<div class="oboeru-subtitle">Spaced repetition decks</div>
		</div>
		<button class="oboeru-button" onclick={refresh} disabled={loading}>Refresh</button
		>
	</div>

	{#if loading}
		<div class="oboeru-empty">Scanning your vault for flashcards…</div>
	{:else if error}
		<div class="oboeru-empty">{error}</div>
	{:else if decks.length === 0}
		<div class="oboeru-empty">No #flashcards tags found yet.</div>
	{:else}
		<div class="oboeru-deck-list">
			{#each decks as deck}
				<div class="oboeru-deck">
					<div class="oboeru-deck-head">
						<div>
							<div class="oboeru-deck-name">{deck.file.basename}</div>
							<div class="oboeru-deck-path">{deck.file.path}</div>
						</div>
						<div class="oboeru-deck-counts">
							<span class="oboeru-pill">Due {deck.due}</span>
							<span class="oboeru-pill">New {deck.newCount}</span>
							<span class="oboeru-pill">Total {deck.total}</span>
						</div>
					</div>
					<div class="oboeru-deck-actions">
						<button
							class="oboeru-button mod-cta"
							onclick={() => openDeck(deck.file, "review")}
							disabled={deck.total === 0}
						>
							Review
						</button>
						<button
							class="oboeru-button"
							onclick={() => openDeck(deck.file, "cram")}
							disabled={deck.total === 0}
						>
							Cram
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
