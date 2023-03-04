/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	/* global wikiparse */
	'use strict';

	/** 加载 I18N */
	const {libs: {wphl: {version, storage, addons, lintOptions, CDN, PARSER_CDN, isPc, getMwConfig}}} = mw,
		/** @type {Record<string, string>} */ i18n = storage.getObject('wikiparser-i18n') || {},
		/** @type {Record<string, string>} */ i18nLanguages = {
			zh: 'zh-hans',
			'zh-hans': 'zh-hans',
			'zh-cn': 'zh-hans',
			'zh-my': 'zh-hans',
			'zh-sg': 'zh-hans',
			'zh-hant': 'zh-hant',
			'zh-tw': 'zh-hant',
			'zh-hk': 'zh-hant',
			'zh-mo': 'zh-hant',
		},
		i18nLang = i18nLanguages[mw.config.get('wgUserLanguage')],
		I18N_CDN = i18nLang && `${CDN}/${PARSER_CDN}/i18n/${i18nLang}.json`;
	if (i18nLang) {
		(async () => {
			if (i18n['wphl-version'] !== version || i18n['wphl-lang'] !== i18nLang) {
				Object.assign(
					i18n,
					await $.ajax(`${I18N_CDN}`, {dataType: 'json', cache: true}),
					{'wphl-version': version, 'wphl-lang': i18nLang},
				);
				storage.setObject('wikiparser-i18n', i18n);
			}
			wikiparse.setI18N(i18n);
		})();
	}

	const include = mw.config.get('wgNamespaceNumber') === 10 && !mw.config.get('wgPageName').endsWith('/doc'),
		{cmpPos, Pos} = CodeMirror;

	/**
	 * annotationSource
	 * @param {string} str wikitext
	 * @param {CodeMirror.Editor} cm
	 * @returns {Promise<CodeMirror.LintAnnotation>}
	 */
	const annotate = async (str, _, cm) => {
		const errors = await cm.Linter.queue(str);
		return errors.map(error => {
			const {startLine, startCol, endLine, endCol, message, severity} = error,
				lineErrors = errors.filter(({startLine: line}) => line === startLine);
			return {
				message: message + '\u200B'.repeat(lineErrors.indexOf(error)),
				severity,
				from: Pos(startLine, startCol),
				to: Pos(endLine, endCol),
			};
		});
	};

	CodeMirror.registerHelper('lint', 'mediawiki', annotate);

	/**
	 * start linting
	 * @param {CodeMirror.Editor} cm
	 */
	const lint = async cm => {
		const mode = cm.getOption('mode');
		if (mode !== 'mediawiki' && mode !== 'text/mediawiki') {
			return;
		} else if (!wikiparse.config) {
			const {config: {values: {wgFormattedNamespaces, wgNamespaceIds}}} = mw,
				{parserFunction: [withPound,, ...modifiers]} = await wikiparse.getConfig(),
				valuesWithPound = new Set(Object.values(withPound)),
				{tags, functionSynonyms: [insensitive, sensitive], doubleUnderscore, img} = cm.getOption('mwConfig');
			for (const [k, v] of Object.entries(insensitive)) {
				if (valuesWithPound.has(v) && !k.startsWith('#')) {
					delete insensitive[k];
					insensitive[`#${k}`] = v;
				}
			}
			if (!img) {
				Object.assign(img, (await getMwConfig('mediawiki')).img);
			}
			wikiparse.config = {
				ext: Object.keys(tags),
				namespaces: wgFormattedNamespaces,
				nsid: wgNamespaceIds,
				parserFunction: [
					insensitive,
					Object.keys(sensitive),
					...modifiers,
				],
				doubleUnderscore: doubleUnderscore.map(Object.keys),
				img: Object.fromEntries(Object.entries(img).map(([k, v]) => [k, v.slice(4)])),
			};
			wikiparse.setConfig(wikiparse.config);
		}
		cm.Linter = new wikiparse.Linter(include);
		cm.setOption('scrollButtonHeight', 0);
		let /** @type {CodeMirror.LintAnnotation[]} */ errors, /** @type {CodeMirror.LintAnnotation[]} */ warnings;
		const /** @type {Map<CodeMirror.LintAnnotation[], number>} */ positionMap = new Map();

		/**
		 * jump to next mark
		 * @param {CodeMirror.LintAnnotation[]} annotations 错误标记
		 */
		const nextMark = annotations => {
			const {length} = annotations;
			if (length > 0) {
				const cursor = cm.getCursor(),
					iNext = Math.max(0, annotations.findIndex(({from}) => cmpPos(from, cursor) >= 0)),
					offset = positionMap.get(annotations) || 0;
				cm.scrollIntoView(annotations[(iNext + offset) % length].from);
				positionMap.set(annotations, offset + 1);
			}
		};
		const annotateScrollWarn = cm.annotateScrollbar('CodeMirror-lint-scroll-warn'),
			annotateScrollError = cm.annotateScrollbar('CodeMirror-lint-scroll-error'),
			$panelErrorCount = $('<span>', {class: 'wphl-lint-count'}),
			$panelWarnCount = $('<span>', {class: 'wphl-lint-count'}),
			$panelError = $('<span>', {
				class: 'wphl-lint-subpanel',
				html: [$('<span>', {class: 'CodeMirror-lint-marker CodeMirror-lint-marker-error'}), $panelErrorCount],
			}).click(() => {
				nextMark(errors);
			}),
			$panelWarn = $('<span>', {
				class: 'wphl-lint-subpanel',
				html: [$('<span>', {class: 'CodeMirror-lint-marker CodeMirror-lint-marker-warning'}), $panelWarnCount],
			}).click(() => {
				nextMark(warnings);
			}),
			$panelElement = $('<div>', {id: 'wphl-lint-panel', html: [$panelError, $panelWarn]}),
			$lineDiv = $(cm.display.lineDiv);

		/**
		 * update linting
		 * @param {CodeMirror.LintAnnotation[]} annotations all annotations
		 */
		const onUpdateLinting = annotations => {
				errors = annotations.filter(({severity}) => severity !== 'warning');
				warnings = annotations.filter(({severity}) => severity === 'warning');
				annotateScrollWarn.update(warnings);
				annotateScrollError.update(errors);
				$panelErrorCount.text(errors.length);
				$panelWarnCount.text(warnings.length);
			},
			performLint = () => {
				cm.performLint();
			},
			onInput = () => {
				clearTimeout(cm.state.lint.timeout);
			},
			switchOption = () => {
				if (cm.state.lint) {
					cm.setOption('lint', false);
					$lineDiv.off('input', onInput);
					annotateScrollWarn.update([]);
					annotateScrollError.update([]);
					$panelElement.detach();
				} else {
					cm.setOption('lint', {
						delay: 1000, ...lintOptions, selfContain: true, onUpdateLinting,
					});
					$lineDiv.on('input', onInput);
					$panelElement.insertAfter(cm.getWrapperElement());
				}
			};
		cm.setOption('gutters', ['CodeMirror-lint-markers']);
		switchOption();
		const ctrl = isPc(CodeMirror) ? 'Ctrl' : 'Cmd';
		cm.addKeyMap({[`${ctrl}-K`]: performLint, [`${ctrl}-L`]: switchOption});
		cm.on('cursorActivity', () => {
			positionMap.clear();
		});
	};

	/**
	 * 分离hook函数以便调试
	 * @param {CodeMirror.Editor} cm
	 */
	const hook = cm => {
		if (addons.has('lint') && cm.getTextArea
			&& (addons.has('otherEditors') || cm.getTextArea().id === 'Wikiplus-Quickedit')
		) {
			lint(cm);
		}
	};
	mw.hook('wiki-codemirror').add(hook);
	mw.hook('InPageEdit.quickEdit.codemirror').add(
		/** @param {{cm: CodeMirror.Editor}} */ ({cm: doc}) => hook(doc),
	);
	mw.hook('inspector').add(hook);
	mw.libs.wphl.lintHook = hook;
})();
