import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { RangeSetBuilder, StateField, StateEffect } from '@codemirror/state';

const METADATA_PREFIX = '<!--OBOERU:';
const METADATA_SUFFIX = '-->';

// State effect to toggle metadata visibility
const toggleMetadataEffect = StateEffect.define<{ from: number; to: number }>();

// State field to track which metadata blocks are expanded
const metadataExpandedState = StateField.define<Set<number>>({
	create() {
		return new Set();
	},
	update(expanded, tr) {
		const newExpanded = new Set(expanded);
		for (const effect of tr.effects) {
			if (effect.is(toggleMetadataEffect)) {
				const lineNum = tr.state.doc.lineAt(effect.value.from).number;
				if (newExpanded.has(lineNum)) {
					newExpanded.delete(lineNum);
				} else {
					newExpanded.add(lineNum);
				}
			}
		}
		return newExpanded;
	},
});

class MetadataWidget extends WidgetType {
	constructor(
		private readonly from: number,
		private readonly to: number,
		private readonly metadata: string,
	) {
		super();
	}

	toDOM(view: EditorView): HTMLElement {
		const container = document.createElement('span');
		container.className = 'oboeru-metadata-widget';

		const indicator = document.createElement('span');
		indicator.className = 'oboeru-metadata-indicator';
		indicator.textContent = '📊 SRS';
		indicator.title = 'Click to show/hide FSRS metadata';

		indicator.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			view.dispatch({
				effects: toggleMetadataEffect.of({ from: this.from, to: this.to }),
			});
		});

		container.appendChild(indicator);
		return container;
	}

	eq(other: MetadataWidget): boolean {
		return this.from === other.from && this.to === other.to;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const expanded = view.state.field(metadataExpandedState);

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		let currentPos = from;

		for (const line of text.split('\n')) {
			const lineStart = currentPos;
			const lineEnd = currentPos + line.length;
			currentPos = lineEnd + 1; // +1 for newline

			const trimmed = line.trim();
			if (
				trimmed.startsWith(METADATA_PREFIX) &&
				trimmed.endsWith(METADATA_SUFFIX)
			) {
				const lineNum = view.state.doc.lineAt(lineStart).number;

				if (!expanded.has(lineNum)) {
					// Hide the metadata and show widget
					builder.add(
						lineStart,
						lineStart,
						Decoration.widget({
							widget: new MetadataWidget(lineStart, lineEnd, trimmed),
							side: 1,
						}),
					);
					builder.add(
						lineStart,
						lineEnd,
						Decoration.replace({}),
					);
				} else {
					// Show with highlighting to indicate it's expandable
					builder.add(
						lineStart,
						lineEnd,
						Decoration.mark({
							class: 'oboeru-metadata-expanded',
							attributes: {
								title: 'Click indicator to hide',
							},
						}),
					);
					// Add widget before the expanded metadata
					builder.add(
						lineStart,
						lineStart,
						Decoration.widget({
							widget: new MetadataWidget(lineStart, lineEnd, trimmed),
							side: -1,
						}),
					);
				}
			}
		}
	}

	return builder.finish();
}

export const metadataViewPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (
				update.docChanged ||
				update.viewportChanged ||
				update.state.field(metadataExpandedState) !==
					update.startState.field(metadataExpandedState)
			) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{
		decorations: (v) => v.decorations,
	},
);

export const metadataEditorExtension = [metadataExpandedState, metadataViewPlugin];
