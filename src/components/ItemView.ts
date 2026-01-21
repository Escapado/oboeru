import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import FlashcardPanel from './FlashcardPanel.svelte';
import { listFlashcardDecks } from '../flashcards';
import { FlashcardReviewModal } from './ReviewModal';

export const VIEW_TYPE_FLASHCARDS = 'oboeru-flashcards';

export class FlashcardView extends ItemView {
  panel: ReturnType<typeof FlashcardPanel> | undefined;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_FLASHCARDS;
  }

  getDisplayText() {
    return 'Oboeru';
  }

  async onOpen() {
    this.panel = mount(FlashcardPanel, {
      target: this.contentEl,
      props: {
        loadDecks: () => listFlashcardDecks(this.app),
        openDeck: (file: TFile, mode: 'review' | 'cram') => {
          const modal = new FlashcardReviewModal(this.app, file, mode);
          modal.open();
        }
      }
    });
  }

  async onClose() {
    if (this.panel) {
      void unmount(this.panel);
      this.panel = undefined;
    }
  }
}
