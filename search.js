/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */
/* eslint-disable require-unicode-regexp */
(() => {
	'use strict';

	/**
	 * I18N消息
	 * @param {string} key 消息键
	 */
	const msg = key => mw.msg(`wphl-${key}`);

	// Prepare elements
	const $search = $('<input>', {class: 'Wikiplus-Quickedit-Search', placeholder: msg('search-placeholder')}),
		$searchClose = $('<span>', {text: '×', id: 'Wikiplus-Quickedit-Search-Close', class: 'Wikiplus-Symbol-Btn'}),
		$searchNext = $('<span>', {text: '▼', id: 'Wikiplus-Quickedit-Search-Next', class: 'Wikiplus-Symbol-Btn'}),
		$searchPrev = $('<span>', {text: '▲', id: 'Wikiplus-Quickedit-Search-Prev', class: 'Wikiplus-Symbol-Btn'}),
		$searchContainer = $('<div>', {
			class: 'Wikiplus-Quickedit-Search-Div',
			html: [$search, $searchNext, $searchPrev, $searchClose],
		}),
		$searchBtn = $('<span>', {class: 'Wikiplus-Btn', html: msg('addon-search')}),
		$replace = $('<input>', {class: 'Wikiplus-Quickedit-Search', placeholder: msg('replace-placeholder')}),
		$replaceClose = $('<span>', {text: '×', id: 'Wikiplus-Quickedit-Replace-Close', class: 'Wikiplus-Symbol-Btn'}),
		$replaceContainer = $('<div>', {
			class: 'Wikiplus-Quickedit-Search-Div',
			html: [$replace, $replaceClose],
		}),
		$replaceBtn = $('<span>', {class: 'Wikiplus-Btn', html: msg('search-replace')});

	const escapeRegExp = mw.util.escapeRegExp || mw.RegExp.escape;
	const /** @type {CodeMirror.Mode<undefined>} */ overlay = {token: /** @override */ () => {}};

	/**
	 * 根据搜索字符串生成高亮
	 * @param {string|RegExp} str 搜索字符串
	 */
	const token = str => {
		const initial = typeof str === 'string' ? new RegExp(`[^${escapeRegExp(str[0])}]`, 'i') : null;

		/**
		 * @override
		 * @param {CodeMirror.StringStream} stream
		 */
		return stream => {
			if (stream.match(str, true, true)) {
				return 'search';
			}
			stream.next();
			if (initial) {
				stream.eatWhile(initial);
			}
			return undefined;
		};
	};

	/** input event handler of `$search` */
	const onInput = () => {
		$search.css('background-color', '').off('input', onInput);
	};

	let /** @type {string|RegExp} */ lastPtn,
		/** @type {CodeMirror.SearchCursor} */ cursor;
	/**
	 * keyboard event handler of `$search`
	 * @param {CodeMirror.Editor} cm
	 * @param {boolean} dir 搜索方向
	 */
	const findNext = (cm, dir) => {
		let /** @type {string|RegExp} */ ptn = $search.val();
		if (!ptn) {
			return;
		} else if (typeof ptn === 'string' && /^\/.+\/i?$/u.test(ptn)) {
			ptn = new RegExp(ptn.slice(1, -2), ptn.endsWith('i') ? 'im' : 'm');
		}
		if (ptn !== lastPtn) {
			cm.removeOverlay(overlay);
			overlay.token = token(ptn);
			cm.addOverlay(overlay);
			lastPtn = ptn;
			cursor = cm.getSearchCursor(ptn, cm.getCursor(), {caseFold: true});
		}
		let result = dir ? cursor.findNext() : cursor.findPrevious();
		if (!result) {
			if (dir) {
				cursor = cm.getSearchCursor(ptn, {line: 0, ch: 0}, {caseFold: true});
			} else {
				const lastLine = cm.lastLine(),
					{length: lastCh} = cm.getLine(lastLine);
				cursor = cm.getSearchCursor(ptn, {line: lastLine, ch: lastCh}, {caseFold: true});
			}
			result = dir ? cursor.findNext() : cursor.findPrevious();
		}
		if (result) {
			const from = cursor.from(),
				to = cursor.to();
			cm.setSelection(from, to);
			cm.scrollIntoView({from, to});
			onInput();
		} else {
			$search.css('background-color', 'pink').on('input', onInput);
		}
	};

	/**
	 * keyboard event handler of `$replace`
	 * @param {CodeMirror.Editor} cm
	 */
	const replace = async cm => {
		let /** @type {string|RegExp} */ ptn = $search.val();
		if (!ptn) {
			return;
		} else if (typeof ptn === 'string' && /^\/.+\/i?$/u.test(ptn)) {
			ptn = new RegExp(ptn.slice(1, -2), ptn.endsWith('i') ? 'im' : 'm');
		}
		if (ptn !== lastPtn) {
			cm.removeOverlay(overlay);
			overlay.token = token(ptn);
			cm.addOverlay(overlay);
			lastPtn = ptn;
			cursor = cm.getSearchCursor(ptn, cm.getCursor(), {caseFold: true});
		}
		const replacePtn = typeof ptn === 'string'
				? new RegExp(escapeRegExp(ptn), 'gim')
				: new RegExp(ptn, `g${ptn.flags}`),
			val = cm.getValue(),
			mt = val.match(replacePtn);
		if (mt) {
			const bool = await OO.ui.confirm(mw.libs.wphl.msg('replace-count', mt.length));
			if (bool) {
				cm.setValue(val.replace(replacePtn, $replace.val()));
				$replaceContainer.hide();
			}
		}
	};

	/** click event handler of `$searchBtn` */
	const findNew = () => {
		$searchContainer.show();
		$search.select().focus()[0]
			.scrollIntoView({behavior: 'smooth'});
	};

	/** click event handler of `$replaceBtn` */
	const replaceNew = () => {
		$replaceContainer.show();
		if ($searchContainer.is(':hidden')) {
			findNew();
		}
	};

	/**
	 * click event handler of `$searchClose`
	 * @param {CodeMirror.Editor} cm
	 */
	const reset = cm => {
		cm.removeOverlay(overlay);
		$searchContainer.hide();
		$replaceContainer.hide();
		lastPtn = '';
	};

	CodeMirror.commands.findForward = /** 向后搜索 */ doc => {
		findNext(doc, true);
	};
	CodeMirror.commands.findBackward = /** 向前搜索 */ doc => {
		findNext(doc, false);
	};
	CodeMirror.commands.replace = /** 全部替换 */ doc => {
		replace(doc);
	};

	mw.hook('wiki-codemirror').add(/** @param {CodeMirror.Editor} cm */ cm => {
		if (!cm.getOption('styleSelectedText') || mw.libs.wphl.addons.has('wikiEditor')) {
			return;
		}
		const $textarea = $(cm.getWrapperElement()).prev('#Wikiplus-Quickedit');
		if ($textarea.length === 0) {
			return;
		}
		$searchContainer.hide().insertBefore($textarea);
		$searchBtn.click(findNew).insertAfter('#Wikiplus-Quickedit-Jump');
		$searchClose.click(() => {
			reset(cm);
		});
		$searchNext.click(() => {
			findNext(cm, true);
		});
		$searchPrev.click(() => {
			findNext(cm, false);
		});
		$search.val('').keydown(e => {
			if (e.key === 'Enter') {
				e.preventDefault();
				findNext(cm, true);
			} else if (e.key === 'Escape') {
				e.stopPropagation();
				reset(cm);
			}
		});
		$replaceContainer.hide().insertBefore($textarea);
		$replaceBtn.click(replaceNew).insertAfter($searchBtn);
		$replaceClose.click(() => {
			$replaceContainer.hide();
		});
		$replace.val('').keydown(e => {
			if (e.key === 'Enter') {
				e.preventDefault();
				replace(cm);
			} else if (e.key === 'Escape') {
				e.stopPropagation();
				$replaceContainer.hide();
			}
		});
		cm.addKeyMap(
			CodeMirror.keyMap.default === CodeMirror.keyMap.pcDefault
				? {
					'Ctrl-F': findNew,
					'Ctrl-G': 'findForward',
					'Shift-Ctrl-G': 'findBackward',
					'Shift-Ctrl-F': replaceNew,
					'Shift-Ctrl-R': 'replace',
				}
				: {
					'Cmd-F': findNew,
					'Cmd-G': 'findForward',
					'Shift-Cmd-G': 'findBackward',
					'Cmd-Alt-F': replaceNew,
					'Shift-Cmd-Alt-F': 'replace',
				},
		);
	});

	mw.loader.addStyleTag(
		'.Wikiplus-Btn{line-height:1.4}'
		+ '.Wikiplus-Quickedit-Search-Div{margin:7px 0 5px;}'
		+ '.Wikiplus-Symbol-Btn{font-size:20px;margin:7px;vertical-align:middle;cursor:pointer;}'
		+ '.Wikiplus-Quickedit-Search{width:50%;padding:revert;border:revert;background:revert;vertical-align:middle}'
		+ '.cm-search{background-color:#ffc0cb83;}'
		+ 'span.CodeMirror-selectedtext{background:#d7d4f0}',
	);
})();
