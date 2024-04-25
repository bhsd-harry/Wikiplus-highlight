import 'types-mediawiki';
import type {KeyCode} from 'monaco-editor';
import type {MonacoWikiEditor} from 'monaco-wiki/dist/mw/base';
import type {CodeMirror6} from '@bhsd/codemirror-mediawiki';

interface MonacoEditor {
	fromTextArea(textarea: HTMLTextAreaElement, lang?: string): Promise<MonacoWikiEditor>;
}

interface CodeMirror {
	fromTextArea(textarea: HTMLTextAreaElement, lang?: string, ns?: number): Promise<CodeMirror6>;
}

type MonacoOrPromise = MonacoEditor | Promise<MonacoEditor>;
type CodeMirrorOrPromise = CodeMirror | Promise<CodeMirror>;

declare global {
	interface Window {
		MonacoWikiEditor: MonacoOrPromise | undefined;
		CodeMirror6: CodeMirrorOrPromise | undefined;
	}

	const MonacoWikiEditor: MonacoOrPromise;
	const CodeMirror6: CodeMirrorOrPromise;

	const _WikiplusPages: Record<number, {title: string, sectionCache: Record<string, string>}> | undefined;

	type MonacoKeyCode = KeyCode;
}

export {};
