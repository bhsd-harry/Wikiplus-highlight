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

	/** download */
	const loadLinter = async () => {
		mw.loader.load('//cdn.jsdelivr.net/npm/codemirror@5.65.3/addon/lint/lint.min.css', 'text/css');
		mw.loader.addStyleTag(
			'.CodeMirror-lint-scroll-warn{'
				+ 'background:#fc3;border-top:1px solid #fc3;border-bottom:1px solid #fc3;box-sizing:border-box'
			+ '}'
			+ '.CodeMirror-lint-scroll-error{'
				+ 'background:#d33;border-top:1px solid #d33;border-bottom:1px solid #d33;box-sizing:border-box'
			+ '}',
		);
		await $.ajax(
			`//cdn.jsdelivr.net/combine/${[
				'npm/codemirror@5.65.3/addon/lint/lint.min.js',
				'npm/codemirror@5.65.3/addon/scroll/annotatescrollbar.min.js',
				'gh/bhsd-harry/wikiparser-node@0.4.8-b/bundle/bundle.min.js',
			].join()}`,
			{dataType: 'script', cache: true},
		);
		CodeMirror.registerHelper('lint', 'mediawiki', annotate);
	};

	/**
	 * start linting
	 * @param {CodeMirror.Editor} cm
	 */
	const lint = async cm => {
		if (cm.getOption('mode') !== 'mediawiki') {
			return;
		}
		cm.setOption('scrollButtonHeight', 0);
		await ('lint' in CodeMirror.optionHandlers ? null : loadLinter());
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
	mw.hook('wiki-codemirror').add(cm => {
		lint(cm);
	});
	mw.hook('InPageEdit.quickEdit.codemirror').add(/** @param {{cm: CodeMirror.Editor}} */ ({cm}) => {
		lint(cm);
	});
})();
