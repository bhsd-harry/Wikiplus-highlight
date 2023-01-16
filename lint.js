/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	/* global Parser */
	'use strict';

	const include = mw.config.get('wgNamespaceNumber') === 10 && !mw.config.get('wgPageName').endsWith('/doc');

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
				from: CodeMirror.Pos(startLine, startCol),
				to: CodeMirror.Pos(endLine, endCol),
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
		+ '}',
	);
	CodeMirror.registerHelper('lint', 'mediawiki', annotate);

	/**
	 * start linting
	 * @param {CodeMirror.Editor} cm
	 */
	const lint = cm => {
		if (!['mediawiki', 'text/mediawiki'].includes(cm.getOption('mode'))) {
			return;
		} else if (!Parser.config) {
			const {config: {values: {wgFormattedNamespaces, wgNamespaceIds}}} = mw,
				{minConfig: {parserFunction}} = Parser,
				{
					tags, functionSynonyms: [insensitive, sensitive], doubleUnderscore, urlProtocols, img,
				} = cm.getOption('mwConfig');
			Parser.config = {
				ext: Object.keys(tags),
				namespaces: wgFormattedNamespaces,
				nsid: wgNamespaceIds,
				parserFunction: [
					mw.loader.getState('ext.CodeMirror.data') === 'ready'
						? Object.keys(insensitive)
						: parserFunction[0],
					Object.keys(sensitive),
					...parserFunction.slice(2),
				],
				doubleUnderscore: doubleUnderscore.map(Object.keys),
				protocol: urlProtocols.replaceAll('\\:', ':'),
				img: Object.fromEntries(Object.entries(img).map(([k, v]) => [k, v.slice(4)])),
			};
		}
		cm.setOption('scrollButtonHeight', 0);
		const annotateScrollError = cm.annotateScrollbar('CodeMirror-lint-scroll-error'),
			annotateScrollWarn = cm.annotateScrollbar('CodeMirror-lint-scroll-warn');

		/**
		 * update linting
		 * @param {CodeMirror.LintAnnotation[]} annotations all annotations
		 */
		const onUpdateLinting = annotations => {
				annotateScrollError.update(annotations.filter(({severity}) => severity !== 'warning'));
				annotateScrollWarn.update(annotations.filter(({severity}) => severity === 'warning'));
			},
			performLint = () => {
				cm.performLint();
			},
			option = {delay: 5000, selfContain: true, onUpdateLinting},
			switchOption = () => {
				if (cm.state.lint) {
					cm.setOption('lint', false);
					annotateScrollError.update([]);
					annotateScrollWarn.update([]);
				} else {
					cm.setOption('lint', option);
					performLint();
				}
			};
		cm.setOption('gutters', ['CodeMirror-lint-markers']);
		cm.setOption('lint', option);
		cm.addKeyMap(mw.libs.wphl.isPc(CodeMirror)
			? {'Ctrl-K': performLint, 'Ctrl-L': switchOption}
			: {'Cmd-K': performLint, 'Cmd-L': switchOption});
		cm.on('viewportChange', () => {
			if (cm.state.lint) {
				clearTimeout(cm.state.lint.timeout);
				cm.state.lint.timeout = setTimeout(performLint, cm.state.lint.options.delay);
			}
		});
	};

	mw.hook('wiki-codemirror').add(/** @param {CodeMirror.Editor} cm */ cm => {
		if (mw.libs.wphl.addons.has('lint') && cm.getTextArea && cm.getTextArea().id === 'Wikiplus-Quickedit') {
			lint(cm);
		}
	});
})();
