/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	/* global Parser */
	'use strict';

	const include = mw.config.get('wgNamespaceNumber') === 10 && !mw.config.get('wgPageName').endsWith('/doc'),
		lintOptions = {delay: 5000, selfContain: true};

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
		const annotateScrollWarn = cm.annotateScrollbar('CodeMirror-lint-scroll-warn'),
			annotateScrollError = cm.annotateScrollbar('CodeMirror-lint-scroll-error');

		/**
		 * update linting
		 * @param {CodeMirror.LintAnnotation[]} annotations all annotations
		 */
		const onUpdateLinting = annotations => {
				annotateScrollWarn.update(annotations.filter(({severity}) => severity === 'warning'));
				annotateScrollError.update(annotations.filter(({severity}) => severity !== 'warning'));
			},
			performLint = () => {
				cm.performLint();
			},
			switchOption = () => {
				if (cm.state.lint) {
					cm.setOption('lint', false);
					annotateScrollWarn.update([]);
					annotateScrollError.update([]);
				} else {
					cm.setOption('lint', {...lintOptions, onUpdateLinting});
					performLint();
				}
			};
		cm.setOption('gutters', ['CodeMirror-lint-markers']);
		cm.setOption('lint', {...lintOptions, onUpdateLinting});
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

	mw.libs.wphl.lintOptions = lintOptions;
})();
