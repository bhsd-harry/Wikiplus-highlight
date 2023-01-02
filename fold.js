/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */

(() => {
	/* eslint-disable func-style */
	'use strict';

	const {Pos, cmpPos, Init} = CodeMirror;

	/**
	 * 只用于`title`属性的消息，不存在时fallback到键名
	 * @param {string} key 消息键
	 * @param {string|undefined} argKey 额外参数的消息键
	 * @returns {string}
	 */
	const msg = (key, argKey) => {
		const fullKey = `wphl-${key}`,
			message = (argKey === undefined ? mw.msg(fullKey) : mw.msg(fullKey, msg(argKey)))
				.replace(/&lt;/gu, '<').replace(/&gt;/gu, '>');
		return message === `⧼${fullKey}⧽` ? key : message;
	};

	const braceRegex = /\bmw-template-bracket\b/u,
		$placeholder = $('<span>', {text: '\u22ef', class: 'CodeMirror-widget-unfold'}),
		$delimiter = $('<span>', {text: '|', class: 'cm-mw-template-delimiter'}),
		$tt = $('<div>', {class: 'CodeMirror-tooltip', text: '\uff0d'}).click(
			/** @this {HTMLDivElement} */
			function() {
				const /** @type {CodeMirror.FoldData} */ {cm, from, to, type} = $(this).fadeOut('fast').data(),
					notTag = type === 'template' || type === 'comment',
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
			},
		);

	/**
	 * 隐藏tooltip
	 * @param {JQuery<HTMLElement>} $tooltip tooltip
	 */
	function hideTooltip($tooltip) {
		let timeout = -1,
			executeTime = 0;
		return /** @param {number} wait */ (wait, update = true) => {
			if (update || executeTime - Date.now() > wait) {
				clearTimeout(timeout);
				timeout = setTimeout(() => {
					$tooltip.fadeOut('fast');
					timeout = -1;
				}, wait);
				executeTime = Date.now() + wait;
			}
		};
	}

	/**
	 * 搜索括号
	 * @param {CodeMirror.Editor} cm
	 * @param {CodeMirror.Position} where 当前位置
	 * @param {1|-1} dir 搜索方向
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
		for (let {line, ch: chWhere} = where; line !== lineEnd; line += dir) {
			const curLine = cm.getLine(line);
			if (!curLine) {
				continue;
			}
			const {length: l} = curLine;
			if (l > maxScanLen) {
				continue;
			}
			const end = dir > 0 ? l : -1;
			let pos = dir > 0 ? 0 : l - 1;
			if (line === where.line) { // eslint-disable-line unicorn/consistent-destructuring
				pos = chWhere - (dir > 0 ? 0 : 1); // `dir = 1`时不包含当前字符，`dir = -1`时包含当前字符
			}
			for (; pos !== end; pos += dir) {
				const ch = curLine.charAt(pos);
				if (!hasDelimiter && /[^\s|]/u.test(ch)) {
					delimiter = Pos(line, pos + 1);
				}
				if (!(hasDelimiter ? /[{}]/u : /[{}|]/u).test(ch)) {
					continue;
				}
				const type = cm.getTokenTypeAt(Pos(line, pos + 1)) || '';
				if (ch === '|' && stack === 0 && /\bmw-template-delimiter\b/u.test(type)) {
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
	 * 搜索模板
	 * @param {CodeMirror.Editor} cm
	 * @param {CodeMirror.Position} cursor 当前位置
	 * @returns {CodeMirror.MarkerRange}
	 */
	function findEnclosingTemplate(cm, cursor) {
		const type = cm.getTokenTypeAt(cursor) || '';
		if (!/\bmw-template\d*-ground\b/u.test(type) || /\bmw-template-(?:bracket|name)\b/u.test(type)) {
			return undefined;
		}
		const {to: bracket} = scanForDelimiterAndBracket(cm, cursor, -1);
		if (!bracket) {
			return undefined;
		}
		const {from, to} = scanForDelimiterAndBracket(cm, bracket, 1);
		if (typeof from === 'object' && (from.line < to.line || from.ch < to.ch - 2)) {
			return {from, to};
		}
		return undefined;
	}

	/**
	 * 搜索注释
	 * @param {CodeMirror.Editor} cm
	 * @param {CodeMirror.Position} cursor 当前位置
	 * @returns {CodeMirror.MarkerRange|undefined}
	 */
	function findEnclosingComment(cm, cursor) {
		const {type, string, start, end} = cm.getTokenAt(cursor),
			{ch} = cursor;
		if (!/\bmw-comment\b/u.test(type)
			|| string.startsWith('<!--') && ch <= start + 4
			|| string.endsWith('-->') && ch >= end - 3
		) {
			return undefined;
		}
		const index = cm.indexFromPos(cursor),
			text = cm.getValue(),
			fromIndex = text.slice(0, index - 1).search(/<!--(?:(?!-->).)*$/su);
		let toIndex = text.slice(index).indexOf('-->');
		toIndex = toIndex === -1 ? text.length : toIndex + index;
		return {from: cm.posFromIndex(fromIndex + 4), to: cm.posFromIndex(toIndex)};
	}

	/**
	 * 显示tooltip
	 * @param {CodeMirror.EditorFoldable} cm
	 */
	function showTooltip(cm) {
		const {state: {fold: {$tooltip, hide}}} = cm;
		cm.operation(() => {
			if (cm.somethingSelected()) {
				hide(500, false);
				return;
			}
			const cursor = cm.getCursor();
			let range = findEnclosingComment(cm, cursor),
				type = 'comment';
			if (!range) {
				const template = findEnclosingTemplate(cm, cursor);
				let tags = cm.findEnclosingTag(cursor);
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
			const {top: t, left} = cm.charCoords(cursor, 'local'),
				height = $tooltip.outerHeight(),
				notTag = type === 'template' || type === 'comment';
			$tooltip.attr('title', msg('fold', notTag ? `fold-${type}` : `<${type}>`))
				.toggleClass('cm-mw-htmltag-name', !notTag)
				.toggleClass('cm-mw-template-name', type === 'template')
				.toggleClass('cm-mw-comment', type === 'comment')
				.css({top: t > height ? t - height : t + 17, left})
				.data({...range, type})
				.show();
			hide(5000);
		});
	}

	CodeMirror.defineExtension(
		'scanForDelimiterAndBracket',

		/**
		 * @this {CodeMirror.Editor}
		 * @param {CodeMirror.Position} where
		 * @param {1|-1} dir
		 */
		function(where, dir) {
			return scanForDelimiterAndBracket(this, where || this.getCursor(), dir || 1);
		},
	);

	CodeMirror.defineExtension(
		'findEnclosingTemplate',

		/**
		 * @this {CodeMirror.Editor}
		 * @param {CodeMirror.Position} pos
		 */
		function(pos) {
			return findEnclosingTemplate(this, pos || this.getCursor());
		},
	);

	CodeMirror.defineExtension(
		'findEnclosingComment',

		/**
		 * @this {CodeMirror.Editor}
		 * @param {CodeMirror.Position} pos
		 */
		function(pos) {
			return findEnclosingComment(this, pos || this.getCursor());
		},
	);

	CodeMirror.defineOption('fold', false, (/** @type {CodeMirror.EditorFoldable} */ cm, val, old) => {
		if (old && old !== Init) {
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
