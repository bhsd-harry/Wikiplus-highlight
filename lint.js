/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	/* global Parser */
	'use strict';

	const include = mw.config.get('wgNamespaceNumber') === 10 && !mw.config.get('wgPageName').endsWith('/doc'),
		lintOptions = {delay: 5000, selfContain: true},
		{cmpPos, Pos} = CodeMirror;

	/**
	 * annotationSource
	 * @param {string} str wikitext
	 * @returns {CodeMirror.LintAnnotation}
	 */
	const annotate = str => {
		const errors = Parser.parse(str, include).lint();
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
		'.CodeMirror-line .CodeMirror-lint-mark-warning{background:#ffbf00;color:#fff}'
		+ '.CodeMirror-line .CodeMirror-lint-mark-error{background:#d33;color:#fff}'
		+ '.CodeMirror-lint-scroll-warn{'
			+ 'background:#fc3;border-top:1px solid #fc3;border-bottom:1px solid #fc3;box-sizing:border-box'
		+ '}'
		+ '.CodeMirror-lint-scroll-error{'
			+ 'background:#d33;border-top:1px solid #d33;border-bottom:1px solid #d33;box-sizing:border-box'
		+ '}'
		+ '#wphl-lint-panel{background:#f7f7f7;border:1px solid #c8ccd1}'
		+ '.wphl-lint-subpanel{margin-left:1ch;cursor:pointer}'
		+ '.wphl-lint-count{display:inline-block;width:5ch;padding:1px 0 1px 1ch;vertical-align:text-bottom}',
	);
	CodeMirror.registerHelper('lint', 'mediawiki', annotate);

	/**
	 * start linting
	 * @param {CodeMirror.Editor} cm
	 */
	const lint = cm => {
		const mode = cm.getOption('mode');
		if (mode !== 'mediawiki' && mode !== 'text/mediawiki') {
			return;
		} else if (!Parser.config) {
			const {config: {values: {wgFormattedNamespaces, wgNamespaceIds}}} = mw,
				{minConfig: {parserFunction: [withPound,, ...modifiers]}} = Parser,
				valuesWithPound = new Set(Object.values(withPound)),
				{tags, functionSynonyms: [insensitive, sensitive], doubleUnderscore, img} = cm.getOption('mwConfig');
			for (const [k, v] of Object.entries(insensitive)) {
				if (valuesWithPound.has(v) && !k.startsWith('#')) {
					delete insensitive[k];
					insensitive[`#${k}`] = v;
				}
			}
			Parser.config = {
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
		}
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
				const iNext = annotations.findIndex(({from}) => cmpPos(from, cm.getCursor()) >= 0),
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
			$panelElement = $('<div>', {id: 'wphl-lint-panel', html: [$panelError, $panelWarn]});

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
			switchOption = () => {
				if (cm.state.lint) {
					cm.setOption('lint', false);
					annotateScrollWarn.update([]);
					annotateScrollError.update([]);
					$panelElement.detach();
				} else {
					cm.setOption('lint', {...lintOptions, ...mw.libs.wphl.lintOptions, onUpdateLinting});
					$panelElement.insertAfter(cm.getWrapperElement());
				}
			};
		cm.setOption('gutters', ['CodeMirror-lint-markers']);
		switchOption();
		cm.addKeyMap(mw.libs.wphl.isPc(CodeMirror)
			? {'Ctrl-K': performLint, 'Ctrl-L': switchOption}
			: {'Cmd-K': performLint, 'Cmd-L': switchOption});
		cm.on('viewportChange', () => {
			if (cm.state.lint) {
				clearTimeout(cm.state.lint.timeout);
				cm.state.lint.timeout = setTimeout(performLint, cm.state.lint.options.delay);
			}
		});
		cm.on('cursorActivity', () => {
			positionMap.clear();
		});
	};

	mw.hook('wiki-codemirror').add(/** @param {CodeMirror.Editor} cm */ cm => {
		if (mw.libs.wphl.addons.has('lint') && cm.getTextArea && cm.getTextArea().id === 'Wikiplus-Quickedit') {
			lint(cm);
		}
	});
})();
