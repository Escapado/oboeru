import { Plugin, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_FLASHCARDS, FlashcardView } from './components/ItemView';
import { OboeruSettingsTab, type OboeruSettings, DEFAULT_SETTINGS } from './settings';
import { metadataEditorExtension } from './editor-extension';

export default class OboeruPlugin extends Plugin {
	settings: OboeruSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		// Register editor extension to hide FSRS metadata (if enabled)
		if (this.settings.hideMetadata) {
			this.registerEditorExtension(metadataEditorExtension);
		}

		this.registerView(VIEW_TYPE_FLASHCARDS, leaf => new FlashcardView(leaf));

		this.addRibbonIcon('dice', 'Oboeru', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-flashcards',
			name: 'Open flashcards',
			callback: () => {
				void this.activateView();
			}
		});

		this.addSettingTab(new OboeruSettingsTab(this.app, this));
	}

	async loadSettings() {
		const data = await this.loadData() as Partial<OboeruSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_FLASHCARDS);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0] ?? null;
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_FLASHCARDS, active: true });
		}
		if (leaf) {
			await workspace.revealLeaf(leaf);
		}
	}
}
