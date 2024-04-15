import 'types-mediawiki';
import type {CodeMirror6} from '@bhsd/codemirror-mediawiki';

interface CodeMirror {
	fromTextArea(textarea: HTMLTextAreaElement, lang?: string, ns?: number): Promise<CodeMirror6>;
}

type CodeMirrorOrPromise = CodeMirror | Promise<CodeMirror>;

declare global {
	namespace mw {
		const libs: {
			wphl?: {version?: string, cmVersion: string};
		};
	}

	interface Window {
		CodeMirror6: CodeMirrorOrPromise | undefined;
	}

	const CodeMirror6: CodeMirrorOrPromise;

	const _WikiplusPages: Record<number, {title: string, sectionCache: Record<string, string>}> | undefined;
}

export {};
