import {getObject, isGlobal} from '@bhsd/browser';
import type {CodeMirrorOptions} from '@bhsd/codemirror-mediawiki/mwConfig';

const {
	wgPageName: pageName,
	wgNamespaceNumber: nsid,
	wgPageContentModel: contentmodel,
	wgArticleId: id,
} = mw.config.get();

const EXTS = new Map<string, string>([
		['css', 'css'],
		['js', 'javascript'],
		['json', 'json'],
	]),
	NAMESPACES: Record<number, string> = {
		828: 'lua',
		274: 'html',
	};

const isDoc = (title: string): boolean => title.endsWith('/doc');

/**
 * 根据页面标题获取语言模型
 * @param title 页面标题
 */
const getModeFromTitle = (title: string): [string, number] => {
	if (id && pageName === title) {
		return [contentmodel.toLowerCase(), nsid];
	}
	const t = new mw.Title(title),
		ns = t.getNamespaceId();
	if (ns % 2 || isDoc(title)) {
		return ['wikitext', ns];
	}
	const mode = EXTS.get(t.getExtension()?.toLowerCase() ?? '') ?? NAMESPACES[ns] ?? 'wikitext';
	return [mode === 'css' && ![2, 8, 2300].includes(ns) ? 'sanitized-css' : mode, ns];
};

/**
 * 根据页面内容获取语言模型
 * @param value 页面内容
 */
const getModeFromValue = async (value: string): Promise<[string, (CodeMirrorOptions | undefined)?]> => {
	let WikiplusPages;
	if (typeof _WikiplusPages === 'object' && isGlobal('_WikiplusPages')) {
		WikiplusPages = _WikiplusPages;
	} else if (typeof Pages === 'object' && isGlobal('Pages')) {
		WikiplusPages = Pages;
	}
	if (WikiplusPages) {
		await mw.loader.using('mediawiki.Title');
		const pages = Object.values(WikiplusPages)
				.filter(({sectionCache}) => Object.values(sectionCache).includes(value)),
			l = pages.length;
		if (l) {
			const params = pages.map(({title}) => getModeFromTitle(title)),
				[mode, ns] = params[0]!;
			if (l === 1) {
				return [mode, {ns, page: pages[0]!.title}];
			} else if (new Set(params.map(([x]) => x)).size === 1) {
				return [mode, new Set(params.map(([, y]) => y)).size === 1 ? {ns} : undefined];
			}
		}
	}
	if (nsid !== 274 && contentmodel !== 'Scribunto' || isDoc(pageName)) {
		return [contentmodel.toLowerCase(), contentmodel === 'wikitext' ? undefined : {ns: nsid}];
	}
	await mw.loader.using('oojs-ui-windows');
	return await OO.ui.confirm(mw.msg('cm-mw-contentmodel'), {
		actions: [{label: nsid === 274 ? 'Widget' : 'Lua'}, {label: 'Wikitext', action: 'accept'}],
	})
		? ['wikitext']
		: [nsid === 274 ? 'html' : 'lua'];
};

const submit = /** 提交编辑 */ (): true => {
		document.getElementById('Wikiplus-Quickedit-Submit')!
			.dispatchEvent(new PointerEvent('click'));
		return true;
	},
	submitMinor = /** 提交小编辑 */ (): true => {
		document.querySelector<HTMLInputElement>('#Wikiplus-Quickedit-MinorEdit')!.checked = true;
		return submit();
	},
	escapeEdit = /** 按下Esc键退出编辑 */ (): boolean => {
		const settings: Record<string, unknown> | null = getObject('Wikiplus_Settings'),
			escToExitQuickEdit = settings && (settings['esc_to_exit_quickedit'] || settings['escToExitQuickEdit']);
		if (escToExitQuickEdit === true || escToExitQuickEdit === 'true') {
			document.getElementById('Wikiplus-Quickedit-Back')!
				.dispatchEvent(new PointerEvent('click'));
			return true;
		}
		return false;
	};

/**
 * 渲染编辑器
 * @param target 目标编辑框
 * @param setting 是否是Wikiplus设置（使用json语法）
 */
export const renderEditor = async (target: HTMLTextAreaElement, setting: boolean): Promise<void> => {
	const cm = await CodeMirror6.fromTextArea(
		target,
		...setting ? ['json'] satisfies [string] : await getModeFromValue(target.value),
	);
	(cm.view?.dom ?? cm.editor!.getDomNode()!).id = 'Wikiplus-CodeMirror';

	if (!setting) { // 普通Wikiplus编辑区
		if (cm.editor) {
			/* eslint-disable no-bitwise */
			cm.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
				submit();
			});
			cm.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
				submitMinor();
			});
			/* eslint-enable no-bitwise */
			cm.editor.addCommand(monaco.KeyCode.Escape, () => {
				escapeEdit();
			});
		} else {
			cm.extraKeys([
				{key: 'Mod-S', run: submit},
				{key: 'Shift-Mod-S', run: submitMinor},
				{key: 'Esc', run: escapeEdit},
			]);
		}
	}

	const jump = document.querySelector<HTMLAnchorElement>('#Wikiplus-Quickedit-Jump > a');
	if (jump) {
		jump.href = '#Wikiplus-CodeMirror';
	}
};
