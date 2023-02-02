/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */
/* eslint-disable require-unicode-regexp */
(() => {
	'use strict';
	const {Pos} = CodeMirror,
		{libs: {wphl: {msg, isPc, addons}}} = mw;

	// Prepare elements
	const $search = $('<input>', {class: 'Wikiplus-Quickedit-Search', placeholder: msg('search-placeholder')}),
		$searchClose = $('<span>', {text: '×', class: 'Wikiplus-Symbol-Btn'}),
		$searchNext = $('<span>', {text: '▼', class: 'Wikiplus-Symbol-Btn'}),
		$searchPrev = $('<span>', {text: '▲', class: 'Wikiplus-Symbol-Btn'}),
		$searchContainer = $('<div>', {
			class: 'Wikiplus-Quickedit-Search-Div',
			html: [$search, $searchNext, $searchPrev, $searchClose],
		}),
		$searchBtn = $('<span>', {class: 'Wikiplus-Btn', html: msg('addon-search')}),
		$replace = $('<input>', {class: 'Wikiplus-Quickedit-Search', placeholder: msg('replace-placeholder')}),
		$replaceClose = $('<span>', {text: '×', class: 'Wikiplus-Symbol-Btn'}),
		$replaceNext = $('<span>', {text: '▼', class: 'Wikiplus-Symbol-Btn'}),
		$replacePrev = $('<span>', {text: '▲', class: 'Wikiplus-Symbol-Btn'}),
		$replaceContainer = $('<div>', {
			class: 'Wikiplus-Quickedit-Search-Div',
			html: [$replace, $replaceNext, $replacePrev, $replaceClose],
		}),
		$replaceBtn = $('<span>', {class: 'Wikiplus-Btn', html: msg('search-replace')});

	const escapeRegExp = mw.util.escapeRegExp || mw.RegExp.escape;
	const /** @type {CodeMirror.Mode<undefined>} */ overlay = {token: /** @override */ () => {}};

	/**
	 * 根据搜索字符串生成高亮
	 * @param {string|RegExp} str 搜索字符串
	 */
	const token = str => {
		const initial = typeof str === 'string' && new RegExp(`[^${escapeRegExp(str[0])}]`, 'i');

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

	let /** @type {string} */ lastSource,
		/** @type {CodeMirror.SearchCursor} */ cursor;
	/**
	 * keyboard event handler of `$search`
	 * @param {CodeMirror.Editor} cm
	 * @param {boolean} dir 搜索方向
	 */
	const findNext = (cm, dir) => {
		const /** @type {string} */ source = $search.val();
		if (!source) {
			return;
		} else if (source !== lastSource) {
			const ptn = /^\/.+\/i?$/u.test(source)
				? new RegExp(source.slice(1, -2), source.endsWith('i') ? 'im' : 'm')
				: source;
			cm.removeOverlay(overlay);
			overlay.token = token(ptn);
			cm.addOverlay(overlay);
			lastSource = source;
			cursor = cm.getSearchCursor(ptn, cm.getCursor(), {caseFold: true});
		}
		let result = dir ? cursor.findNext() : cursor.findPrevious();
		if (!result) {
			let pos;
			if (dir) {
				pos = Pos(0, 0);
			} else {
				const lastLine = cm.lastLine();
				pos = Pos(lastLine, cm.getLine(lastLine).length);
			}
			cursor.pos = {from: pos, to: pos};
			cursor.atOccurrence = false;
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
	 * replace one by one
	 * @param {CodeMirror.Editor} cm
	 * @param {boolean} dir 搜索方向
	 */
	const replaceNext = (cm, dir) => {
		const /** @type {string} */ source = $search.val();
		if (!source) {
			return;
		}
		const ptn = /^\/.+\/i?$/u.test(source)
			? new RegExp(source.slice(1, -2), source.endsWith('i') ? 'im' : 'm')
			: source;
		if (source !== lastSource) {
			cm.removeOverlay(overlay);
			overlay.token = token(ptn);
			cm.addOverlay(overlay);
			lastSource = source;
			cursor = cm.getSearchCursor(ptn, cm.getCursor(), {caseFold: true});
		} else if (cursor.atOccurrence) {
			const replace = $replace.val();
			cursor.replace(typeof ptn === 'string' ? replace : cursor.pos.match[0].replace(ptn, replace));
		}
		let result = dir ? cursor.findNext() : cursor.findPrevious();
		if (!result) {
			let pos;
			if (dir) {
				pos = Pos(0, 0);
			} else {
				const lastLine = cm.lastLine();
				pos = Pos(lastLine, cm.getLine(lastLine).length);
			}
			cursor.pos = {from: pos, to: pos};
			cursor.atOccurrence = false;
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
		const /** @type {string} */ source = $search.val();
		if (!source) {
			return;
		}
		const ptn = /^\/.+\/i?$/u.test(source)
			? new RegExp(source.slice(1, -2), source.endsWith('i') ? 'im' : 'm')
			: source;
		if (source !== lastSource) {
			cm.removeOverlay(overlay);
			overlay.token = token(ptn);
			cm.addOverlay(overlay);
			lastSource = source;
			cursor = cm.getSearchCursor(ptn, cm.getCursor(), {caseFold: true});
		}
		const replacePtn = typeof ptn === 'string'
				? new RegExp(escapeRegExp(ptn), 'gim')
				: new RegExp(ptn, `g${ptn.flags}`),
			val = cm.getValue(),
			mt = replacePtn.exec(val);
		if (mt && await OO.ui.confirm(msg('replace-count', mt.length))) {
			cm.setValue(val.replace(replacePtn, $replace.val()));
			$replaceContainer.hide();
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
		lastSource = '';
	};

	CodeMirror.commands.find = findNew;
	CodeMirror.commands.findNext = /** 向后搜索 */ doc => {
		findNext(doc, true);
	};
	CodeMirror.commands.findPrev = /** 向前搜索 */ doc => {
		findNext(doc, false);
	};
	CodeMirror.commands.replace = replaceNew;
	CodeMirror.commands.replaceNext = /** 向后替换 */ doc => {
		replaceNext(doc, true);
	};
	CodeMirror.commands.replaceAll = /** 全文替换 */ doc => { // eslint-disable-line es-x/no-string-prototype-replaceall
		replace(doc);
	};

	mw.hook('wiki-codemirror').add(/** @param {CodeMirror.Editor} cm */ cm => {
		if (!cm.getOption('styleSelectedText') || addons.has('wikiEditor')) {
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
		$replaceNext.click(() => {
			replaceNext(cm, true);
		});
		$replacePrev.click(() => {
			replaceNext(cm, false);
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
		const ctrl = isPc(CodeMirror) ? 'Ctrl' : 'Cmd';
		cm.addKeyMap({
			[`${ctrl}-H`]: 'replace',
			[`Shift-${ctrl}-H`]: 'replaceNext',
			[`${ctrl}-Alt-Enter`]: 'replaceAll',
		});
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
