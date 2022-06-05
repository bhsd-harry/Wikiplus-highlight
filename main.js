/**
 * @name Wikiplus-highlight Wikiplus编辑器的CodeMirror语法高亮扩展
 * @author Bhsd <https://github.com/bhsd-harry>
 * @author 机智的小鱼君 <https://github.com/Dragon-Fish>
 * @license GPL-3.0
 */

(async () => {
	'use strict';

	if (mw.libs.wphl) {
		return;
	}
	mw.libs.wphl = true; // 开始加载

	const version = '2.15',
		newAddon = 0;

	/** @type {typeof mw.storage} */
	const storage = typeof mw.storage === 'object' && typeof mw.storage.getObject === 'function'
		? mw.storage
		: {
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
			setObject(key, value) {
				try {
					const json = JSON.stringify(value);
					return localStorage.setItem(key, json);
				} catch (e) {
					return false;
				}
			},
		};
	/**
	 * polyfill for Object.fromEntries
	 * @type {(entries: Iterable<[string, T]>) => Record<string, T>}
	 * @template T
	 */
	const fromEntries = Object.fromEntries || (entries => {
		const /** @type {Record<string, T>} */ obj = {};
		for (const [key, value] of entries) {
			obj[key] = value;
		}
		return obj;
	});
	/**
	 * polyfill for Array.prototype.flat
	 * @type {(arr: T[][]) => T[]}
	 * @template T
	 */
	const flatten = arr => {
		if (typeof arr.flat === 'function') {
			return arr.flat();
		}
		return arr.reduce((acc, cur) => acc.concat(cur), []);
	};

	/**
	 * 解析版本号
	 * @param {string} str 版本字符串
	 */
	const getVersion = (str = version) => str.split('.').map(s => Number(s));
	/**
	 * 比较版本号
	 * @param {string} a
	 * @param {string} b
	 * @returns a的版本号是否小于b的版本号
	 */
	const cmpVersion = (a, b) => {
		const [a0, a1] = getVersion(a),
			[b0, b1] = getVersion(b);
		return a0 < b0 || a0 === b0 && a1 < b1;
	};
	/**
	 * 获取I18N消息
	 * @param {string} key 消息键，省略'wphl-'前缀
	 * @param {string[]} args
	 */
	const msg = (key, ...args) => mw.msg(`wphl-${key}`, ...args);
	/** @param {string[]} args */
	const htmlMsg = (...args) => $($.parseHTML(msg(...args)));
	/**
	 * 提示消息
	 * @param {string[]} args
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
		MW_CDN = 'gh/bhsd-harry/codemirror-mediawiki@1.1.5',
		REPO_CDN = `gh/bhsd-harry/Wikiplus-highlight@${majorVersion}`;

	const {
		wgPageName: page,
		wgNamespaceNumber: ns,
		wgPageContentModel: contentmodel,
		wgServerName: server,
		wgScriptPath: scriptPath,
		wgUserLanguage: userLang,
		skin,
	} = mw.config.values;

	// 和本地缓存有关的常数
	const USING_LOCAL = mw.loader.getState('ext.CodeMirror') !== null,
		/** @type {Record<string, {time: number, config: mwConfig}>} */
		ALL_SETTINGS_CACHE = storage.getObject('InPageEditMwConfig') || {},
		SITE_ID = `${server}${scriptPath}`,
		/** @type {{time: number, config: mwConfig}} */ SITE_SETTINGS = ALL_SETTINGS_CACHE[SITE_ID] || {},
		EXPIRED = SITE_SETTINGS.time < Date.now() - 86400 * 1000 * 30;

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
	};

	/**
	 * @typedef {object} addon
	 * @property {string} option
	 * @property {string|string[]} addon
	 * @property {string} download
	 * @property {(mode: string, json: boolean) => any} complex
	 * @property {string[]} modes
	 * @property {boolean} only
	 */

	const /** @type {addon[]} */ options = [
		{option: 'styleSelectedText', addon: 'search', download: 'markSelection', only: true},
		{option: 'styleActiveLine', addon: 'activeLine'},
		{option: 'showTrailingSpace', addon: 'trailingspace'},
		{
			option: 'matchBrackets',
			complex: (mode, json) => mode === 'mediawiki' || json
				? {bracketRegex: /[{}[\]]/}
				: true,
		},
		{
			option: 'autoCloseBrackets', addon: 'closeBrackets',
			complex: (mode, json) => mode === 'mediawiki' || json
				? '()[]{}""'
				: true,
		},
		{option: 'matchTags', addon: ['matchTags', 'fold'], modes: ['mediawiki', 'widget']},
		{option: 'fold', modes: ['mediawiki', 'widget']},
	];

	const defaultAddons = ['search'],
		defaultIndent = '4';
	let /** @type {string[]} */ addons = storage.getObject('Wikiplus-highlight-addons') || defaultAddons,
		/** @type {string} */ indent = storage.getObject('Wikiplus-highlight-indent') || defaultIndent;

	/** @type {Record<string, string>} */
	const entity = {'"': 'quot', "'": 'apos', '<': 'lt', '>': 'gt', '&': 'amp', ' ': 'nbsp'},
		/** @type {(func: (str: string) => string) => (doc: CodeMirror.Editor) => void} */
		convert = func => doc => {
			doc.replaceSelection(doc.getSelection().split('\n').map(func).join('\n'), 'around');
		},
		escapeHTML = convert(str => str.split('').map(c => {
			if (c in entity) {
				return `&${entity[c]};`;
			}
			const code = c.charCodeAt();
			return code < 256 ? `&#${code};` : `&#x${code.toString(16)};`;
		}).join('')),
		/** @type {function(typeof CodeMirror): boolean} */ isPc = ({keyMap}) => keyMap.default === keyMap.pcDefault,
		extraKeysPc = {'Ctrl-/': escapeHTML, 'Ctrl-\\': convert(encodeURIComponent)},
		extraKeysMac = {'Cmd-/': escapeHTML, 'Cmd-\\': convert(encodeURIComponent)};

	/**
	 * contextMenu插件
	 * @param {CodeMirror.Editor} doc
	 * @param {string} mode
	 */
	const handleContextMenu = async (doc, mode) => {
		if (!['mediawiki', 'widget'].includes(mode) || !addons.includes('contextmenu')) {
			return;
		}
		const $wrapper = $(doc.getWrapperElement()).addClass('CodeMirror-contextmenu'),
			{functionSynonyms: [synonyms]} = mw.config.get('extCodeMirrorConfig') || {
				functionSynonyms: [{
					invoke: 'invoke',
					调用: 'invoke',
					widget: 'widget',
					小工具: 'widget',
				}],
			};
		/** @param {string} str */
		const getSysnonyms = str => Object.keys(synonyms).filter(key => synonyms[key] === str)
			.map(key => key.startsWith('#') ? key : `#${key}`);
		const invoke = getSysnonyms('invoke'),
			widget = getSysnonyms('widget');

		await mw.loader.using('mediawiki.Title');
		$wrapper.contextmenu(({pageX, pageY}) => {
			const pos = doc.coordsChar({left: pageX, top: pageY}),
				{line, ch} = pos,
				curType = doc.getTokenTypeAt(pos);
			if (!/\bmw-(?:template-name|parserfunction)\b/.test(curType)) {
				return;
			}
			const tokens = doc.getLineTokens(line);
			for (const [i, {type, end, string}] of [...tokens.entries()].reverse()) {
				if (i > 0 && tokens[i - 1].type === type) {
					tokens[i - 1].end = end;
					tokens[i - 1].string += string;
					tokens.splice(i, 1);
				}
			}
			const index = tokens.findIndex(({start, end}) => start < ch && end >= ch),
				text = tokens[index].string.replace(/\u200e/g, '').replace(/_/g, ' ').trim();
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
				return;
			}
			const parserFunction = tokens[index - 2].string.trim().toLowerCase();
			if (invoke.includes(parserFunction)) {
				open(mw.util.getUrl(`Module:${text}`), '_blank');
			} else if (widget.includes(parserFunction)) {
				open(mw.util.getUrl(`Widget:${text}`, {action: 'edit'}), '_blank');
			} else {
				return;
			}
			return false;
		});
	};

	let /** @type {Record<string, string>} */ i18n = storage.getObject('Wikiplus-highlight-i18n'),
		/** @type {() => JQuery<HTMLElement>} */ welcome;
	if (!i18n) { // 首次安装
		i18n = {};
		welcome = notify('welcome');
	} else if (cmpVersion(i18n['wphl-version'], version)) { // 更新版本
		welcome = notify(`welcome-${newAddon ? 'new-addon' : 'upgrade'}`, version, newAddon);
	}

	const /** @type {Record<string, string>} */ i18nLanguages = {
			zh: 'zh-hans', 'zh-hans': 'zh-hans', 'zh-cn': 'zh-hans', 'zh-my': 'zh-hans', 'zh-sg': 'zh-hans',
			'zh-hant': 'zh-hant', 'zh-tw': 'zh-hant', 'zh-hk': 'zh-hant', 'zh-mo': 'zh-hant',
		},
		i18nLang = i18nLanguages[userLang] || 'en',
		I18N_CDN = `${CDN}/${REPO_CDN}/i18n/${i18nLang}.json`,
		isLatest = i18n['wphl-version'] === majorVersion;

	/** 加载 I18N */
	const setI18N = async () => {
		if (!isLatest || i18n['wphl-lang'] !== i18nLang) {
			i18n = await $.ajax(`${I18N_CDN}`, { // eslint-disable-line require-atomic-updates
				dataType: 'json',
				cache: true,
			});
			storage.setObject('Wikiplus-highlight-i18n', i18n);
		}
		mw.messages.set(i18n);
	};

	const i18nPromise = Promise.all([ // 提前加载I18N
		mw.loader.using('mediawiki.util'),
		setI18N(),
	]);

	/**
	 * 下载脚本
	 * @param {string[]} urls 脚本路径
	 * @param {boolean} local 是否从本地下载
	 */
	const getScript = (urls, local) => {
		if (urls.length === 0) {
			return Promise.resolve();
		}
		return local
			? mw.loader.using(urls)
			: $.ajax(`${CDN}/${urls.length > 1 ? 'combine/' : ''}${urls.join()}`, {
				dataType: 'script',
				cache: true,
			});
	};

	// 以下进入CodeMirror相关内容
	let /** @type {CodeMirror.EditorFromTextArea} */ cm;

	/** @param {typeof CodeMirror} CM */
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
	 * @param {T[]|T} arr1
	 * @param {T[]} arr2
	 * @template T
	 */
	const intersect = (arr1, arr2) => Array.isArray(arr1)
		? arr1.some(ele => arr2.includes(ele))
		: arr2.includes(arr1);

	/**
	 * 根据文本的高亮模式加载依赖项
	 * @param {string} type
	 */
	const initMode = async type => {
		let /** @type {string[]} */ scripts = [];
		const /** @type {string[]} */ externalScript = [],
			/** @type {string[]} */ addonScript = [],
			loaded = typeof window.CodeMirror === 'function';

		/**
		 * 代替CodeMirror的局部变量
		 * @type {typeof CodeMirror}
		 */
		const CM = loaded
			? window.CodeMirror
			: {
				modes: {},
				prototype: {},
				commands: {},
				optionHandlers: {},
			};

		if (['mediawiki', 'widget'].includes(type) && !CM.modes.mediawiki) {
			// 总是外部样式表和外部脚本
			mw.loader.load(`${CDN}/${MW_CDN}/mediawiki.min.css`, 'text/css');
			(USING_LOCAL ? externalScript : scripts).push(`${MW_CDN}/mediawiki.min.js`);
		}
		if (type === 'mediawiki' && SITE_SETTINGS.config && SITE_SETTINGS.config.tags.html) {
			// NamespaceHTML扩展自由度过高，所以这里一律当作允许<html>标签
			type = 'html'; // eslint-disable-line no-param-reassign
		}
		if (!loaded) {
			(USING_LOCAL ? scripts : addonScript).push(MODE_LIST.lib);
			if (!USING_LOCAL) {
				mw.loader.load(`${CDN}/${CM_CDN}/lib/codemirror.min.css`, 'text/css');
			}
		}
		if (!CM.prototype.getSearchCursor && addons.includes('search')) {
			addonScript.push(ADDON_LIST.searchcursor);
		}
		if (!CM.commands.findForward && addons.includes('search')) {
			addonScript.push(ADDON_LIST.search);
		}
		addonScript.push(...getAddonScript(CM));
		if (['widget', 'html'].includes(type)) {
			for (const lang of ['css', 'javascript', 'mediawiki', 'htmlmixed', 'xml']) {
				if (!CM.modes[lang]) {
					scripts = scripts.concat(MODE_LIST[lang]);
				}
			}
		} else if (!CM.modes[type]) {
			if (type === 'lua') { // CodeMirror扩展没有提供Lua模式，必须从外部下载
				(USING_LOCAL ? externalScript : scripts).push(MODE_LIST.lua);
			} else {
				scripts = scripts.concat(MODE_LIST[type]);
			}
		}

		if (loaded) {
			await Promise.all([
				getScript(scripts, USING_LOCAL), // CodeMirror modes
				getScript(externalScript), // external Lua mode when using local lib
				getScript(addonScript), // external addons
			]);
		} else if (USING_LOCAL) {
			await getScript(scripts, true); // local CodeMirror lib and modes
			await Promise.all([
				getScript(externalScript), // external Lua mode
				getScript(addonScript), // external addons
			]);
		} else {
			await getScript(addonScript); // external CodeMirror lib and addons
			await getScript(scripts); // external modes, including Lua
		}
	};

	/**
	 * 更新缓存的设置数据
	 * @param {mwConfig} config
	 */
	const updateCachedConfig = config => {
		ALL_SETTINGS_CACHE[SITE_ID] = {
			config,
			time: Date.now(),
		};
		storage.setObject('InPageEditMwConfig', ALL_SETTINGS_CACHE);
	};

	/**
	 * 加载CodeMirror的mediawiki模块需要的设置数据
	 * @param {string} type
	 * @param {Promise<void>} initModePromise 使用本地CodeMirror扩展时大部分数据来自ext.CodeMirror.data模块
	 */
	const getMwConfig = async (type, initModePromise) => {
		if (!['mediawiki', 'widget'].includes(type)) {
			return;
		}

		if (USING_LOCAL && EXPIRED) { // 只在localStorage过期时才会重新加载ext.CodeMirror.data
			await initModePromise;
		}

		let config = mw.config.get('extCodeMirrorConfig');
		if (!config && !EXPIRED && isLatest) {
			({config} = SITE_SETTINGS);
			if (config.tags.ref) { // fix a bug in InPageEdit-v2
				config.tagModes.ref = 'text/mediawiki';
			}
			mw.config.set('extCodeMirrorConfig', config);
		}
		if (config && config.redirect && config.img) { // 情形1：config已更新，可能来自localStorage
			return config;
		} else if (config) { /** @todo 暂不需要redirect和img相关设置 */
			return config;
		}

		/*
		 * 以下情形均需要发送API请求
		 * 情形2：localStorage未过期但不包含新设置
		 * 情形3：新加载的 ext.CodeMirror.data
		 * 情形4：config === null
		 */
		const {query: {magicwords, extensiontags, functionhooks, variables}} = await new mw.Api().get({
			meta: 'siteinfo',
			siprop: config ? 'magicwords' : 'magicwords|extensiontags|functionhooks|variables',
			formatversion: 2,
		});
		const otherMagicwords = ['msg', 'raw', 'msgnw', 'subst', 'safesubst'];

		/**
		 * @param {{aliases: string[], name: string}[]} words
		 * @returns {{alias: string, name: string}[]}
		 */
		const getAliases = words => flatten(
			words.map(({aliases, name}) => aliases.map(alias => ({alias, name}))),
		);
		/**
		 * @param {{alias: string, name: string}[]} aliases
		 * @returns {Record<string, string>}
		 */
		const getConfig = aliases => fromEntries(
			aliases.map(({alias, name}) => [alias.replace(/:$/, ''), name]),
		);

		if (!config) { // 情形4：config === null\
			config = {
				tagModes: {
					pre: 'mw-tag-pre',
					nowiki: 'mw-tag-nowiki',
					ref: 'text/mediawiki',
				},
				tags: fromEntries(
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
		} else { // 情形2或3
			const {functionSynonyms: [insensitive]} = config;
			if (!insensitive.subst) {
				getAliases(
					magicwords.filter(({name}) => otherMagicwords.includes(name)),
				).forEach(({alias, name}) => {
					insensitive[alias.replace(/:$/, '')] = name;
				});
			}
		}
		config.redirect = magicwords.find(({name}) => name === 'redirect').aliases;
		config.img = getConfig(
			getAliases(magicwords.filter(({name}) => name.startsWith('img_'))),
		);
		mw.config.set('extCodeMirrorConfig', config);
		updateCachedConfig(config);
		return config;
	};

	/** 检查页面语言类型 */
	const getPageMode = async () => {
		if ([274, 828].includes(ns) && !page.endsWith('/doc')) {
			const pageMode = ns === 274 ? 'Widget' : 'Lua';
			await mw.loader.using(['oojs-ui-windows', 'oojs-ui.styles.icons-content']);
			const bool = await OO.ui.confirm(msg('contentmodel'), {
				actions: [
					{label: pageMode},
					{label: 'Wikitext', action: 'accept'},
				],
			});
			return bool ? 'mediawiki' : pageMode.toLowerCase();
		} else if (page.endsWith('/doc')) {
			return 'mediawiki';
		}
		return CONTENTMODEL[contentmodel];
	};

	/**
	 * 渲染编辑器
	 * @param {JQuery<HTMLTextAreaElement>} $target 目标编辑框
	 * @param {boolean} setting 是否是Wikiplus设置（使用json语法）
	 */
	const renderEditor = async ($target, setting) => {
		const mode = setting ? 'javascript' : await getPageMode();
		const initModePromise = initMode(mode);
		const [mwConfig] = await Promise.all([
			getMwConfig(mode, initModePromise),
			initModePromise,
		]);

		if (mode === 'mediawiki' && mwConfig.tags.html) {
			mwConfig.tagModes.html = 'htmlmixed';
			await initMode('html'); // 如果已经缓存过mwConfig，这一步什么都不会发生
		} else if (mode === 'widget' && !CodeMirror.mimeModes.widget) { // 到这里CodeMirror已确定加载完毕
			CodeMirror.defineMIME('widget', {
				name: 'htmlmixed',
				tags: {
					noinclude: [[null, null, 'mediawiki']],
				},
			});
		}

		// 储存初始高度
		const height = $target.height();

		if (cm) {
			cm.toTextArea();
		}

		const json = setting || contentmodel === 'json',
			{name} = $.client.profile();
		cm = CodeMirror.fromTextArea($target[0], $.extend({
			inputStyle: name === 'safari' ? 'textarea' : 'contenteditable',
			lineNumbers: true,
			lineWrapping: true,
			mode,
			mwConfig,
			json,
		}, fromEntries(
			options.map(({option, addon = option, modes, complex = mod => !modes || modes.includes(mod)}) => {
				const mainAddon = Array.isArray(addon) ? addon[0] : addon;
				return [option, addons.includes(mainAddon) && complex(mode, json)];
			}),
		), mode === 'mediawiki'
			? {
				extraKeys: addons.includes('escape') && (isPc(CodeMirror) ? extraKeysPc : extraKeysMac),
			}
			: {
				indentUnit: addons.includes('indentWithSpace') ? indent : defaultIndent,
				indentWithTabs: !addons.includes('indentWithSpace'),
			},
		));
		cm.setSize(null, height);
		cm.refresh();

		handleContextMenu(cm, mode);

		$('#Wikiplus-Quickedit-Jump').children('a').attr('href', '#Wikiplus-CodeMirror');

		if (!setting) { // 普通Wikiplus编辑区
			const submit = () => {
					$('#Wikiplus-Quickedit-Submit').triggerHandler('click');
				},
				submitMinor = () => {
					$('#Wikiplus-Quickedit-MinorEdit').click();
					$('#Wikiplus-Quickedit-Submit').triggerHandler('click');
				};
			cm.addKeyMap($.extend(
				isPc(CodeMirror)
					? {'Ctrl-S': submit, 'Shift-Ctrl-S': submitMinor}
					: {'Cmd-S': submit, 'Shift-Cmd-S': submitMinor},
				Wikiplus.getSetting('esc_to_exit_quickedit')
					? {
						Esc() {
							$('#Wikiplus-Quickedit-Back').triggerHandler('click');
						},
					}
					: {},
			));
		}

		mw.hook('wiki-codemirror').fire(cm);
	};

	// 监视 Wikiplus 编辑框
	const observer = new MutationObserver(records => {
		const $editArea = $(flatten(
			records.map(({addedNodes}) => [...addedNodes]),
		)).find('#Wikiplus-Quickedit, #Wikiplus-Setting-Input');
		if ($editArea.length === 0) {
			return;
		}
		renderEditor($editArea, $editArea.attr('id') === 'Wikiplus-Setting-Input');
	});
	observer.observe(document.body, {childList: true});

	// 添加样式
	const wphlStyle = document.getElementById('wphl-style') || mw.loader.addStyleTag(
		'#Wikiplus-Quickedit+.CodeMirror,#Wikiplus-Setting-Input+.CodeMirror'
		+ '{border:1px solid #c8ccd1;line-height:1.3;clear:both}'
		+ 'div.Wikiplus-InterBox{font-size:14px;z-index:100}'
		+ '.skin-minerva .Wikiplus-InterBox{font-size:16px}'
		+ '.cm-trailingspace{text-decoration:underline wavy red}'
		+ 'div.CodeMirror span.CodeMirror-matchingbracket{box-shadow:0 0 0 2px #9aef98}'
		+ 'div.CodeMirror span.CodeMirror-nonmatchingbracket{box-shadow:0 0 0 2px #eace64}'
		+ '#Wikiplus-highlight-dialog .oo-ui-messageDialog-title{margin-bottom:0.28571429em}'
		+ '#Wikiplus-highlight-dialog .oo-ui-flaggedElement-notice{font-weight:normal;margin:0}'
		+ '.CodeMirror-contextmenu .cm-mw-template-name{cursor:pointer}',
	);
	wphlStyle.id = 'wphl-style';

	/**
	 * 对编辑框调用jQuery.val方法时从CodeMirror获取文本
	 * @type {{get: (elem: HTMLTextAreaElement) => string, set: (elem: HTMLTextAreaElement, value: string) => void}}
	 */
	const {
		get = function(elem) {
			return elem.value;
		},
		set = function(elem, value) {
			elem.value = value;
		},
	} = $.valHooks.textarea || {};
	/** @param {HTMLTextAreaElement} elem */
	const isWikiplus = elem => ['Wikiplus-Quickedit', 'Wikiplus-Setting-Input'].includes(elem.id);
	$.valHooks.textarea = {
		get(elem) {
			return isWikiplus(elem) && cm ? cm.getValue() : get(elem);
		},
		set(elem, value) {
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
		/** @type {OOUI.NumberInputWidget} */ indentWidget,
		/** @type {OOUI.FieldLayout} */ field,
		/** @type {OOUI.FieldLayout} */ indentField;
	const toggleIndent = (value = addons) => {
		indentField.toggle(value.includes('indentWithSpace'));
	};
	const portletContainer = {
		minerva: 'page-actions-overflow',
		citizen: 'p-actions',
	};
	const $portlet = $(mw.util.addPortletLink(
		portletContainer[skin] || 'p-cactions', '#', msg('portlet'), 'wphl-settings',
	)).click(async e => {
		e.preventDefault();
		if (!dialog) {
			await mw.loader.using(['oojs-ui-windows', 'oojs-ui.styles.icons-content']);
			// eslint-disable-next-line require-atomic-updates
			dialog = new OO.ui.MessageDialog({id: 'Wikiplus-highlight-dialog'});
			const windowManager = new OO.ui.WindowManager();
			windowManager.$element.appendTo(document.body);
			windowManager.addWindows([dialog]);
			widget = new OO.ui.CheckboxMultiselectInputWidget({
				options: [
					...options.map(({option, addon = option}) => {
						const mainAddon = Array.isArray(addon) ? addon[0] : addon;
						return {data: mainAddon, label: htmlMsg(`addon-${mainAddon.toLowerCase()}`)};
					}),
					...['escape', 'contextmenu', 'indentWithSpace', 'otherEditors']
						.map(addon => ({data: addon, label: htmlMsg(`addon-${addon.toLowerCase()}`)})),
				],
				value: addons,
			}).on('change', toggleIndent);
			indentWidget = new OO.ui.NumberInputWidget({min: 0, value: indent});
			field = new OO.ui.FieldLayout(widget, {
				label: msg('addon-label'),
				notices: [msg('addon-notice')],
				align: 'top',
			});
			indentField = new OO.ui.FieldLayout(indentWidget, {label: msg('addon-indent')});
			toggleIndent();
		} else {
			widget.setValue(addons);
			indentWidget.setValue(indent);
		}
		const wikiplusLoaded = typeof window.Wikiplus === 'object';
		widget.$element.find('.oo-ui-checkboxInputWidget').first().toggleClass('oo-ui-widget-enabled', wikiplusLoaded)
			.children('input').prop('disabled', !wikiplusLoaded);
		dialog.open({
			title: msg('addon-title'),
			message: field.$element.add(indentField.$element).add(
				$('<p>', {html: msg('feedback')}),
			),
			actions: [
				{action: 'reject', label: mw.msg('ooui-dialog-message-reject')},
				{action: 'accept', label: mw.msg('ooui-dialog-message-accept'), flags: 'progressive'},
			],
			size: i18nLang === 'en' ? 'medium' : 'small',
		}).closing.then(data => {
			field.$element.detach();
			indentField.$element.detach();
			if (typeof data === 'object' && data.action === 'accept') {
				addons = widget.getValue();
				indent = indentWidget.getValue();
				storage.setObject('Wikiplus-highlight-addons', addons);
				storage.setObject('Wikiplus-highlight-indent', indent);
			}
		});
	});
	if (skin === 'minerva') {
		$portlet.find('a').addClass('mw-ui-icon-minerva-settings');
	}

	// 发送欢迎提示
	if (typeof welcome === 'function') {
		welcome().find('#wphl-settings-notify').click(e => {
			e.preventDefault();
			$('#wphl-settings').triggerHandler('click');
		});
	}

	/** @param {CodeMirror.Editor} doc */
	const handleOtherEditors = async doc => {
		if (!addons.includes('otherEditors')) {
			return;
		}
		let mode = doc.getOption('mode');
		mode = mode === 'text/mediawiki' ? 'mediawiki' : mode;
		const addonScript = getAddonScript(CodeMirror, true),
			json = doc.getOption('json');
		await getScript(addonScript);
		for (const {
			option, addon = option, modes, complex = (/** @type {string} */ mod) => !modes || modes.includes(mod),
		} of options.filter(({only}) => !only)) {
			const mainAddon = Array.isArray(addon) ? addon[0] : addon;
			if (doc.getOption(option) === undefined && addons.includes(mainAddon)) {
				doc.setOption(option, complex(mode, json));
			}
		}
		if (mode !== 'mediawiki' && addons.includes('indentWithSpace')) {
			doc.setOption('indentUnit', indent);
			doc.setOption('indentWithTabs', false);
		} else if (mode === 'mediawiki' && addons.includes('escape')) {
			doc.addKeyMap(isPc(CodeMirror) ? extraKeysPc : extraKeysMac, true);
		}
		handleContextMenu(doc, mode);
	};

	mw.hook('InPageEdit.quickEdit.codemirror').add(
		/** @param {{cm: CodeMirror.Editor}} */ ({cm: doc}) => handleOtherEditors(doc),
	);
	mw.hook('inspector').add(/** @param {CodeMirror.Editor} doc */ doc => handleOtherEditors(doc));

	mw.libs.wphl = {
		version, majorVersion, options, addons, indent, i18n, i18nLang, wphlStyle, $portlet,
		CDN, CM_CDN, MW_CDN, REPO_CDN, USING_LOCAL, MODE_LIST, ADDON_LIST, I18N_CDN,
		getVersion, cmpVersion, msg, htmlMsg, escapeHTML, handleContextMenu, setI18N, getScript, getAddonScript,
		intersect, initMode, updateCachedConfig, getMwConfig, getPageMode, renderEditor, handleOtherEditors,
	}; // 加载完毕
	Object.freeze(mw.libs.wphl);
})();
