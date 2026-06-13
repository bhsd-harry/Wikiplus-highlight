import type {} from 'types-mediawiki';
import type * as Monaco from 'monaco-editor';
import type {CodeMirror6 as CodeMirrorBase} from '@bhsd/codemirror-mediawiki';

interface CodeMirror extends CodeMirrorBase {
	editor?: Monaco.editor.IStandaloneCodeEditor;
}

type WikiplusPages = Record<number, {title: string, sectionCache: Record<string, string>}>;

declare global {
	interface CodeMirrorOptions {
		ns?: number | undefined;
		page?: string | undefined;
	}
	const CodeMirror6: typeof CodeMirrorBase & {
		instances?: WeakMap<HTMLTextAreaElement, CodeMirror>;
		fromTextArea(textarea: HTMLTextAreaElement, lang?: string, opt?: CodeMirrorOptions): Promise<CodeMirror>;
	};

	const monaco: typeof Monaco;

	const _WikiplusPages: WikiplusPages | undefined;
	const Pages: WikiplusPages | undefined;
}

export {};
