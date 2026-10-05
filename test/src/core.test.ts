import assert from 'assert';
import {describe, it, beforeEach} from '@bhsd/test-util/mocha';
import {getModeFromValue} from '../../dist/core';
import type {} from 'types-mediawiki';
import type {CodeMirrorOptions} from '@bhsd/codemirror-mediawiki/mwConfig';

const getPages = (pages: [string, string][]): unknown[] => pages.map(([title, content]) => ({
	title,
	sectionCache: {
		0: content,
	},
}));

Object.assign(globalThis, {
	Pages: getPages([
		['Test', 'current page'],
		['0/doc', 'unique doc'],
		['Talk:1', 'unique talk'],
		['User:2/common.css', 'unique css'],
		['3/style.css', 'unique sanitized-css'],
		['MediaWiki:4.js', 'unique javascript'],
		['5.json', 'unique json'],
		['Module:6', 'unique lua'],
		['Widget:7', 'unique html'],
		['Template:8', 'unique wikitext'],
		['Module:9a', 'duplicate lua'],
		['Module:9b', 'duplicate lua'],
		['User:10/common.js', 'duplicate javascript'],
		['MediaWiki:10.js', 'duplicate javascript'],
		['Mediawiki:Gadget-11a.js', 'duplicate gadget'],
		['Mediawiki:Gadget-11b.js', 'duplicate gadget'],
		['12', 'duplicate wikitext'],
		['Help:12', 'duplicate wikitext'],
		['Template:13', 'duplicate template'],
		['Template:13/doc', 'duplicate template'],
		['14', 'duplicate content'],
		['14/style.css', 'duplicate content'],
	]),
});

const mockTest = async (content: string, mode: string, opt?: CodeMirrorOptions): Promise<void> => {
	const result = await getModeFromValue(content);
	assert.strictEqual(result[0], mode, content);
	assert.deepStrictEqual(result[1], opt, content);
};

describe('getModeFromValue', () => {
	beforeEach(() => {
		mw.config.set({
			wgPageName: 'Test',
			wgNamespaceNumber: 0,
			wgPageContentModel: 'wikitext',
			wgArticleId: 1,
			confirm: false,
		});
	});

	it('unique content', async () => {
		await mockTest('current page', 'wikitext', {ns: 0, page: 'Test'});
		await mockTest('unique doc', 'wikitext', {ns: 0, page: '0/doc'});
		await mockTest('unique talk', 'wikitext', {ns: 1, page: 'Talk:1'});
		await mockTest('unique css', 'css', {ns: 2, page: 'User:2/common.css'});
		await mockTest('unique sanitized-css', 'sanitized-css', {ns: 0, page: '3/style.css'});
		await mockTest('unique javascript', 'javascript', {ns: 8, page: 'MediaWiki:4.js'});
		await mockTest('unique json', 'json', {ns: 0, page: '5.json'});
		await mockTest('unique lua', 'lua', {ns: 828, page: 'Module:6'});
		await mockTest('unique html', 'html', {ns: 274, page: 'Widget:7'});
		await mockTest('unique wikitext', 'wikitext', {ns: 10, page: 'Template:8'});
	});

	it('duplicate content with same mode', async () => {
		await mockTest('duplicate lua', 'lua', {ns: 828});
		await mockTest('duplicate javascript', 'javascript');
		await mockTest('duplicate gadget', 'javascript', {ns: 8});
		await mockTest('duplicate wikitext', 'wikitext');
		await mockTest('duplicate template', 'wikitext', {ns: 10});
	});

	it('duplicate content with different modes', async () => {
		await mockTest('duplicate content', 'wikitext');
		mw.config.set({wgPageContentModel: 'sanitized-css'});
		await mockTest('duplicate content', 'sanitized-css', {ns: 0});
		mw.config.set({wgPageContentModel: 'Scribunto'});
		await mockTest('duplicate content', 'lua');
		mw.config.set({confirm: true});
		await mockTest('duplicate content', 'wikitext');
	});

	it('content not found', async () => {
		await mockTest('content not found', 'wikitext');
		mw.config.set({wgPageContentModel: 'javascript'});
		await mockTest('content not found', 'javascript', {ns: 0});
		mw.config.set({wgNamespaceNumber: 274});
		await mockTest('content not found', 'html');
		mw.config.set({wgNamespaceNumber: 828, wgPageContentModel: 'Scribunto'});
		await mockTest('content not found', 'lua');
		mw.config.set({confirm: true});
		await mockTest('content not found', 'wikitext');
		mw.config.set({wgPageName: 'Test/doc'});
		await mockTest('content not found', 'scribunto', {ns: 828});
	});
});
