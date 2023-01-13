/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	/* global Parser */
	'use strict';

	/**
	 * annotationSource
	 * @param {string} str wikitext
	 * @returns {CodeMirror.LintAnnotation}
	 */
	const annotate = str => {
		const errors = Parser.parse(str).lint();
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
					tags, functionSynonyms: [insensitive, sensitive], doubleUnderscore, urlProtocols,
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
		};
		cm.setOption('gutters', ['CodeMirror-lint-markers']);
		cm.setOption('lint', {delay: 5000, selfContain: true, onUpdateLinting});
		cm.addKeyMap({'Cmd-K': /** immediately lint */ () => {
			cm.performLint();
		}});
		cm.on('viewportChange', () => {
			if (cm.state.lint) {
				clearTimeout(cm.state.lint.timeout);
				cm.state.lint.timeout = setTimeout(() => {
					cm.performLint();
				}, cm.state.lint.options.delay);
			}
		});
	};

	mw.hook('wiki-codemirror').add(/** @param {CodeMirror.Editor} cm */ cm => {
		if (mw.libs.wphl.addons.has('lint')
			&& (cm.getTextArea().id === 'Wikiplus-Quickedit' || mw.libs.wphl.addons.has('otherEditors'))
		) {
			lint(cm);
		}
	});
	mw.hook('inspector').add(/** @param {CodeMirror.Editor} cm */ cm => {
		if (mw.libs.wphl.addons.has('lint') && mw.libs.wphl.addons.has('otherEditors')) {
			lint(cm);
		}
	});
	mw.hook('InPageEdit.quickEdit.codemirror').add(/** @param {{cm: CodeMirror.Editor}} */ ({cm}) => {
		if (mw.libs.wphl.addons.has('lint') && mw.libs.wphl.addons.has('otherEditors')) {
			lint(cm);
		}
	});
})();
