/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	'use strict';

	const {Pos, cmpPos} = CodeMirror;

	/**
	 * 只用于title属性的消息，不存在时fallback到键名
	 * @param {string} key
	 * @param {string|undefined} argKey
	 * @returns {string}
	 */
	const msg = (key, argKey) => {
		const fullKey = `wphl-${key}`,
			message = (argKey === undefined ? mw.msg(fullKey) : mw.msg(fullKey, msg(argKey)))
				.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
		return message === `⧼${fullKey}⧽` ? key : message;
	};

	const braceRegex = /\bmw-template-bracket\b/,
		$placeholder = $('<span>', {text: '\u22ef', class: 'CodeMirror-widget-unfold'}),
		$delimiter = $('<span>', {text: '|', class: 'cm-mw-template-delimiter'}),
		$tt = $('<div>', {class: 'CodeMirror-tooltip', text: '\uff0d'}).click(function() {
			/** @type {{cm: CodeMirror.Editor, from: CodeMirror.Position, to: CodeMirror.Position, type: string}} */
			const {cm, from, to, type} = $(this).fadeOut('fast').data(),
				notTag = ['template', 'comment'].includes(type),
				$clonedPlaceholder = $placeholder.clone()
					.attr('title', msg('unfold', notTag ? `fold-${type}` : `<${type}>`)),
				mark = cm.markText(from, to, {
					replacedWith: type === 'template'
						? $('<span>', {html: [$delimiter.clone(), $clonedPlaceholder]})[0]
						: $clonedPlaceholder[0],
					selectLeft: type === 'template',
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
	 * @returns {CodeMirror.MarkerRange}
	 */
	function scanForDelimiterAndBracket(cm, where, dir) {
		const maxScanLen = 10000,
			maxScanLines = 1000,
			lineEnd = dir > 0
				? Math.min(cm.lastLine() + 1, where.line + maxScanLines)
				: Math.max(cm.firstLine() - 1, where.line - maxScanLines);
		let stack = 0,
			hasDelimiter = dir < 0,
			/** @type {CodeMirror.Position} */ delimiter;
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
				if (!hasDelimiter && /[^\s|]/.test(ch)) {
					delimiter = Pos(line, pos + 1);
				}
				if (!(hasDelimiter ? /[{}]/ : /[{}|]/).test(ch)) {
					continue;
				}
				const type = cm.getTokenTypeAt(Pos(line, pos + 1)) || '';
				if (ch === '|' && stack === 0 && /\bmw-template-delimiter\b/.test(type)) {
					hasDelimiter = true;
				} else if (ch === '|' || !braceRegex.test(type)) {
					continue;
				} else if (dir > 0 && ch === '{' || dir < 0 && ch === '}') {
					stack++;
				} else if (stack > 0) {
					stack--;
				} else {
					return {from: hasDelimiter && delimiter, to: Pos(line, pos + (dir > 0 ? 0 : 1))};
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
		const {to: bracket} = scanForDelimiterAndBracket(cm, cursor, -1);
		if (!bracket) {
			return;
		}
		const {from, to} = scanForDelimiterAndBracket(cm, bracket, 1);
		if (typeof from === 'object' && (from.line < to.line || from.ch < to.ch - 2)) {
			return {from, to};
		}
	}

	/**
	 * @param {CodeMirror.Editor} cm
	 * @param {CodeMirror.Position} cursor
	 * @returns {CodeMirror.MarkerRange|undefined}
	 */
	function findEnclosingComment(cm, cursor) {
		const {type, string, start, end} = cm.getTokenAt(cursor),
			{ch} = cursor;
		if (!/\bmw-comment\b/.test(type)
			|| string.startsWith('<!--') && ch <= start + 4
			|| string.endsWith('-->') && ch >= end - 3
		) {
			return;
		}
		const index = cm.indexFromPos(cursor),
			text = cm.getValue(),
			fromIndex = text.slice(0, index - 1).search(/<!--(?:(?!-->).)*$/s);
		let toIndex = text.slice(index).indexOf('-->');
		toIndex = toIndex === -1 ? text.length : toIndex + index;
		return {from: cm.posFromIndex(fromIndex + 4), to: cm.posFromIndex(toIndex)};
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
				comment = findEnclosingComment(cm, cursor);
			let /** @type {CodeMirror.MarkerRange} */ range,
				/** @type {string} */ type;
			if (comment) {
				range = comment;
				type = 'comment';
			} else {
				const template = findEnclosingTemplate(cm, cursor);
				/**
				 * @typedef {object} enclosingTag
				 * @property {CodeMirror.Position} from
				 * @property {CodeMirror.Position} to
				 * @property {string} tag
				 */
				let /** @type {{close: enclosingTag, open: enclosingTag}} */ tags = cm.findEnclosingTag(cursor);
				if (tags && cmpPos(tags.open.to, tags.close.from) === 0) {
					tags = undefined;
				}
				if (!template && !tags) {
					hide(500, false);
					return;
				} else if (!tags || template && cmpPos(template.from, tags.open.to) > 0) {
					range = template;
					type = 'template';
				} else {
					range = {from: tags.open.to, to: tags.close.from};
					type = tags.open.tag;
				}
			}
			const {top, left} = cm.charCoords(cursor, 'local'),
				height = $tooltip.outerHeight(),
				notTag = ['template', 'comment'].includes(type);
			$tooltip.attr('title', msg('fold', notTag ? `fold-${type}` : `<${type}>`))
				.toggleClass('cm-mw-htmltag-name', !notTag)
				.toggleClass('cm-mw-template-name', type === 'template')
				.toggleClass('cm-mw-comment', type === 'comment')
				.css({top: top > height ? top - height : top + 17, left})
				.data({...range, type})
				.show();
			hide(5000);
		});
	}

	CodeMirror.defineExtension(
		'scanForDelimiterAndBracket',
		/**
		 * @param {CodeMirror.Position} where
		 * @param {1|-1} dir
		 */
		function(where, dir) {
			return scanForDelimiterAndBracket(this, where || this.getCursor(), dir || 1);
		},
	);

	CodeMirror.defineExtension('findEnclosingTemplate', /** @param {CodeMirror.Position} pos */ function(pos) {
		return findEnclosingTemplate(this, pos || this.getCursor());
	});

	CodeMirror.defineExtension('findEnclosingComment', /** @param {CodeMirror.Position} pos */ function(pos) {
		return findEnclosingComment(this, pos || this.getCursor());
	});

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
		+ '.CodeMirror-widget-unfold{cursor:pointer;border:1px dotted}',
	);
})();
