/**
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license: GPL-3.0
 */

(() => {
	'use strict';

	const msg = (key) => mw.msg(`wphl-${key}`);

	// Prepare elements
	const $search = $('<input>', {
			id: 'Wikiplus-Quickedit-Search',
			placeholder: msg('search-placeholder')
		}),
		$searchClose = $('<span>', {
			text: '×',
			id: 'Wikiplus-Quickedit-Search-Close',
			class: 'Wikiplus-Symbol-Btn'
		}),
		$searchNext = $('<span>', {
			text: '▼',
			id: 'Wikiplus-Quickedit-Search-Next',
			class: 'Wikiplus-Symbol-Btn'
		}),
		$searchPrev = $('<span>', {
			text: '▲',
			id: 'Wikiplus-Quickedit-Search-Prev',
			class: 'Wikiplus-Symbol-Btn'
		}),
		$searchContainer = $('<div>', {
			id: 'Wikiplus-Quickedit-Search-Div',
			html: [
				$search,
				$searchNext,
				$searchPrev,
				$searchClose
			]
		}),
		$searchBtn = $('<span>', {
			class: 'Wikiplus-Btn',
			text: msg('addon-search')
		});

	const escapeRegExp = mw.util.escapeRegExp ?? mw.RegExp.escape;
	const overlay = {token: () => {}};

	/**
	 * 根据搜索字符串生成高亮
	 */
	const token = (str) => {
		let initial;
		if (typeof str === 'string') {
			initial = RegExp(`[^${escapeRegExp(str[0])}]`, 'i');
		}
		return (stream) => {
			if (stream.match(str, true, true)) {
				return 'search';
			}
			stream.next();
			if (typeof str === 'string') {
				stream.eatWhile(initial);
			}
		};
	};

	// input event handler of $search
	const onInput = () => {
		$search.css('background-color', '').off('input', onInput);
	};

	// keyboard event handler of $search
	let lastPtn, cursor;
	const findNext = (cm, dir) => {
		let ptn = $search.val();
		if (!ptn) {
			return;
		}

		if (/^\/.+\/i?$/.test(ptn)) {
			ptn = ptn.endsWith('i')
				? RegExp(ptn.slice(1, -2), 'i')
				: RegExp(ptn.slice(1, -1));
		}
		if (ptn !== lastPtn) {
			cm.removeOverlay(overlay);
			overlay.token = token(ptn);
			cm.addOverlay(overlay);
			lastPtn = ptn;
			cursor = cm.getSearchCursor(ptn, cm.getCursor(), {caseFold: true});
		}
		const method = dir ? 'findNext' : 'findPrevious';
		let result = cursor[method]();
		if (!result) {
			if (dir) {
				cursor = cm.getSearchCursor(ptn, {line: 0, ch: 0}, {caseFold: true});
			} else {
				const lastLine = cm.lastLine(),
					lastCh = cm.getLine(lastLine).length;
				cursor = cm.getSearchCursor(ptn, {line: lastLine, ch: lastCh}, {caseFold: true});
			}
			result = cursor[method]();
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

	// click event handler of $searchBtn
	const findNew = () => {
		$searchContainer.show();
		$search.select().focus()[0]
			.scrollIntoView({behavior: 'smooth'});
	};

	// click event handler of $searchClose
	const reset = (cm) => {
		cm.removeOverlay(overlay);
		$searchContainer.hide();
		lastPtn = '';
	};

	CodeMirror.commands.findForward = (doc) => {
		findNext(doc, true);
	};
	CodeMirror.commands.findBackward = (doc) => {
		findNext(doc, false);
	};

	mw.hook('wiki-codemirror').add(cm => {
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
				findNext(cm, true);
			} else if (e.key === 'Escape') {
				e.stopPropagation();
				reset(cm);
			}
		});
		cm.addKeyMap({
			'Ctrl-F': findNew,
			'Cmd-F': findNew,
			'Ctrl-G': 'findForward',
			'Cmd-G': 'findForward',
			'Shift-Ctrl-G': 'findBackward',
			'Shift-Cmd-G': 'findBackward'
		});
	});

	mw.loader.addStyleTag(
		'.Wikiplus-Btn{line-height:1.4}'
		+ '#Wikiplus-Quickedit-Search-Div{margin:7px 0 5px;}'
		+ '.Wikiplus-Symbol-Btn{font-size:20px;margin:7px;vertical-align:middle;cursor:pointer;}'
		+ '#Wikiplus-Quickedit-Search{width:50%;}'
		+ '.cm-search{background-color:#ffc0cb83;}'
	);
})();
