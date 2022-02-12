(() => {
	// Prepare elements
	const $search = $('<input>', {
			id: 'Wikiplus-Quickedit-Search',
			placeholder: 'Search'
		}),
		$searchClose = $('<span>', {
			text: '×',
			id: 'Wikiplus-Quickedit-Search-Close'
		}),
		$searchContainer = $('<div>', {
			id: 'Wikiplus-Quickedit-Search-Div',
			html: [
				$search,
				$searchClose
			]
		}),
		$searchBtn = $('<span>', {
			class: 'Wikiplus-Btn',
			text: 'Search'
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
		const ptn = $search.val();
		if (!ptn) {
			return;
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
		$search.val('').keyup(e => {
			if (e.key === 'Enter') {
				findNext(cm, true);
			}
		});
		cm.addKeyMap({
			'Ctrl-F': findNew,
			'Cmd-F': findNew,
			'Ctrl-G': () => {
				findNext(cm, true);
			},
			'Cmd-G': () => {
				findNext(cm, true);
			},
			'Shift-Ctrl-G': () => {
				findNext(cm, false);
			},
			'Shift-Cmd-G': () => {
				findNext(cm, false);
			}
		});
	});

	mw.loader.addStyleTag(
		'.Wikiplus-Btn{line-height:1.4}'
		+ '#Wikiplus-Quickedit-Search-Div{margin:7px 0 5px;}'
		+ '#Wikiplus-Quickedit-Search-Close{font-size:20px;margin:7px;vertical-align:middle;cursor:pointer;}'
		+ '#Wikiplus-Quickedit-Search{width:50%;}'
		+ '.cm-search{background-color:#ffc0cb53;}'
	);
})();