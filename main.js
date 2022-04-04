/**
 * @name Wikiplus-highlight Wikiplus编辑器的CodeMirror语法高亮扩展
 * @author Bhsd <https://github.com/bhsd-harry>
 * @author 机智的小鱼君 <https://github.com/Dragon-Fish>
 * @license GPL-3.0
 */

(async () => {
	'use strict';

	const version = '2.3';

	// @type {(Object.<string, function>|undefined)}
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
				let json;
				try {
					json = JSON.stringify(value);
					return localStorage.setItem(key, json);
				} catch (e) {
					return false;
				}
			},
		};
	// @type {(function|undefined)}
	const fromEntries = Object.fromEntries || ((entries) => {
		const obj = {};
		for (const [key, value] of entries) {
			obj[key] = value;
		}
		return obj;
	});

	// Constants
	const CDN = '//cdn.jsdelivr.net',
		CM_CDN = 'npm/codemirror@5.65.1',
		MW_CDN = 'gh/bhsd-harry/codemirror-mediawiki@1.0',
		REPO_CDN = `gh/bhsd-harry/Wikiplus-highlight@${version}`,
		USING_LOCAL = mw.loader.getState('ext.CodeMirror') !== null,

		// Page configs
		{
			wgPageName: page,
			wgNamespaceNumber: ns,
			wgPageContentModel: contentmodel,
			wgServerName: server,
			wgScriptPath: scriptPath,
			wgUserLanguage: userLang,
			skin,
		} = mw.config.values,

		// Local settings cache
		ALL_SETTINGS_CACHE = storage.getObject('InPageEditMwConfig') || {}, // @type {?Object.<string, Object>}
		SITE_ID = `${server}${scriptPath}`,
		SITE_SETTINGS = ALL_SETTINGS_CACHE[SITE_ID] || {}, // @type {(Object|undefined)}
		unexpired = SITE_SETTINGS.time > Date.now() - 86400 * 1000 * 30;

	const CONTENTMODEL = {
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
			mediawiki: unexpired ? [] : 'ext.CodeMirror.data',
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
		activeLine: `${CM_CDN}/addon/selection/active-line.min.js`,
		markSelection: `${CM_CDN}/addon/selection/mark-selection.min.js`,
		trailingspace: `${CM_CDN}/addon/edit/trailingspace.min.js`,
		matchBrackets: `${CM_CDN}/addon/edit/matchbrackets.min.js`,
		matchTags: `${REPO_CDN}/matchtags.min.js`,
	};
	const defaultAddons = ['search'],
		contextmenuStyle = mw.loader.addStyleTag('#Wikiplus-CodeMirror .cm-mw-template-name{cursor:pointer}');
	contextmenuStyle.disabled = true;
	let addons = storage.getObject('Wikiplus-highlight-addons') || defaultAddons, // @type {?Array.<string>}
		i18n = storage.getObject('Wikiplus-highlight-i18n') || {}; // @type {?Object.<string, string>}
	const i18nLanguages = {
			zh: 'zh-hans', 'zh-hans': 'zh-hans', 'zh-cn': 'zh-hans', 'zh-my': 'zh-hans', 'zh-sg': 'zh-hans',
			'zh-hant': 'zh-hant', 'zh-tw': 'zh-hant', 'zh-hk': 'zh-hant', 'zh-mo': 'zh-hant',
		},
		i18nLang = i18nLanguages[userLang] || 'en', // @type {(string|undefined)}
		I18N_CDN = `${CDN}/${REPO_CDN}/i18n/${i18nLang}.json`,
		isLatest = i18n['wphl-version'] === version;

	/**
	 * 加载 I18N
	 */
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
	const msg = (key) => mw.msg(`wphl-${key}`);

	let cm;

	if (!USING_LOCAL) {
		mw.loader.load(`${CDN}/${CM_CDN}/lib/codemirror.min.css`, 'text/css');
	}

	/**
	 * 下载脚本
	 * @param {string[]} urls 脚本路径
	 * @param {boolean=} local 是否从本地下载
	 */
	const getScript = (urls, local) => {
		if (urls.length === 0) {
			return;
		}
		return local
			? mw.loader.using(urls)
			: $.ajax(`${CDN}/${urls.length > 1 ? 'combine/' : ''}${urls.join()}`, {
				dataType: 'script',
				cache: true,
			});
	};

	/**
	 * 加载渲染器
	 * @param {string} type
	 */
	const initMode = async (type) => {
		let scripts = [];
		const externalScript = [],
			addonScript = [];
		// @type {(function|Object.<string, Object>)}
		const cmClass = typeof window.CodeMirror === 'function'
			? window.CodeMirror
			: {
				modes: {},
				prototype: {},
				commands: {},
				optionHandlers: {},
			};
		if (['mediawiki', 'widget'].includes(type) && !cmClass.modes.mediawiki) {
			mw.loader.load(`${CDN}/${MW_CDN}/mediawiki.min.css`, 'text/css');
			(USING_LOCAL ? externalScript : scripts).push(`${MW_CDN}/mediawiki.min.js`);
		}
		if (type === 'mediawiki' && typeof SITE_SETTINGS.config === 'object' && SITE_SETTINGS.config.tags.html) {
			type = 'html'; // eslint-disable-line no-param-reassign
		}
		if (!window.CodeMirror) {
			(USING_LOCAL ? scripts : addonScript).push(MODE_LIST.lib);
		}
		if (!cmClass.prototype.getSearchCursor && addons.includes('search')) {
			addonScript.push(ADDON_LIST.searchcursor);
		}
		if (!cmClass.commands.findForward && addons.includes('search')) {
			addonScript.push(ADDON_LIST.search);
		}
		if (!cmClass.optionHandlers.styleActiveLine && addons.includes('activeLine')) {
			addonScript.push(ADDON_LIST.activeLine);
		}
		if (!cmClass.optionHandlers.styleSelectedText && addons.includes('search')) {
			addonScript.push(ADDON_LIST.markSelection);
		}
		if (!cmClass.optionHandlers.showTrailingSpace && addons.includes('trailingspace')) {
			addonScript.push(ADDON_LIST.trailingspace);
		}
		if (!cmClass.optionHandlers.matchBrackets && addons.includes('matchBrackets')) {
			addonScript.push(ADDON_LIST.matchBrackets);
		}
		if (!cmClass.optionHandlers.matchTags && addons.includes('matchTags')) {
			addonScript.push(ADDON_LIST.matchTags);
		}
		if (['widget', 'html'].includes(type)) {
			['css', 'javascript', 'mediawiki', 'htmlmixed', 'xml'].forEach(lang => {
				if (!cmClass.modes[lang]) {
					scripts = scripts.concat(MODE_LIST[lang]);
				}
			});
		} else if (!cmClass.modes[type]) {
			if (type === 'lua') {
				(USING_LOCAL ? externalScript : scripts).push(MODE_LIST.lua);
			} else {
				scripts = scripts.concat(MODE_LIST[type]);
			}
		}
		if (window.CodeMirror) {
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
	 * @param {Object} config
	 */
	const updateCachedConfig = (config) => {
		ALL_SETTINGS_CACHE[SITE_ID] = {
			config,
			time: Date.now(),
		};
		storage.setObject('InPageEditMwConfig', ALL_SETTINGS_CACHE);
	};

	/**
	 * 加载codemirror的mediawiki模块需要的设置数据
	 * @param {string} type
	 * @param {Promise} initModePromise
	 */
	const getMwConfig = async (type, initModePromise) => {
		if (!['mediawiki', 'widget'].includes(type)) {
			return;
		}

		if (USING_LOCAL && !unexpired) { // 只在localStorage过期时才会重新加载 ext.CodeMirror.data
			await initModePromise;
		}

		let config = mw.config.get('extCodeMirrorConfig');
		if (!config && unexpired && isLatest) {
			({config} = SITE_SETTINGS);
			mw.config.set('extCodeMirrorConfig', config);
		}
		if (config && config.redirect && config.img) { // 情形1：config已更新，可能来自localStorage
			return config;
		}

		/**
		 * 以下情形均需要发送API请求
		 * 情形2：localStorage未过期但不包含新设置
		 * 情形3：新加载的 ext.CodeMirror.data
		 * 情形4：config === null
		 */
		const {
			query: {magicwords, extensiontags, functionhooks, variables},
		} = await new mw.Api().get({
			meta: 'siteinfo',
			siprop: config ? 'magicwords' : 'magicwords|extensiontags|functionhooks|variables',
			formatversion: 2,
		});
		const otherMagicwords = ['msg', 'raw', 'msgnw', 'subst', 'safesubst'],
			getAliases = (words) => words.flatMap(({aliases, name}) => aliases.map(alias => ({alias, name}))),
			getConfig = (aliases) => fromEntries(
				aliases.map(({alias, name}) => [alias.replace(/:$/, ''), name]),
			);
		if (!config) { // 旧版设置
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
				allMagicwords = magicwords.filter(({name, aliases}) =>
					aliases.some(alias => /^__.+__$/.test(alias)) || realMagicwords.has(name),
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
		} else {
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

	/**
	 * 检查页面语言类型
	 */
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
	 * @param {jQuery<HTMLTextAreaElement>} $target 目标编辑框
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
			await initMode('html');
		} else if (mode === 'widget' && !CodeMirror.mimeModes.widget) {
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

		const json = setting || contentmodel === 'json';
		cm = CodeMirror.fromTextArea($target[0], $.extend({
			inputStyle: 'contenteditable',
			lineNumbers: true,
			lineWrapping: true,
			mode,
			mwConfig,
			json,
			styleActiveLine: addons.includes('activeLine'),
			styleSelectedText: addons.includes('search'),
			showTrailingSpace: addons.includes('trailingspace'),
			matchBrackets: addons.includes('matchBrackets') && (mode === 'mediawiki' || json
				? {bracketRegex: /[{}[\]]/}
				: true
			),
			matchTags: addons.includes('matchBrackets') && ['mediawiki', 'widget'].includes(mode),
		}, mode === 'mediawiki'
			? {}
			: {
				indentUnit: 4,
				indentWithTabs: true,
			},
		));
		cm.setSize(null, height);
		cm.refresh();
		const wrapper = cm.getWrapperElement();
		wrapper.id = 'Wikiplus-CodeMirror';
		if (['mediawiki', 'widget'].includes(mode) && addons.includes('contextmenu')) {
			contextmenuStyle.disabled = false;
			const {functionSynonyms: [synonyms]} = mw.config.get('extCodeMirrorConfig'),
				getSysnonyms = (name) => Object.keys(synonyms).filter(key => synonyms[key] === name)
					.map(key => key.startsWith('#') ? key : `#${key}`),
				invoke = getSysnonyms('invoke'),
				widget = getSysnonyms('widget');
			await mw.loader.using('mediawiki.Title');
			$(wrapper).on('contextmenu', '.cm-mw-template-name', function() {
				const text = this.textContent.replace(/\u200e/g, '').trim(),
					title = new mw.Title(text);
				if (title.namespace !== 0 || text.startsWith(':')) {
					open(title.getUrl(), '_blank');
				} else {
					open(mw.util.getUrl(`Template:${text}`), '_blank');
				}
				return false;
			}).on('contextmenu',
				'.cm-mw-parserfunction-name + .cm-mw-parserfunction-delimiter + .cm-mw-parserfunction',
				function() {
					const parserFunction = this.previousSibling.previousSibling.textContent.trim().toLowerCase();
					if (invoke.includes(parserFunction)) {
						open(mw.util.getUrl(`Module:${this.textContent}`), '_blank');
					} else if (widget.includes(parserFunction)) {
						open(mw.util.getUrl(`Widget:${this.textContent}`, {action: 'edit'}), '_blank');
					}
					return false;
				},
			);
		} else {
			contextmenuStyle.disabled = true;
		}
		$('#Wikiplus-Quickedit-Jump').children('a').attr('href', '#Wikiplus-CodeMirror');
		if (!setting) {
			const submit = () => {
					$('#Wikiplus-Quickedit-Submit').triggerHandler('click');
				},
				submitMinor = () => {
					$('#Wikiplus-Quickedit-MinorEdit').click();
					$('#Wikiplus-Quickedit-Submit').triggerHandler('click');
				};
			cm.addKeyMap($.extend({
				'Ctrl-S': submit,
				'Cmd-S': submit,
				'Shift-Ctrl-S': submitMinor,
				'Shift-Cmd-S': submitMinor,
			}, Wikiplus.getSetting('esc_to_exit_quickedit')
				? {
					Esc() {
						$('#Wikiplus-Quickedit-Back').click();
					},
				}
				: {},
			));
		}
		mw.hook('wiki-codemirror').fire(cm);
	};

	await Promise.all([
		mw.loader.using('mediawiki.util'),
		setI18N(),
	]);

	/**
	 * 监视 Wikiplus 编辑框
	 */
	const observer = new MutationObserver(records => {
		const $editArea = $(records.flatMap(({addedNodes}) => [...addedNodes]))
			.find('#Wikiplus-Quickedit, #Wikiplus-Setting-Input');
		if ($editArea.length === 0) {
			return;
		}
		renderEditor($editArea, $editArea.attr('id') === 'Wikiplus-Setting-Input');
	});
	observer.observe(document.body, {childList: true});

	/**
	 * 添加样式
	 */
	mw.loader.addStyleTag(
		'#Wikiplus-Quickedit+.CodeMirror,#Wikiplus-Setting-Input+.CodeMirror{border:1px solid #c8ccd1;line-height:1.3;clear:both}'
		+ 'div.Wikiplus-InterBox{font-size:14px;z-index:100}'
		+ '.skin-minerva .Wikiplus-InterBox{font-size:16px}'
		+ '.cm-trailingspace{text-decoration:underline wavy red}'
		+ 'div.CodeMirror span.CodeMirror-matchingbracket{box-shadow:0 0 0 2px #9aef98}'
		+ 'div.CodeMirror span.CodeMirror-nonmatchingbracket{box-shadow:0 0 0 2px #eace64}'
		+ '#Wikiplus-highlight-dialog .oo-ui-messageDialog-title{margin-bottom:0.28571429em}'
		+ '#Wikiplus-highlight-dialog .oo-ui-flaggedElement-notice{font-weight:normal;margin:0}',
	);

	/**
	 * 对编辑框调用jQuery.val方法时从CodeMirror获取文本
	 */
	const {
		get = function(elem) {
			return elem.value;
		},
		set = function(elem, value) {
			elem.value = value;
		},
	} = $.valHooks.textarea || {}; // @type {(Object.<string, function>|undefined)}
	const isWikiplus = (elem) => ['Wikiplus-Quickedit', 'Wikiplus-Setting-Input'].includes(elem.id);
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

	let dialog, field;
	const portletContainer = {
		minerva: 'page-actions-overflow',
		citizen: 'p-actions',
	};
	const $portlet = $(mw.util.addPortletLink(
		portletContainer[skin] || 'p-cactions', '#', msg('portlet'), 'wphl-settings',
	)).click(async (e) => {
		e.preventDefault();
		if (!dialog) {
			await mw.loader.using(['oojs-ui-windows', 'oojs-ui.styles.icons-content']);
			// eslint-disable-next-line require-atomic-updates
			dialog = new OO.ui.MessageDialog({id: 'Wikiplus-highlight-dialog'});
			const windowManager = new OO.ui.WindowManager();
			windowManager.$element.appendTo(document.body);
			windowManager.addWindows([dialog]);
			const widget = new OO.ui.CheckboxMultiselectInputWidget({
				options: [
					{data: 'search', label: msg('addon-search')},
					{data: 'activeLine', label: msg('addon-active-line')},
					{data: 'trailingspace', label: msg('addon-trailingspace')},
					{data: 'matchBrackets', label: msg('addon-matchbrackets')},
					{data: 'matchTags', label: msg('addon-matchtags')},
					{data: 'contextmenu', label: msg('addon-contextmenu')},
				],
			});
			widget.setValue(addons);
			field = new OO.ui.FieldLayout(widget, {
				label: msg('addon-label'),
				notices: [msg('addon-notice')],
				align: 'top',
			});
		}
		dialog.open({
			title: msg('addon-title'),
			message: field.$element.add(
				$('<p>', {html: msg('feedback')}),
			),
			actions: [
				{action: 'reject', label: mw.msg('ooui-dialog-message-reject')},
				{action: 'accept', label: mw.msg('ooui-dialog-message-accept'), flags: 'progressive'},
			],
		}).closed.then(data => {
			if (typeof data === 'object' && data.action === 'accept') {
				addons = field.getField().getValue();
				storage.setObject('Wikiplus-highlight-addons', addons);
			}
		});
	});
	if (skin === 'minerva') {
		$portlet.find('a').addClass('mw-ui-icon-minerva-settings');
	}
})();
