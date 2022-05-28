/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	'use strict';

	const {Pos, cmpPos} = CodeMirror;

	/**
	 * @param {string} key
	 * @param {string|undefined} argKey
	 * @returns {string}
	 */
	const msg = (key, argKey) => argKey === undefined ? mw.msg(`wphl-${key}`) : mw.msg(`wphl-${key}`, msg(argKey));

	const braceRegex = /\bmw-template-bracket\b/,
		$placeholder = $('<span>', {text: '\u22ef'}),
		$tt = $('<div>', {class: 'CodeMirror-tooltip', text: '\uff0d'}).click(function() {
			/** @type {{cm: CodeMirror.Editor, from: CodeMirror.Position, to: CodeMirror.Position, type: string}} */
			const {cm, from, to, type} = $(this).fadeOut('fast').data(),
				$clonedPlaceholder = $placeholder.clone().attr('title', msg('unfold', `fold-${type}`)),
				mark = cm.markText(from, to, {
					replacedWith: $clonedPlaceholder[0],
					selectLeft: false,
					selectRight: false,
					_isFold: true,
				});
			$clonedPlaceholder.click(() => {
				mark.clear();
			});
		});

	/** @param {JQuery<HTMLElement>} $tooltip */
	function hideTooltip($tooltip) {
		let /** @type {?number} */ timeout = null,
			executeTime = 0;
		return /** @param {number} wait */ (wait, update = true) => {
			if (update || executeTime - Date.now() > wait) {
				clearTimeout(timeout);
				timeout = setTimeout(() => {
					$tooltip.fadeOut('fast');
					timeout = null;
				}, wait);
				executeTime = Date.now() + wait;
			}
		};
	}

	/**
	 * @param {CodeMirror.Editor} cm
	 * @param {CodeMirror.Position} where
	 * @param {1|-1} dir
	 */
	function scanForDelimiterAndBracket(cm, where, dir) {
		const maxScanLen = 10000,
			maxScanLines = 1000,
			lineEnd = dir > 0
				? Math.min(cm.lastLine() + 1, where.line + maxScanLines)
				: Math.max(cm.firstLine() - 1, where.line - maxScanLines);
		let stack = 0,
			/** @type {CodeMirror.Position|boolean} */ delimiter = dir < 0;
		for (let {line} = where; line !== lineEnd; line += dir) {
			const curLine = cm.getLine(line);
			if (!curLine) {
				continue;
			}
			const {length} = curLine;
			if (length > maxScanLen) {
				continue;
			}
			const end = dir > 0 ? length : -1;
			let pos = dir > 0 ? 0 : length - 1;
			if (line === where.line) {
				pos = where.ch - (dir > 0 ? 0 : 1); // dir = 1时不包含当前字符，dir = -1时包含当前字符
			}
			for (; pos !== end; pos += dir) {
				const ch = curLine.charAt(pos);
				if (!(delimiter ? /[{}]/ : /[{}|]/).test(ch)) {
					continue;
				}
				const type = cm.getTokenTypeAt(Pos(line, pos + 1)) || '';
				if (ch === '|' && stack === 0 && /\bmw-template-delimiter\b/.test(type)) {
					delimiter = Pos(line, pos + 1);
				} else if (ch === '|' || !braceRegex.test(type)) {
					continue;
				} else if (dir > 0 && ch === '{' || dir < 0 && ch === '}') {
					stack++;
				} else if (stack > 0) {
					stack--;
				} else {
					return {delimiter, bracket: Pos(line, pos + (dir > 0 ? 0 : 1))};
				}
			}
		}
		return {};
	}

	/**
	 * @param {CodeMirror.Editor} cm
	 * @param {CodeMirror.Position} cursor
	 * @returns {CodeMirror.MarkerRange}
	 */
	function findEnclosingTemplate(cm, cursor) {
		const type = cm.getTokenTypeAt(cursor) || '';
		if (!/\bmw-template\d*-ground\b/.test(type) || /\bmw-template-(?:bracket|name)\b/.test(type)) {
			return;
		}
		const {bracket} = scanForDelimiterAndBracket(cm, cursor, -1);
		if (!bracket) {
			return;
		}
		const {delimiter: from, bracket: to} = scanForDelimiterAndBracket(cm, bracket, 1);
		if (typeof from === 'object' && cmpPos(from, to) < 0) {
			return {from, to};
		}
	}

	/** @param {CodeMirror.Editor} cm */
	function showTooltip(cm) {
		/** @type {{$tooltip: JQuery<HTMLElement>, hide: (wait: number, update?: boolean) => void}} */
		const {$tooltip, hide} = cm.state.fold;
		cm.operation(() => {
			if (cm.somethingSelected()) {
				hide(500, false);
				return;
			}
			const cursor = cm.getCursor(),
				template = findEnclosingTemplate(cm, cursor),
				/** @type {{close: CodeMirror.MarkerRange, open: CodeMirror.MarkerRange}} */
				tags = cm.findEnclosingTag(cursor);
			let /** @type {CodeMirror.MarkerRange} */ range,
				/** @type {string} */ type;
			if (!template && !tags) {
				hide(500, false);
				return;
			} else if (!tags || template && cmpPos(template.from, tags.open.to) > 0) {
				range = template;
				type = 'template';
			} else {
				range = {from: tags.open.to, to: tags.close.from};
				type = 'tag';
			}
			const {top, left} = cm.charCoords(cursor, 'local'),
				height = $tooltip.outerHeight();
			$tooltip.attr('title', msg('fold', `fold-${type}`))
				.toggleClass('cm-mw-htmltag-name', type === 'tag')
				.toggleClass('cm-mw-template-name', type === 'template')
				.css({top: top > height ? top - height : top + 17, left})
				.data({...range, type})
				.show();
			hide(5000);
		});
	}

	CodeMirror.defineOption('fold', false, (cm, val, old) => {
		if (old && old !== CodeMirror.Init) {
			cm.off('cursorActivity', showTooltip);
			if (cm.state.fold) {
				cm.state.fold.$tooltip.remove();
			}
		}
		if (val) {
			const $tooltip = $tt.clone(true).data('cm', cm).hide().appendTo(
				$(cm.getScrollerElement()).children('.CodeMirror-sizer'),
			);
			cm.state.fold = {$tooltip, hide: hideTooltip($tooltip)};
			cm.on('cursorActivity', showTooltip);
		}
	});

	mw.loader.addStyleTag(
		'.CodeMirror-sizer{overflow:visible}'
		+ '.CodeMirror-tooltip{position:absolute;z-index:101;cursor:pointer;'
		+ 'background-color:#ffd;border:1px solid;padding:0 1px;font-size:10pt;line-height:1.2}'
		+ '.CodeMirror-widget{cursor:pointer;border:1px dotted}',
	);
})();
