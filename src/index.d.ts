import type {} from 'types-mediawiki';
import type * as Monaco from 'monaco-editor';
import type {CodeMirror} from '@bhsd/codemirror-mediawiki/mwConfig';

type WikiplusPages = Record<number, {title: string, sectionCache: Record<string, string>}>;

declare global {
	const CodeMirror6: typeof CodeMirror;

	const monaco: typeof Monaco;

	const _WikiplusPages: WikiplusPages | undefined;
	const Pages: WikiplusPages | undefined;
}

export {};
