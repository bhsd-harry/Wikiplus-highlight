/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(async () => {
	'use strict';
	mw.loader.load('//cdn.jsdelivr.net/npm/codemirror@5.65.3/addon/lint/lint.min.css', 'text/css');
	await $.ajax(
		`//cdn.jsdelivr.net/combine/${[
			'npm/codemirror@5.65.3/addon/lint/lint.min.js',
			'gh/bhsd-harry/wikiparser-node@0.4.1-b/bundle/bundle.min.js',
		].join()}`,
		{dataType: 'script', cache: true},
	);
	const {Pos} = CodeMirror,
		/** @type {{Parser: Parser}} */ {Parser} = window,
		/**
		 * annotationSource
		 * @param {string} str wikitext
		 */
		annotate = str => Parser.parse(str).lint().map(({message, startLine, startCol, endLine, endCol}) => ({
			message, from: Pos(startLine, startCol), to: Pos(endLine, endCol),
		}));
	CodeMirror.registerHelper('lint', 'mediawiki', annotate);
	mw.hook('wiki-codemirror').add(cm => {
		if (cm.getOption('mode') === 'mediawiki') {
			cm.setOption('gutters', ['CodeMirror-lint-markers']);
			cm.setOption('lint', true);
		}
	});
})();
