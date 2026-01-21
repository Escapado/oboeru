import { App, Modal, TFile } from 'obsidian';
import { mount, unmount } from 'svelte';
import FlashcardModal from './FlashcardModal.svelte';
import { applyRating, buildReviewQueue, getRatingPreviews, loadFlashcards } from '../flashcards';
import type { ParsedCard, Rating } from '../flashcards';

export class FlashcardReviewModal extends Modal {
  component: ReturnType<typeof FlashcardModal> | undefined;
  file: TFile;
  mode: 'review' | 'cram';

  constructor(app: App, file: TFile, mode: 'review' | 'cram') {
    super(app);
    this.file = file;
    this.mode = mode;
  }

  async onOpen() {
    this.contentEl.addClass('oboeru-modal-container');
    this.contentEl.setText('Loading flashcards...');

    const cards = await loadFlashcards(this.app, this.file);
    const queue = buildReviewQueue(cards, this.mode);

    this.contentEl.empty();

    this.component = mount(FlashcardModal, {
      target: this.contentEl,
      props: {
        deckName: this.file.basename,
        mode: this.mode,
        queue,
        getIntervals: (card: ParsedCard) => getRatingPreviews(card, new Date()),
        onRate: (card: ParsedCard, rating: Rating) => {
          if (this.mode === 'cram') {
            return;
		  }
			applyRating(this.app, this.file, card.order, rating, new Date());
			return;
        }
      }
    });
  }

  onClose() {
    if (this.component) {
	  void unmount(this.component);
      this.component = undefined;
    }
  }
}
