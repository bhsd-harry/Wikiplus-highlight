/**
 * @name Wikiplus-highlight Wikiplus编辑器的CodeMirror语法高亮扩展
 * @author Bhsd <https://github.com/bhsd-harry>
 * @author 机智的小鱼君 <https://github.com/Dragon-Fish>
 */
(() => {
	mw.storage = $.extend({
		getObject(key) {
			const json = localStorage.getItem(key);
			if (json === false) {
				return false;
			}
			try {
				return JSON.parse(json);
			} catch {
				return null;
			}
		},
		setObject(key, value) {
			let json;
			try {
				json = JSON.stringify(value);
				return localStorage.setItem(key, json);
			} catch {
				return false;
			}
		}
	}, mw.storage);

	// Constants
	const CDN = '//cdn.jsdelivr.net',
		CM_CDN = 'npm/codemirror@5.35.0',
		WMGH_CDN = 'gh/wikimedia/mediawiki-extensions-CodeMirror@REL1_37/resources/mode/mediawiki',
		USING_LOCAL = mw.loader.getState('ext.CodeMirror') !== null,

		// Page configs
		{
			wgPageName: page,
			wgNamespaceNumber: ns,
			wgPageContentModel: contentmodel,
			wgServerName: server,
			wgScriptPath: scriptPath
		} = mw.config.values,

		// Local settings cache
		ALL_SETTINGS_CACHE = mw.storage.getObject('InPageEditMwConfig') ?? {},
		SITE_ID = `${server}${scriptPath}`,
		SITE_SETTINGS = ALL_SETTINGS_CACHE[SITE_ID];

	const CONTENTMODEL = {
		css: 'css',
		'sanitized-css': 'css',
		javascript: 'javascript',
		json: 'javascript',
		wikitext: 'mediawiki'
	};

	const MODE_LIST = USING_LOCAL
		? {
			lib: 'ext.CodeMirror.lib',
			css: 'ext.CodeMirror.lib.mode.css',
			javascript: 'ext.CodeMirror.lib.mode.javascript',
			lua: `${CM_CDN}/mode/lua/lua.min.js`,
			mediawiki: [
				'ext.CodeMirror.mode.mediawiki',
				'ext.CodeMirror.data'
			],
			htmlmixed: 'ext.CodeMirror.lib.mode.htmlmixed',
			xml: []
		}
		: {
			lib: `${CM_CDN}/lib/codemirror.min.js`,
			css: `${CM_CDN}/mode/css/css.min.js`,
			javascript: `${CM_CDN}/mode/javascript/javascript.min.js`,
			lua: `${CM_CDN}/mode/lua/lua.min.js`,
			mediawiki: `${WMGH_CDN}/mediawiki.min.js`,
			htmlmixed: `${CM_CDN}/mode/htmlmixed/htmlmixed.min.js`,
			xml: `${CM_CDN}/mode/xml/xml.min.js`
		};

	let cm;

	if (!USING_LOCAL) {
		mw.loader.load(`${CDN}/${CM_CDN}/lib/codemirror.min.css`, 'text/css');
	}

	/**
	 * 下载脚本
	 * @param {string[]} urls 脚本路径
	 * @param {boolean} local 是否从本地下载
	 */
	const getScript = (urls, local) => {
		if (urls.length === 0) {
			return;
		}
		return local
			? mw.loader.using(urls)
			: $.ajax(`${CDN}/${urls.length > 1 ? 'combine/' : ''}${urls.join()}`, {
				dataType: 'script',
				cache: true
			});
	};

	/**
	 * 加载渲染器
	 * @param {string} type
	 */
	const initMode = (type) => {
		let scripts = [],
			luaScript = [];
		if (!window.CodeMirror) {
			scripts = scripts.concat(MODE_LIST.lib);
		}
		if (type === 'widget') {
			['css', 'javascript', 'mediawiki', 'htmlmixed', 'xml'].forEach(lang => {
				if (!window.CodeMirror?.modes?.[lang]) {
					scripts = scripts.concat(MODE_LIST[lang]);
				}
			});
		} else if (!window.CodeMirror?.modes?.[type]) {
			if (['mediawiki', 'widget'].includes(type) && !USING_LOCAL) {
				mw.loader.load(`${CDN}/${WMGH_CDN}/mediawiki.min.css`, 'text/css');
			}
			if (type === 'lua') {
				luaScript = [MODE_LIST.lua];
			} else {
				scripts = scripts.concat(MODE_LIST[type]);
			}
		}
		return Promise.all([getScript(scripts, USING_LOCAL), getScript(luaScript, false)]);
	};

	/**
	 * 更新缓存的设置数据
	 * @param {object} config
	 */
	const updateCachedConfig = (config) => {
		ALL_SETTINGS_CACHE[SITE_ID] = {
			config,
			time: Date.now()
		};
		mw.storage.setObject('InPageEditMwConfig', ALL_SETTINGS_CACHE);
	};

	/**
	 * 加载codemirror的mediawiki模块需要的设置数据
	 * @param {string} type
	 */
	const getMwConfig = async (type) => {
		if (!['mediawiki', 'widget'].includes(type)) {
			return;
		}

		let config = mw.config.get('extCodeMirrorConfig');
		if (config) {
			$.extend(config.functionSynonyms[0], {
				msg: true,
				raw: true,
				msgnw: true,
				subst: true,
				safesubst: true
			});
			updateCachedConfig(config);
			return config;
		}

		if (SITE_SETTINGS?.time > Date.now() - 86400 * 1000 * 3) {
			({config} = SITE_SETTINGS);
			mw.config.set('extCodeMirrorConfig', config);
			return config;
		}

		config = {};
		const {
			query: {magicwords, extensiontags, functionhooks, variables}
		} = await new mw.Api().get({
			meta: 'siteinfo',
			siprop: 'magicwords|extensiontags|functionhooks|variables',
			formatversion: 2
		});
		const getAliases = (words) => words.flatMap(({aliases}) => aliases),
			getConfig = (aliases) => Object.fromEntries(
				aliases.map(alias => [alias.replace(/:$/, ''), true])
			);
		config.tagModes = {
			pre: 'mw-tag-pre',
			nowiki: 'mw-tag-nowiki'
		};
		config.tags = Object.fromEntries(
			extensiontags.map(tag => [tag.slice(1, -1), true])
		);
		const realMagicwords = new Set([...functionhooks, ...variables]),
			allMagicwords = magicwords.filter(({name, aliases}) =>
				aliases.some(alias => /^__.+__$/.test(alias)) || realMagicwords.has(name)
			),
			sensitive = getAliases(
				allMagicwords.filter(word => word['case-sensitive'])
			),
			insensitive = [
				...getAliases(
					allMagicwords.filter(word => !word['case-sensitive'])
				).map(alias => alias.toLowerCase()),
				'msg', 'raw', 'msgnw', 'subst', 'safesubst'
			];
		config.doubleUnderscore = [
			getConfig(insensitive.filter(alias => /^__.+__$/.test(alias))),
			getConfig(sensitive.filter(alias => /^__.+__$/.test(alias)))
		];
		config.functionSynonyms = [
			getConfig(insensitive.filter(alias => !/^__.+__|^#$/.test(alias))),
			getConfig(sensitive.filter(alias => !/^__.+__|^#$/.test(alias)))
		];
		config.urlProtocols = mw.config.get('wgUrlProtocols');
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
			await mw.loader.using('oojs-ui-windows');
			const bool = await OO.ui.confirm('Please choose the content model:', {
				actions: [
					{label: pageMode},
					{label: 'Wikitext', action: 'accept'}
				]
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
		await initMode(mode);
		const mwConfig = await getMwConfig(mode);

		// 储存初始高度
		const height = $target.height();

		if (cm) {
			cm.toTextArea();
		}

		if (mode === 'widget' && !CodeMirror.mimeModes.widget) {
			CodeMirror.defineMIME('widget', {
				name: 'htmlmixed',
				tags: {
					noinclude: [[null, null, 'mediawiki']]
				}
			});
		}
		cm = CodeMirror.fromTextArea($target[0], $.extend({
			lineNumbers: true,
			lineWrapping: true,
			mode,
			mwConfig,
			json: setting || contentmodel === 'json'
		}, mode === 'mediawiki'
			? {}
			: {
				indentUnit: 4,
				indentWithTabs: true
			}
		));
		cm.setSize(null, height);
		cm.refresh();
		if (!setting) {
			cm.addKeyMap($.extend({
				'Ctrl-S': () => {
					$('#Wikiplus-Quickedit-Submit').triggerHandler('click');
				},
				'Shift-Ctrl-S': () => {
					$('#Wikiplus-Quickedit-MinorEdit').click();
					$('#Wikiplus-Quickedit-Submit').triggerHandler('click');
				}
			}, Wikiplus.getSetting('esc_to_exit_quickedit')
				? {
					Esc() {
						$('#Wikiplus-Quickedit-Back').click();
					}
				}
				: {}
			));
		}
		mw.hook('wiki-codemirror').fire(cm);
	};

	/**
	 * 监视 Wikiplus 编辑框
	 */
	const observer = new MutationObserver(records => {
		const $editArea = $(records.flatMap(({addedNodes}) => Array.from(addedNodes)))
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
		+ '.skin-minerva #Wikiplus-Quickedit+.CodeMirror{font-size:16px}'
		+ 'div.Wikiplus-InterBox{z-index:100}'
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
		}
	} = $.valHooks.textarea ?? {};
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
		}
	};
})();