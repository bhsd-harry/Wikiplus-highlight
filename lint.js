/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	/* global wikiparse */
	'use strict';

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

	mw.loader.addStyleTag(
		'.CodeMirror-line .CodeMirror-lint-mark-warning{background:#ffbf00;color:#fff;caret-color:#000}'
		+ '.CodeMirror-line .CodeMirror-lint-mark-error{background:#d33;color:#fff}'
		+ '.CodeMirror-lint-scroll-warn{'
			+ 'background:#fc3;border-top:1px solid #fc3;border-bottom:1px solid #fc3;box-sizing:border-box'
		+ '}'
		+ '.CodeMirror-lint-scroll-error{'
			+ 'background:#d33;border-top:1px solid #d33;border-bottom:1px solid #d33;box-sizing:border-box'
		+ '}'
		+ '#wphl-lint-panel{background:#f7f7f7;border:1px solid #c8ccd1}'
		+ '.wphl-lint-subpanel{margin-left:1ch;cursor:pointer}'
		+ '.wphl-lint-count{display:inline-block;width:5ch;padding:1px 0 1px 1ch}',
	);
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
					cm.setOption('lint', {...mw.libs.wphl.lintOptions, selfContain: true, onUpdateLinting});
					$lineDiv.on('input', onInput);
					$panelElement.insertAfter(cm.getWrapperElement());
				}
			};
		cm.setOption('gutters', ['CodeMirror-lint-markers']);
		switchOption();
		const ctrl = mw.libs.wphl.isPc(CodeMirror) ? 'Ctrl' : 'Cmd';
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
		if (mw.libs.wphl.addons.has('lint') && cm.getTextArea && cm.getTextArea().id === 'Wikiplus-Quickedit') {
			lint(cm);
		}
	};
	mw.hook('wiki-codemirror').add(hook);
	mw.libs.wphl.lintHook = hook;
})();
