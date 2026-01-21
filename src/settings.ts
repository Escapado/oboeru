import { App, PluginSettingTab, Setting } from 'obsidian';
import type OboeruPlugin from './main';

export interface OboeruSettings {
	requestRetention: number;
	maximumInterval: number;
	dailyLimit: number;
	hideMetadata: boolean;
}

export const DEFAULT_SETTINGS: OboeruSettings = {
	requestRetention: 0.9,
	maximumInterval: 36500,
	dailyLimit: 20,
	hideMetadata: true
};

export class OboeruSettingsTab extends PluginSettingTab {
	plugin: OboeruPlugin;

	constructor(app: App, plugin: OboeruPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('FSRS algorithm')
			.setHeading();

		new Setting(containerEl)
			.setName('Request retention')
			.setDesc('Target retention rate for reviews (0.7-0.97). Higher values mean more frequent reviews but better retention.')
			.addSlider(slider => slider
				.setLimits(0.7, 0.97, 0.01)
				.setValue(this.plugin.settings.requestRetention)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.requestRetention = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Maximum interval')
			.setDesc('Maximum number of days between reviews. Default is 36500 (100 years).')
			.addText(text => text
				.setPlaceholder('36500')
				.setValue(String(this.plugin.settings.maximumInterval))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.maximumInterval = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Daily new card limit')
			.setDesc('Maximum number of new cards to review per day per deck.')
			.addText(text => text
				.setPlaceholder('20')
				.setValue(String(this.plugin.settings.dailyLimit))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.dailyLimit = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Editor')
			.setHeading();

		new Setting(containerEl)
			.setName('Hide FSRS metadata')
			.setDesc('Show a compact indicator (📊 SRS) instead of the full metadata comment. Click the indicator to toggle visibility.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideMetadata)
				.onChange(async (value) => {
					this.plugin.settings.hideMetadata = value;
					await this.plugin.saveSettings();
					// Reload is needed to apply editor extension changes
					this.plugin.app.workspace.trigger('parse-style-settings');
				}));

		new Setting(containerEl)
			.setName('About')
			.setHeading();

		containerEl.createEl('p', {
			text: 'This plugin uses the FSRS (Free Spaced Repetition Scheduler) algorithm, a modern alternative to the SuperMemo SM-2 algorithm. It uses machine learning to optimize review intervals based on your actual performance.'
		});

		const linkContainer = containerEl.createEl('p', {
			text: 'Learn more: '
		});
		linkContainer.createEl('a', {
			text: 'FSRS documentation',
			href: 'https://github.com/open-spaced-repetition/fsrs4anki'
		});
	}
}
