/**
 * @name Wikiplus-highlight Wikiplus编辑器的CodeMirror语法高亮扩展
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

((): void => {
	if ('wphl' in mw.libs) {
		return;
	}
	const version = '3.0.2';
	mw.libs['wphl'] = {version}; // 开始加载

	// 路径
	const CDN = '//testingcf.jsdelivr.net',
		MW_CDN = 'npm/@bhsd/codemirror-mediawiki@2.4.5/dist/mw.min.js',
		REPO_CDN = 'npm/wikiplus-highlight';

	const {
		wgPageName: page,
		wgNamespaceNumber: ns,
		wgPageContentModel: contentmodel,
	} = mw.config.get();

	const CONTENTMODELS: Record<string, string> = {
			'sanitized-css': 'css',
			wikitext: 'mediawiki',
		},
		EXTS: Record<string, string> = {
			css: 'css',
			js: 'javascript',
			json: 'json',
		},
		NAMESPACES: Record<number, string> = {
			828: 'lua',
			274: 'html',
		};

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/unbound-method
	const getObject = mw.storage.getObject || ((key): unknown => JSON.parse(String(localStorage.getItem(key))));

	/** 根据需要加载CodeMirror6 */
	const init = (): Promise<void> =>
		'CodeMirror6' in window
			? Promise.resolve()
			: new Promise(resolve => {
				const script = document.createElement('script');
				script.addEventListener('load', () => {
					resolve();
				});
				script.type = 'module';
				script.src = `${CDN}/${MW_CDN}`;
				document.head.appendChild(script);
			});

	/**
	 * 检查页面语言类型
	 * @param value 页面内容
	 */
	const getPageMode = async (value: string): Promise<string> => {
		if (typeof _WikiplusPages === 'object') {
			const pages = Object.values(_WikiplusPages)
				.filter(({sectionCache}) => Object.values(sectionCache).includes(value));
			if (pages.some(({title}) => !title.endsWith('/doc'))) {
				await mw.loader.using('mediawiki.Title');
			}
			const modes = new Set(pages.map(({title}) => {
				if (title.endsWith('/doc')) {
					return 'mediawiki';
				}
				const t = new mw.Title(title),
					namespace = t.getNamespaceId();
				return namespace % 2
					? 'mediawiki'
					: EXTS[t.getExtension()?.toLowerCase() || ''] || NAMESPACES[namespace] || 'mediawiki';
			}));
			if (modes.size === 1) {
				const [mode] = modes;
				return mode!;
			}
		}
		if (ns !== 274 && contentmodel !== 'Scribunto' || page.endsWith('/doc')) {
			return CONTENTMODELS[contentmodel] || contentmodel;
		}
		await mw.loader.using('oojs-ui-windows');
		if (
			await OO.ui.confirm(mw.msg('cm-mw-contentmodel'), {
				actions: [{label: ns === 274 ? 'Widget' : 'Lua'}, {label: 'Wikitext', action: 'accept'}],
			})
		) {
			return 'mediawiki';
		}
		return ns === 274 ? 'html' : 'lua';
	};

	/**
	 * 渲染编辑器
	 * @param $target 目标编辑框
	 * @param setting 是否是Wikiplus设置（使用json语法）
	 */
	const renderEditor = async ($target: JQuery<HTMLTextAreaElement>, setting: boolean): Promise<void> => {
		await init();
		const cm = await CodeMirror6.fromTextArea($target[0]!, setting ? 'json' : await getPageMode($target.val()!));
		cm.view.dom.id = 'Wikiplus-CodeMirror';

		document.querySelector<HTMLAnchorElement>('#Wikiplus-Quickedit-Jump > a')!.href = '#Wikiplus-CodeMirror';

		if (!setting) { // 普通Wikiplus编辑区
			const settings: Record<string, unknown> | null = getObject('Wikiplus_Settings'),
				escToExitQuickEdit = settings && (settings['esc_to_exit_quickedit'] || settings['escToExitQuickEdit']),
				submit = /** 提交编辑 */ (): true => {
					document.getElementById('Wikiplus-Quickedit-Submit')!.dispatchEvent(new MouseEvent('click'));
					return true;
				},
				submitMinor = /** 提交小编辑 */ (): true => {
					document.querySelector<HTMLInputElement>('#Wikiplus-Quickedit-MinorEdit')!.checked = true;
					return submit();
				},
				escapeEdit = /** 按下Esc键退出编辑 */ (): true => {
					document.getElementById('Wikiplus-Quickedit-Back')!.dispatchEvent(new MouseEvent('click'));
					return true;
				};
			cm.extraKeys([
				{key: 'Mod-S', run: submit},
				{key: 'Shift-Mod-S', run: submitMinor},
				...escToExitQuickEdit === true || escToExitQuickEdit === 'true'
					? [{key: 'Esc', run: escapeEdit}]
					: [],
			]);
		}

		/** @todo 以下过渡代码添加于2024-02-07，将于一段时间后弃用 */
		const oldKey = 'Wikiplus-highlight-addons',
			oldPrefs: string[] | null = getObject(oldKey),
			mapping: Record<string, string> = {
				activeLine: 'highlightActiveLine',
				trailingspace: 'highlightTrailingWhitespace',
				matchBrackets: 'bracketMatching',
				closeBrackets: 'closeBrackets',
				matchTags: 'tagMatching',
				fold: 'codeFolding',
				wikiEditor: 'wikiEditor',
				escape: 'escape',
				contextmenu: 'openLinks',
				lint: 'lint',
			};
		localStorage.removeItem(oldKey);
		if (oldPrefs) {
			const obj: Record<string, true> = {};
			for (const k of oldPrefs) {
				if (k in mapping) {
					obj[mapping[k]!] = true;
				}
			}
			cm.prefer(obj);
		}
	};

	// 监视 Wikiplus 编辑框
	const observer = new MutationObserver(records => {
		const $editArea = $(records.flatMap(({addedNodes}) => [...addedNodes]))
			.find<HTMLTextAreaElement>('#Wikiplus-Quickedit, #Wikiplus-Setting-Input');
		if ($editArea.length > 0) {
			void renderEditor($editArea, $editArea.attr('id') === 'Wikiplus-Setting-Input');
		}
	});
	observer.observe(document.body, {childList: true});

	mw.loader.load(`${CDN}/${REPO_CDN}@${version}/styles.min.css`, 'text/css');
})();
