/**
 * @name Wikiplus-highlight Wikiplus编辑器的CodeMirror语法高亮扩展
 * @author Bhsd <https://github.com/bhsd-harry>
 * @author 机智的小鱼君 <https://github.com/Dragon-Fish>
 * @license GPL-3.0
 */

(async () => {
	/* eslint-disable require-unicode-regexp */
	'use strict';

	if (mw.libs.wphl) {
		return;
	}
	mw.libs.wphl = {}; // 开始加载

	const version = '2.30.2',
		newAddon = 0;

	/** @type {typeof mw.storage} */
	const storage = typeof mw.storage === 'object' && typeof mw.storage.getObject === 'function'
		? mw.storage
		: {
			/** @override */
			getObject(key) {
				const json = localStorage.getItem(key);
				if (json === false) {
					return false;
				}
				try {
					return JSON.parse(json);
				} catch (e) {
					return null;
				}
			},
			/** @override */
			setObject(key, value) {
				try {
					return localStorage.setItem(key, JSON.stringify(value));
				} catch (e) {
					return false;
				}
			},
		};

	Object.fromEntries = Object.fromEntries || (entries => {
		const /** @type {Record<string, T>} */ obj = {};
		for (const [key, value] of entries) {
			obj[key] = value;
		}
		return obj;
	});

	/**
	 * 解析版本号
	 * @param {string} str 版本号
	 */
	const getVersion = (str = version) => str.split('.').map(Number);

	/**
	 * 比较版本号
	 * @param {string} a 版本号1
	 * @param {string} b 版本号2
	 * @returns {boolean} `a`的版本号是否小于`b`的版本号
	 */
	const cmpVersion = (a, b) => {
		const [a0, a1] = getVersion(a),
			[b0, b1] = getVersion(b);
		return a0 < b0 || a0 === b0 && a1 < b1;
	};

	/**
	 * 获取I18N消息
	 * @param {string} key 消息键，省略`wphl-`前缀
	 * @param {string[]} args 替换`$1`等的参数
	 */
	const msg = (key, ...args) => mw.msg(`wphl-${key}`, ...args);

	/**
	 * 生成JQuery的I18N消息
	 * @param {string[]} args 替换`$1`等的参数
	 */
	const htmlMsg = (...args) => $($.parseHTML(msg(...args)));

	/**
	 * 提示消息
	 * @param {string[]} args 替换`$1`等的参数
	 */
	const notify = (...args) => () => {
		const $p = $('<p>', {html: msg(...args)});
		mw.notify($p, {type: 'success', autoHideSeconds: 'long', tag: 'wikiplus-highlight'});
		return $p;
	};

	// 插件和I18N依主版本号
	const majorVersion = getVersion().slice(0, 2).join('.');

	// 路径
	const CDN = '//fastly.jsdelivr.net',
		CM_CDN = 'npm/codemirror@5.65.3',
		MW_CDN = 'gh/bhsd-harry/codemirror-mediawiki@1.1.6',
		PARSER_CDN = 'gh/bhsd-harry/wikiparser-node@0.6.7-b',
		REPO_CDN = `gh/bhsd-harry/Wikiplus-highlight@${majorVersion}`;

	const {config: {values: {
		wgPageName: page,
		wgNamespaceNumber: ns,
		wgPageContentModel: contentmodel,
		wgServerName: server,
		wgScriptPath: scriptPath,
		wgUserLanguage: userLang,
		skin,
	}}} = mw;

	// 和本地缓存有关的常数
	const USING_LOCAL = mw.loader.getState('ext.CodeMirror') !== null,
		/** @type {Record<string, {time: number, config: mwConfig}>} */
		ALL_SETTINGS_CACHE = storage.getObject('InPageEditMwConfig') || {},
		SITE_ID = `${server}${scriptPath}`,
		/** @type {{time: number, config: mwConfig}} */ SITE_SETTINGS = ALL_SETTINGS_CACHE[SITE_ID] || {},
		EXPIRED = !(SITE_SETTINGS.time > Date.now() - 86400 * 1000 * 30);

	const /** @type {Record<string, string>} */ CONTENTMODEL = {
		css: 'css',
		'sanitized-css': 'css',
		javascript: 'javascript',
		json: 'javascript',
		wikitext: 'mediawiki',
	};

	const MODE_LIST = USING_LOCAL
		? {
			lib: 'ext.CodeMirror.lib',
			css: 'ext.CodeMirror.lib.mode.css',
			javascript: 'ext.CodeMirror.lib.mode.javascript',
			lua: `${CM_CDN}/mode/lua/lua.min.js`,
			mediawiki: EXPIRED ? 'ext.CodeMirror.data' : [],
			htmlmixed: 'ext.CodeMirror.lib.mode.htmlmixed',
			xml: [],
		}
		: {
			lib: `${CM_CDN}/lib/codemirror.min.js`,
			css: `${CM_CDN}/mode/css/css.min.js`,
			javascript: `${CM_CDN}/mode/javascript/javascript.min.js`,
			lua: `${CM_CDN}/mode/lua/lua.min.js`,
			mediawiki: [],
			htmlmixed: `${CM_CDN}/mode/htmlmixed/htmlmixed.min.js`,
			xml: `${CM_CDN}/mode/xml/xml.min.js`,
		};

	const ADDON_LIST = {
		searchcursor: `${CM_CDN}/addon/search/searchcursor.min.js`,
		search: `${REPO_CDN}/search.min.js`,
		markSelection: `${CM_CDN}/addon/selection/mark-selection.min.js`,
		activeLine: `${CM_CDN}/addon/selection/active-line.min.js`,
		trailingspace: `${CM_CDN}/addon/edit/trailingspace.min.js`,
		matchBrackets: `${CM_CDN}/addon/edit/matchbrackets.min.js`,
		closeBrackets: `${CM_CDN}/addon/edit/closebrackets.min.js`,
		matchTags: `${REPO_CDN}/matchtags.min.js`,
		fold: `${REPO_CDN}/fold.min.js`,
		wikiEditor: 'ext.wikiEditor',
		contextmenu: 'mediawiki.Title',
		lint: `${CM_CDN}/addon/lint/lint.min.js`,
		annotateScrollbar: `${CM_CDN}/addon/scroll/annotatescrollbar.min.js`,
		parser: `${PARSER_CDN}/bundle/bundle.min.js`,
		lintWikitext: `${REPO_CDN}/lint.min.js`,
	};

	/**
	 * @typedef {object} addon
	 * @property {string} option 对应的CodeMirror选项
	 * @property {string|string[]} addon 对应的Wikiplus-highlight插件
	 * @property {string} download 需要下载的CodeMirror扩展
	 * @property {(mode: string, json: boolean) => any} complex 插件加载条件
	 * @property {Set<string>} modes 使用的高亮模式
	 * @property {boolean} only 是否仅用于Wikiplus
	 */

	const /** @type {addon[]} */ options = [
		{
			option: 'styleSelectedText',
			addon: 'search',
			download: 'markSelection',
			only: true,
			/** @implements */ complex: () => !addons.has('wikiEditor'),
		},
		{option: 'styleActiveLine', addon: 'activeLine'},
		{option: 'showTrailingSpace', addon: 'trailingspace'},
		{
			option: 'matchBrackets',
			/** @implements */ complex: (mode, json) => mode === 'mediawiki' || json
				? {bracketRegex: /[{}[\]]/}
				: true,
		},
		{
			option: 'autoCloseBrackets',
			addon: 'closeBrackets',
			/** @implements */ complex: (mode, json) => mode === 'mediawiki' || json
				? '()[]{}""'
				: true,
		},
		{option: 'matchTags', addon: ['matchTags', 'fold'], modes: new Set(['mediawiki', 'widget'])},
		{option: 'fold', modes: new Set(['mediawiki', 'widget'])},
	];

	const defaultAddons = ['search'],
		defaultIndent = 4,
		/** @type {Set<string>} */ addons = new Set(storage.getObject('Wikiplus-highlight-addons') || defaultAddons);
	let /** @type {number} */ indent = storage.getObject('Wikiplus-highlight-indent') || defaultIndent;

	/** @type {Record<string, string>} */
	const entity = {'"': 'quot', "'": 'apos', '<': 'lt', '>': 'gt', '&': 'amp', ' ': 'nbsp'},
		/** @type {(func: (str: string) => string) => (doc: CodeMirror.Editor) => void} */
		convert = func => doc => {
			doc.replaceSelection(doc.getSelection().split('\n').map(func).join('\n'), 'around');
		},
		escapeHTML = convert(str => [...str].map(c => {
			if (c in entity) {
				return `&${entity[c]};`;
			}
			const code = c.codePointAt();
			return code < 256 ? `&#${code};` : `&#x${code.toString(16)};`;
		}).join('')),
		/** @type {function(typeof CodeMirror): boolean} */ isPc = ({keyMap}) => keyMap.default === keyMap.pcDefault,
		extraKeysPc = {'Ctrl-/': escapeHTML, 'Ctrl-\\': convert(encodeURIComponent)},
		extraKeysMac = {'Cmd-/': escapeHTML, 'Cmd-\\': convert(encodeURIComponent)};

	/**
	 * contextMenu插件
	 * @param {CodeMirror.Editor} doc CodeMirror编辑区
	 * @param {string} mode 高亮模式
	 */
	const handleContextMenu = (doc, mode) => {
		if (mode !== 'mediawiki' && mode !== 'widget' || !addons.has('contextmenu')) {
			return;
		}
		const $wrapper = $(doc.getWrapperElement()).addClass('CodeMirror-contextmenu'),
			{functionSynonyms: [synonyms]} = mw.config.get('extCodeMirrorConfig') || {
				functionSynonyms: [{invoke: 'invoke', 调用: 'invoke', widget: 'widget', 小工具: 'widget'}],
			};

		/**
		 * 生成别名映射表
		 * @param {string} str 别名
		 */
		const getSysnonyms = str => new Set(Object.keys(synonyms).filter(key => synonyms[key] === str)
			.map(key => key.startsWith('#') ? key : `#${key}`));
		const invoke = getSysnonyms('invoke'),
			widget = getSysnonyms('widget');

		$wrapper.contextmenu(({pageX, pageY}) => {
			const pos = doc.coordsChar({left: pageX, top: pageY}),
				{line, ch} = pos,
				curType = doc.getTokenTypeAt(pos);
			if (!/\bmw-(?:template-name|parserfunction)\b/.test(curType)) {
				return undefined;
			}
			const tokens = doc.getLineTokens(line);
			for (let i = tokens.length - 1; i > 0; i--) {
				const {type, end, string} = tokens[i];
				if (tokens[i - 1].type === type) {
					tokens[i - 1].end = end;
					tokens[i - 1].string += string;
					tokens.splice(i, 1);
				}
			}
			const index = tokens.findIndex(({start, end}) => start < ch && end >= ch),
				text = tokens[index].string.replace(/\u200E/g, '').replace(/_/g, ' ').trim();
			if (/\bmw-template-name\b/.test(curType)) {
				const title = new mw.Title(text);
				if (title.namespace !== 0 || text.startsWith(':')) {
					open(title.getUrl(), '_blank');
				} else {
					open(mw.util.getUrl(`Template:${text}`), '_blank');
				}
				return false;
			} else if (index < 2 || !/\bmw-parserfunction-delimiter\b/.test(tokens[index - 1].type)
				|| !/\bmw-parserfunction-name\b/.test(tokens[index - 2].type)
			) {
				return undefined;
			}
			const parserFunction = tokens[index - 2].string.trim().toLowerCase();
			if (invoke.has(parserFunction)) {
				open(mw.util.getUrl(`Module:${text}`), '_blank');
			} else if (widget.has(parserFunction)) {
				open(mw.util.getUrl(`Widget:${text}`, {action: 'edit'}), '_blank');
			} else {
				return undefined;
			}
			return false;
		});
	};

	const /** @type {Record<string, string>} */ i18n = storage.getObject('Wikiplus-highlight-i18n') || {};
	let /** @type {() => JQuery<HTMLElement>} */ welcome;
	if (!i18n['wphl-version']) { // 首次安装
		welcome = notify('welcome');
	} else if (cmpVersion(i18n['wphl-version'], version)) { // 更新版本
		welcome = notify(`welcome-${newAddon ? 'new-addon' : 'upgrade'}`, version, newAddon);
	}

	const /** @type {Record<string, string>} */ i18nLanguages = {
			zh: 'zh-hans',
			'zh-hans': 'zh-hans',
			'zh-cn': 'zh-hans',
			'zh-my': 'zh-hans',
			'zh-sg': 'zh-hans',
			'zh-hant': 'zh-hant',
			'zh-tw': 'zh-hant',
			'zh-hk': 'zh-hant',
			'zh-mo': 'zh-hant',
			ka: 'ka',
		},
		i18nLang = i18nLanguages[userLang] || 'en',
		I18N_CDN = `${CDN}/${REPO_CDN}/i18n/${i18nLang}.json`,
		isLatest = i18n['wphl-version'] === majorVersion;

	/** 加载 I18N */
	const setI18N = async () => {
		if (!isLatest || i18n['wphl-lang'] !== i18nLang) {
			Object.assign(i18n, await $.ajax(`${I18N_CDN}`, { // eslint-disable-line require-atomic-updates
				dataType: 'json',
				cache: true,
			}));
			storage.setObject('Wikiplus-highlight-i18n', i18n);
		}
		mw.messages.set(i18n);
	};

	const i18nPromise = Promise.all([ // 提前加载I18N
		mw.loader.using('mediawiki.util'),
		setI18N(),
	]);

	/**
	 * 下载MW扩展脚本
	 * @param {string[]} exts CodeMirror扩展模块
	 */
	const getInternalScript = exts => exts.length > 0 ? mw.loader.using(exts) : Promise.resolve();

	/**
	 * 下载外部脚本
	 * @param {string[]} urls CodeMirror脚本网址
	 */
	const getExternalScript = urls => urls.length > 0
		? $.ajax(`${CDN}/${urls.length > 1 ? 'combine/' : ''}${urls.join()}`, {dataType: 'script', cache: true})
		: Promise.resolve();

	/**
	 * 下载脚本
	 * @param {string[]} urls 脚本路径
	 * @param {boolean|undefined} local 是否先从本地下载
	 */
	const getScript = async (urls, local) => {
		const internal = urls.filter(url => !url.includes('/')),
			external = urls.filter(url => url.includes('/'));
		if (local === true) {
			await getInternalScript(internal);
			return getExternalScript(external);
		} else if (local === false) {
			await getExternalScript(external);
			return getInternalScript(internal);
		}
		return Promise.all([getInternalScript(internal), getExternalScript(external)]);
	};

	// 以下进入CodeMirror相关内容
	let /** @type {CodeMirror.EditorFromTextArea} */ cm;

	/**
	 * 生成需要的插件列表
	 * @param {typeof CodeMirror} CM CodeMirror
	 * @param {boolean} other 是否用于Wikiplus以外的textarea
	 */
	const getAddonScript = (CM, other = false) => {
		const /** @type {string[]} */ addonScript = [];
		for (const {option, addon = option, download = Array.isArray(addon) ? option : addon, only} of options) {
			if (!(only && other) && !(option in CM.optionHandlers) && intersect(addon, addons)) {
				addonScript.push(ADDON_LIST[download]);
			}
		}
		return addonScript;
	};

	/**
	 * 交集
	 * @param {T[]|T} arr 集合1（可重）
	 * @param {Set<T>} set 集合2
	 * @template T
	 */
	const intersect = (arr, set) => Array.isArray(arr)
		? arr.some(ele => set.has(ele))
		: set.has(arr);

	/**
	 * 根据文本的高亮模式加载依赖项
	 * @param {string} type 高亮模式
	 */
	const initMode = type => {
		let /** @type {string[]} */ scripts = [];
		const loaded = typeof window.CodeMirror === 'function';

		/**
		 * 代替`CodeMirror`的局部变量
		 * @type {typeof CodeMirror}
		 */
		const CM = loaded
			? window.CodeMirror
			: {modes: {}, prototype: {}, commands: {}, optionHandlers: {}, helpers: {}};

		// lib
		if (!loaded) {
			scripts.push(MODE_LIST.lib);
			if (!USING_LOCAL) {
				mw.loader.load(`${CDN}/${CM_CDN}/lib/codemirror.min.css`, 'text/css');
			}
		}

		// modes
		if (type === 'mediawiki' && SITE_SETTINGS.config && SITE_SETTINGS.config.tags.html) {
			// NamespaceHTML扩展自由度过高，所以这里一律当作允许<html>标签
			type = 'html'; // eslint-disable-line no-param-reassign
		}
		if ((type === 'mediawiki' || type === 'widget') && !CM.modes.mediawiki) {
			// 总是外部样式表和外部脚本
			mw.loader.load(`${CDN}/${MW_CDN}/mediawiki.min.css`, 'text/css');
			scripts.push(`${MW_CDN}/mediawiki.min.js`);
		}
		if (type === 'widget' || type === 'html') {
			for (const lang of ['css', 'javascript', 'mediawiki', 'htmlmixed', 'xml']) {
				if (!CM.modes[lang]) {
					scripts = scripts.concat(MODE_LIST[lang]);
				}
			}
		} else {
			scripts = scripts.concat(MODE_LIST[type]);
		}

		// addons
		if (!CM.prototype.getSearchCursor && addons.has('search') && !addons.has('wikiEditor')) {
			scripts.push(ADDON_LIST.searchcursor);
		}
		if (!CM.prototype.annotateScrollbar && type === 'mediawiki' && addons.has('lint')) {
			scripts.push(ADDON_LIST.annotateScrollbar);
		}
		if (!CM.commands.findForward && addons.has('search') && !addons.has('wikiEditor')) {
			scripts.push(ADDON_LIST.search);
		}
		if (!window.Parser && type === 'mediawiki' && addons.has('lint')) {
			scripts.push(ADDON_LIST.parser);
		}
		if (!CM.optionHandlers.lint && type === 'mediawiki' && addons.has('lint')) {
			mw.loader.load(`${CDN}/${CM_CDN}/addon/lint/lint.min.css`, 'text/css');
			scripts.push(ADDON_LIST.lint);
		}
		if (!(CM.helpers.lint && CM.helpers.lint.mediawiki) && type === 'mediawiki' && addons.has('lint')) {
			scripts.push(ADDON_LIST.lintWikitext);
		}
		if (addons.has('wikiEditor')) {
			const state = mw.loader.getState('ext.wikiEditor');
			if (!state) {
				addons.delete('wikiEditor');
			} else if (state !== 'ready') {
				scripts.push(ADDON_LIST.wikiEditor);
			}
		}
		if (mw.loader.getState('mediawiki.Title') !== 'ready' && addons.has('contextmenu')) {
			scripts.push(ADDON_LIST.contextmenu);
		}
		scripts.push(...getAddonScript(CM));

		return getScript(scripts, loaded ? undefined : USING_LOCAL);
	};

	/**
	 * 更新缓存的设置数据
	 * @param {mwConfig} config wikitext设置
	 */
	const updateCachedConfig = config => {
		ALL_SETTINGS_CACHE[SITE_ID] = {config, time: Date.now()};
		storage.setObject('InPageEditMwConfig', ALL_SETTINGS_CACHE);
	};

	/**
	 * 展开别名列表
	 * @param {{aliases: string[], name: string}[]} words 原名
	 */
	const getAliases = words => words.flatMap(({aliases, name}) => aliases.map(alias => ({alias, name})));

	/**
	 * 将别名信息转换为CodeMirror接受的设置
	 * @param {{alias: string, name: string}[]} aliases 别名
	 * @returns {Record<string, string>}
	 */
	const getConfig = aliases => Object.fromEntries(
		aliases.map(({alias, name}) => [alias.replace(/:$/, ''), name]),
	);

	/**
	 * 高亮扩展标签内部
	 * @param {mwConfig} config 设置
	 */
	const setPlainMode = config => {
		const tags = ['indicator', 'poem', 'ref', 'tabs', 'tab', 'poll'];
		for (const tag of tags) {
			if (config.tags[tag]) {
				config.tagModes[tag] = 'text/mediawiki';
			}
		}
	};

	/**
	 * 加载CodeMirror的mediawiki模块需要的设置数据
	 * @param {string} type 高亮模式
	 * @param {Promise<void>} initModePromise 使用本地CodeMirror扩展时大部分数据来自ext.CodeMirror.data模块
	 */
	const getMwConfig = async (type, initModePromise) => {
		if (type !== 'mediawiki' && type !== 'widget') {
			return undefined;
		}

		if (USING_LOCAL && EXPIRED) { // 只在localStorage过期时才会重新加载ext.CodeMirror.data
			await initModePromise;
		}

		let config = mw.config.get('extCodeMirrorConfig');
		if (!config && !EXPIRED && isLatest) {
			({config} = SITE_SETTINGS);
			setPlainMode(config);
			mw.config.set('extCodeMirrorConfig', config);
		}
		if (config && config.redirect && config.img) { // 情形1：config已更新，可能来自localStorage
			return config;
		}

		/*
		 * 以下情形均需要发送API请求
		 * 情形2：localStorage未过期但不包含新设置
		 * 情形3：新加载的 ext.CodeMirror.data
		 * 情形4：`config === null`
		 */
		const {query: {magicwords, extensiontags, functionhooks, variables}} = await new mw.Api().get({
			meta: 'siteinfo',
			siprop: config ? 'magicwords' : 'magicwords|extensiontags|functionhooks|variables',
			formatversion: 2,
		});
		const otherMagicwords = new Set(['msg', 'raw', 'msgnw', 'subst', 'safesubst']);

		if (config) { // 情形2或3
			const {functionSynonyms: [insensitive]} = config;
			if (!insensitive.subst) {
				const aliases = getAliases(magicwords.filter(({name}) => otherMagicwords.has(name)));
				for (const {alias, name} of aliases) {
					insensitive[alias.replace(/:$/, '')] = name;
				}
			}
		} else { // 情形4：`config === null`
			config = {
				tagModes: {
					pre: 'mw-tag-pre',
					nowiki: 'mw-tag-nowiki',
					ref: 'text/mediawiki',
				},
				tags: Object.fromEntries(
					extensiontags.map(tag => [tag.slice(1, -1), true]),
				),
				urlProtocols: mw.config.get('wgUrlProtocols'),
			};
			const realMagicwords = new Set([...functionhooks, ...variables, ...otherMagicwords]),
				allMagicwords = magicwords.filter(
					({name, aliases}) => aliases.some(alias => /^__.+__$/.test(alias)) || realMagicwords.has(name),
				),
				sensitive = getAliases(
					allMagicwords.filter(word => word['case-sensitive']),
				),
				insensitive = getAliases(
					allMagicwords.filter(word => !word['case-sensitive']),
				).map(({alias, name}) => ({alias: alias.toLowerCase(), name}));
			config.doubleUnderscore = [
				getConfig(insensitive.filter(({alias}) => /^__.+__$/.test(alias))),
				getConfig(sensitive.filter(({alias}) => /^__.+__$/.test(alias))),
			];
			config.functionSynonyms = [
				getConfig(insensitive.filter(({alias}) => !/^__.+__|^#$/.test(alias))),
				getConfig(sensitive.filter(({alias}) => !/^__.+__|^#$/.test(alias))),
			];
		}
		config.redirect = magicwords.find(({name}) => name === 'redirect').aliases;
		config.img = getConfig(
			getAliases(magicwords.filter(({name}) => name.startsWith('img_'))),
		);
		setPlainMode(config);
		mw.config.set('extCodeMirrorConfig', config);
		updateCachedConfig(config);
		return config;
	};

	/** 检查页面语言类型 */
	const getPageMode = async () => {
		if (page.endsWith('/doc')) {
			return 'mediawiki';
		} else if (ns !== 274 && ns !== 828) {
			return CONTENTMODEL[contentmodel];
		}
		const pageMode = ns === 274 ? 'Widget' : 'Lua';
		await mw.loader.using(['oojs-ui-windows', 'oojs-ui.styles.icons-content']);
		const bool = await OO.ui.confirm(msg('contentmodel'), {
			actions: [{label: pageMode}, {label: 'Wikitext', action: 'accept'}],
		});
		return bool ? 'mediawiki' : pageMode.toLowerCase();
	};

	/**
	 * jQuery.textSelection overrides for CodeMirror.
	 * See jQuery.textSelection.js for method documentation
	 */
	const cmTextSelection = {
		/** @override */ getContents() {
			return cm.getValue();
		},
		/** @override */ setContents(content) {
			cm.setValue(content);
			return this;
		},
		/** @override */ getSelection() {
			return cm.getSelection();
		},
		/** @override */ setSelection(option) {
			cm.setSelection(
				cm.posFromIndex(option.start),
				'end' in option ? cm.posFromIndex(option.end) : undefined,
			);
			cm.focus();
			return this;
		},
		/** @override */ replaceSelection(value) {
			cm.replaceSelection(value);
			return this;
		},
		/** @override */ getCaretPosition(option) {
			const caretPos = cm.indexFromPos(cm.getCursor('from')),
				endPos = cm.indexFromPos(cm.getCursor('to'));
			return option.startAndEnd ? [caretPos, endPos] : caretPos;
		},
		/** @override */ scrollToCaretPosition() {
			cm.scrollIntoView();
			return this;
		},
	};

	/**
	 * 渲染编辑器
	 * @param {JQuery<HTMLTextAreaElement>} $target 目标编辑框
	 * @param {boolean} setting 是否是Wikiplus设置（使用json语法）
	 */
	const renderEditor = async ($target, setting) => {
		const mode = setting ? 'javascript' : await getPageMode(),
			initModePromise = initMode(mode),
			[mwConfig] = await Promise.all([
				getMwConfig(mode, initModePromise),
				initModePromise,
			]);

		if (!setting && addons.has('wikiEditor')) {
			try {
				if (typeof mw.addWikiEditor === 'function') {
					mw.addWikiEditor($target);
				} else {
					const {wikiEditor: {modules: {dialogs: {config}}}} = $;
					$target.wikiEditor('addModule', {
						...$.wikiEditor.modules.toolbar.config.getDefaultConfig(),
						...config.getDefaultConfig(),
					});
					config.replaceIcons($target);
				}
			} catch (e) {
				addons.delete('wikiEditor');
				mw.notify('WikiEditor工具栏加载失败。', {type: 'error'});
				console.error(e);
			}
		}

		if (mode === 'mediawiki' && mwConfig.tags.html) {
			mwConfig.tagModes.html = 'htmlmixed';
			await initMode('html'); // 如果已经缓存过`mwConfig`，这一步什么都不会发生
		} else if (mode === 'widget' && !CodeMirror.mimeModes.widget) { // 到这里CodeMirror已确定加载完毕
			CodeMirror.defineMIME('widget', {name: 'htmlmixed', tags: {noinclude: [[null, null, 'mediawiki']]}});
		}

		// 储存初始高度
		const height = $target.height();

		if (cm) {
			cm.toTextArea();
		}

		const json = setting || contentmodel === 'json';
		cm = CodeMirror.fromTextArea($target[0], $.extend(
			{
				inputStyle: 'contenteditable',
				lineNumbers: !/Android\b/.test(navigator.userAgent),
				lineWrapping: true,
				mode,
				mwConfig,
				json,
			},
			Object.fromEntries(
				options.map(({option, addon = option, modes, complex = mod => !modes || modes.has(mod)}) => {
					const mainAddon = Array.isArray(addon) ? addon[0] : addon;
					return [option, addons.has(mainAddon) && complex(mode, json)];
				}),
			),
			mode === 'mediawiki'
				? {
					extraKeys: addons.has('escape') && (isPc(CodeMirror) ? extraKeysPc : extraKeysMac),
				}
				: {
					indentUnit: addons.has('indentWithSpace') ? indent : defaultIndent,
					indentWithTabs: !addons.has('indentWithSpace'),
				},
		));
		cm.setSize(null, height);
		cm.getWrapperElement().id = 'Wikiplus-CodeMirror';

		if ($.fn.textSelection) {
			$target.textSelection('register', cmTextSelection);
		}

		if (addons.has('wikiEditor')) {
			const context = $target.data('wikiEditorContext'),
				{keyMap} = CodeMirror,
				callback = /** 替代CodeMirror的Ctrl/Cmd-F快捷键 */ () => {
					$.wikiEditor.modules.dialogs.api.openDialog(context, 'search-and-replace');
				};
			cm.addKeyMap(keyMap.default === keyMap.pcDefault ? {'Ctrl-F': callback} : {'Cmd-F': callback});
		}

		handleContextMenu(cm, mode);

		$('#Wikiplus-Quickedit-Jump').children('a').attr('href', '#Wikiplus-CodeMirror');

		if (!setting) { // 普通Wikiplus编辑区
			const /** @type {Wikiplus} */ Wikiplus = typeof window.Wikiplus === 'object'
					? window.Wikiplus
					: {
						/** @override */ getSetting(key) {
							const settings = storage.getObject('Wikiplus_Settings');
							return settings && settings[key];
						},
					},
				escToExitQuickEdit = Wikiplus.getSetting('esc_to_exit_quickedit'),
				submit = /** 提交编辑 */ () => {
					$('#Wikiplus-Quickedit-Submit').triggerHandler('click');
				},
				submitMinor = /** 提交小编辑 */ () => {
					$('#Wikiplus-Quickedit-MinorEdit').click();
					$('#Wikiplus-Quickedit-Submit').triggerHandler('click');
				};
			cm.addKeyMap($.extend(
				isPc(CodeMirror)
					? {'Ctrl-S': submit, 'Shift-Ctrl-S': submitMinor}
					: {'Cmd-S': submit, 'Shift-Cmd-S': submitMinor},
				escToExitQuickEdit === true || escToExitQuickEdit === 'true'
					? {
						/** 按下Esc键退出编辑 */ Esc() {
							$('#Wikiplus-Quickedit-Back').triggerHandler('click');
						},
					}
					: {},
			));
		}

		cm.refresh();
		mw.hook('wiki-codemirror').fire(cm);
	};

	const {body} = document;

	// 监视 Wikiplus 编辑框
	const observer = new MutationObserver(records => {
		const $editArea = $(records.flatMap(({addedNodes}) => [...addedNodes]))
			.find('#Wikiplus-Quickedit, #Wikiplus-Setting-Input');
		if ($editArea.length > 0) {
			renderEditor($editArea, $editArea.attr('id') === 'Wikiplus-Setting-Input');
		}
	});
	observer.observe(body, {childList: true});

	$(body).on(
		'keydown.wphl',
		'.ui-dialog',
		/** @this {HTMLBodyElement} */
		function(e) {
			if (e.key === 'Escape') {
				/** @type {{$textarea: JQuery<HTMLTextAreaElement>}} */
				const context = $(this).children('.ui-dialog-content').data('context');
				if (context && context.$textarea && context.$textarea.attr('id') === 'Wikiplus-Quickedit') {
					e.stopPropagation();
				}
			}
		},
	);

	// 添加样式
	const wphlStyle = document.querySelector('#wphl-style') || mw.loader.addStyleTag(
		'#Wikiplus-CodeMirror{border:1px solid #c8ccd1;line-height:1.3;clear:both;'
		+ '-moz-user-select:auto;-webkit-user-select:auto;user-select:auto}' // fix mobile select
		+ '#Wikiplus-CodeMirror .CodeMirror-gutter-wrapper{'
		+ '-moz-user-select:none;-webkit-user-select:none;user-select:none}' // fix iOS select-all
		+ 'div.Wikiplus-InterBox{font-size:14px;z-index:100}'
		+ '.skin-minerva .Wikiplus-InterBox{font-size:16px}'
		+ '.cm-trailingspace{text-decoration:underline wavy red}'
		+ 'div.CodeMirror span.CodeMirror-matchingbracket{box-shadow:0 0 0 2px #9aef98}'
		+ 'div.CodeMirror span.CodeMirror-nonmatchingbracket{box-shadow:0 0 0 2px #eace64}'
		+ '#Wikiplus-highlight-dialog .oo-ui-messageDialog-title{margin-bottom:0.28571429em}'
		+ '#Wikiplus-highlight-dialog .oo-ui-flaggedElement-notice{font-weight:normal;margin:0}'
		+ '.CodeMirror-contextmenu .cm-mw-template-name{cursor:pointer}'
		+ '.skin-moeskin #ca-more-actions li>a{display:inline-block;padding:0.4rem 0.8rem;line-height:1.5}',
	);
	wphlStyle.id = 'wphl-style';

	/**
	 * 对编辑框调用jQuery.val方法时从CodeMirror获取文本
	 * @type {{get: (elem: HTMLTextAreaElement) => string, set: (elem: HTMLTextAreaElement, value: string) => void}}
	 */
	const {
		get = elem => elem.value,
		set = (elem, value) => {
			elem.value = value;
		},
	} = $.valHooks.textarea || {};

	/**
	 * 是否是Wikiplus编辑区
	 * @param {HTMLTextAreaElement} elem textarea元素
	 */
	const isWikiplus = elem => elem.id === 'Wikiplus-Quickedit' || elem.id === 'Wikiplus-Setting-Input';
	$.valHooks.textarea = {
		/** @override */ get(elem) {
			return isWikiplus(elem) && cm ? cm.getValue() : get(elem);
		},
		/** @override */ set(elem, value) {
			if (isWikiplus(elem) && cm) {
				cm.setValue(value);
			} else {
				set(elem, value);
			}
		},
	};

	await i18nPromise; // 以下内容依赖I18N

	// 设置对话框
	let /** @type {OOUI.MessageDialog} */ dialog,
		/** @type {OOUI.CheckboxMultiselectInputWidget} */ widget,
		/** @type {OOUI.CheckboxMultioptionWidget} */ searchWidget,
		/** @type {OOUI.CheckboxMultioptionWidget} */ wikiEditorWidget,
		/** @type {OOUI.CheckboxMultioptionWidget} */ lintWidget,
		/** @type {OOUI.NumberInputWidget} */ indentWidget,
		/** @type {OOUI.FieldLayout} */ field,
		/** @type {OOUI.FieldLayout} */ indentField;
	/**
	 * 显示/隐藏缩进大小选项
	 * @param {string[]} value 加载的插件
	 */
	const toggleIndent = (value = [...addons]) => {
		indentField.toggle(value.includes('indentWithSpace'));
	};
	const portletContainer = {
		minerva: 'page-actions-overflow',
		citizen: 'p-actions',
		moeskin: 'ca-more-actions',
	};
	const $portlet = $(mw.util.addPortletLink(
		portletContainer[skin] || 'p-cactions', '#', msg('portlet'), 'wphl-settings',
	)).click(async e => {
		e.preventDefault();
		if (dialog) {
			widget.setValue([...addons]);
			indentWidget.setValue(indent);
		} else {
			await mw.loader.using(['oojs-ui-windows', 'oojs-ui.styles.icons-content']);
			// eslint-disable-next-line require-atomic-updates
			dialog = new OO.ui.MessageDialog({id: 'Wikiplus-highlight-dialog'});
			const windowManager = new OO.ui.WindowManager();
			windowManager.$element.appendTo(body);
			windowManager.addWindows([dialog]);
			widget = new OO.ui.CheckboxMultiselectInputWidget({
				options: [
					...options.map(({option, addon = option}) => {
						const mainAddon = Array.isArray(addon) ? addon[0] : addon;
						return {data: mainAddon, label: htmlMsg(`addon-${mainAddon.toLowerCase()}`)};
					}),
					...['wikiEditor', 'escape', 'contextmenu', 'lint', 'indentWithSpace', 'otherEditors']
						.map(addon => ({data: addon, label: htmlMsg(`addon-${addon.toLowerCase()}`)})),
				],
				value: [...addons],
			}).on('change', toggleIndent);
			const {checkboxMultiselectWidget} = widget;
			searchWidget = checkboxMultiselectWidget.findItemFromData('search');
			wikiEditorWidget = checkboxMultiselectWidget.findItemFromData('wikiEditor');
			lintWidget = checkboxMultiselectWidget.findItemFromData('lint');
			indentWidget = new OO.ui.NumberInputWidget({min: 0, value: indent});
			field = new OO.ui.FieldLayout(widget, {
				label: msg('addon-label'),
				notices: [msg('addon-notice')],
				align: 'top',
			});
			indentField = new OO.ui.FieldLayout(indentWidget, {label: msg('addon-indent')});
			toggleIndent();
			Object.assign(mw.libs.wphl, {widget, indentWidget});
		}
		const wikiplusLoaded = typeof window.Wikiplus === 'object' || typeof window.Pages === 'object';
		searchWidget.setDisabled(!wikiplusLoaded);
		wikiEditorWidget.setDisabled(!wikiplusLoaded || !mw.loader.getState('ext.wikiEditor'));
		lintWidget.setDisabled(!wikiplusLoaded);
		const data = await dialog.open({
			title: msg('addon-title'),
			message: field.$element.add(indentField.$element).add(
				$('<p>', {html: msg('feedback')}),
			),
			actions: [
				{action: 'reject', label: mw.msg('ooui-dialog-message-reject')},
				{action: 'accept', label: mw.msg('ooui-dialog-message-accept'), flags: 'progressive'},
			],
			size: i18nLang === 'en' || skin === 'minerva' ? 'medium' : 'small',
		}).closing;
		field.$element.detach();
		indentField.$element.detach();
		if (typeof data === 'object' && data.action === 'accept') {
			/* eslint-disable require-atomic-updates */
			const value = widget.getValue();
			addons.clear();
			for (const addon of value) {
				addons.add(addon);
			}
			indent = Number(indentWidget.getValue());
			storage.setObject('Wikiplus-highlight-addons', value);
			storage.setObject('Wikiplus-highlight-indent', indent);
			/* eslint-enable require-atomic-updates */
		}
	});
	if (skin === 'minerva') {
		$portlet.find('.mw-ui-icon').addClass('mw-ui-icon-minerva-settings');
	}

	// 发送欢迎提示
	if (typeof welcome === 'function') {
		welcome().find('#wphl-settings-notify').click(e => {
			e.preventDefault();
			$('#wphl-settings').triggerHandler('click');
		});
	}

	/**
	 * 处理非Wikiplus编辑器
	 * @param {CodeMirror.Editor} doc CodeMirror编辑区
	 */
	const handleOtherEditors = async doc => {
		if (!addons.has('otherEditors')) {
			return;
		}
		let mode = doc.getOption('mode');
		mode = mode === 'text/mediawiki' ? 'mediawiki' : mode;
		const addonScript = getAddonScript(CodeMirror, true),
			json = doc.getOption('json');
		await getScript(addonScript);
		for (const {
			option, addon = option, modes, complex = (/** @type {string} */ mod) => !modes || modes.has(mod),
		} of options.filter(({only}) => !only)) {
			const mainAddon = Array.isArray(addon) ? addon[0] : addon;
			if (doc.getOption(option) === undefined && addons.has(mainAddon)) {
				doc.setOption(option, complex(mode, json));
			}
		}
		if (mode === 'mediawiki' && addons.has('escape')) {
			doc.addKeyMap(isPc(CodeMirror) ? extraKeysPc : extraKeysMac, true);
		} else if (mode !== 'mediawiki' && addons.has('indentWithSpace')) {
			doc.setOption('indentUnit', indent);
			doc.setOption('indentWithTabs', false);
		}
		handleContextMenu(doc, mode);
	};

	mw.hook('InPageEdit.quickEdit.codemirror').add(
		/** @param {{cm: CodeMirror.Editor}} */ ({cm: doc}) => handleOtherEditors(doc),
	);
	mw.hook('inspector').add(/** @param {CodeMirror.Editor} doc */ doc => handleOtherEditors(doc));
	mw.hook('wiki-codemirror').add(/** @param {CodeMirror.Editor} doc */ doc => {
		if (!doc.getTextArea || !isWikiplus(doc.getTextArea())) {
			handleOtherEditors(doc);
		}
	});

	mw.libs.wphl = {
		version,
		options,
		addons,
		i18n,
		i18nLang,
		wphlStyle,
		$portlet,
		USING_LOCAL,
		MODE_LIST,
		ADDON_LIST,
		msg,
		htmlMsg,
		escapeHTML,
		handleContextMenu,
		setI18N,
		getAddonScript,
		updateCachedConfig,
		getMwConfig,
		renderEditor,
		handleOtherEditors,
		isPc,
	}; // 加载完毕
})();
