import 'types-mediawiki';
import type * as Monaco from 'monaco-editor';
import type {CodeMirror6} from '@bhsd/codemirror-mediawiki';

interface CodeMirror extends CodeMirror6 {
	editor?: Monaco.editor.IStandaloneCodeEditor;
}

interface CodeMirrorStatic {
	fromTextArea(textarea: HTMLTextAreaElement, lang?: string, ns?: number): Promise<CodeMirror>;
}

declare global {
	interface Window {
		CodeMirror6: Promise<CodeMirrorStatic> | undefined;
	}

	const CodeMirror6: CodeMirrorStatic | Promise<CodeMirrorStatic>;

	const monaco: typeof Monaco;

	const _WikiplusPages: Record<number, {title: string, sectionCache: Record<string, string>}> | undefined;
}

export {};
