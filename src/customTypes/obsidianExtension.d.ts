// Import the necessary types from Obsidian
import { MarkdownView } from 'obsidian';

// Extend the existing type definition for MarkdownView
declare module 'obsidian' {
	interface MarkdownPreviewView {
		renderer: {
			queueRender: () => void; // Typing for queueRender() method
			sections: {
				el: HTMLElement;
				rendered: boolean;
				html: string;
			}[]; // Typing for sections property
		};
	}
}
