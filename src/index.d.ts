import 'types-mediawiki';
import type {CodeMirror6} from '@bhsd/codemirror-mediawiki';

declare global {
	namespace mw {
		const libs: {
			wphl?: {version?: string, cmVersion: string};
		};
	}

	const CodeMirror6: {
		fromTextArea(textarea: HTMLTextAreaElement, lang?: string, ns?: number): Promise<CodeMirror6>;
	};

	const _WikiplusPages: Record<number, {title: string, sectionCache: Record<string, string>}> | undefined;
}

export {};
