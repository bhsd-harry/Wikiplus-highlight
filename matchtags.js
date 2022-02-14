const defaults = {highlightNonMatching: true, maxHighlightLen: 1000, maxScanLineLength: 3000,
		maxScanLines: 100, delay: 100
	},
	voidTags = ['br', 'wbr', 'hr', 'img'],
	cmPos = CodeMirror.Pos,
	analyzeTag = function(token, line) {
		const type = token.type || '',
			match = type.match(/mw-(?:html|ext)-(\S+)/);
		return { line, start: token.start, end: token.end,
			name: match ? match[1] : token.string.toLowerCase().trim(),
			type: type.includes('mw-htmltag-') ? 'html' : 'ext'
		};
	},
	getTag = function(cm, pos) {
		const style1 = cm.getTokenTypeAt(pos),
			style2 = cm.getTokenTypeAt(cmPos(pos.line, pos.ch + 1)),
			re = /(^| )mw-(html|ext)tag-(name|attribute)($| )/;
		if (!re.test(style1) && !re.test(style2)) {
			return null;
		}
		if (re.test(style1)) {
			return analyzeTag(cm.getTokenAt(pos), pos.line);
		}
		return analyzeTag(cm.getTokenAt(cmPos(pos.line, pos.ch + 1)), pos.line);
	},
	isTagBracket = function(token, type, name) {
		return RegExp(`mw-${type}tag-bracket`).test(token.type)
				&& RegExp(`mw-${type}-${name}`).test(token.type);
	},
	findWholeTag = function(cm, tag) {
		const {line} = tag,
			lineTokens = cm.getLineTokens(line),
			index = lineTokens.findIndex((ele) => {
				return ele.start === tag.start;
			}),
			left = lineTokens.slice(0, index).reverse().find((ele) => {
				return isTagBracket(ele, tag.type, tag.name)
					&& ['<', '</'].includes(ele.string.trim());
			}),
			right = lineTokens.slice(index + 1).find((ele) => {
				return isTagBracket(ele, tag.type, tag.name)
					&& ['>', '/>'].includes(ele.string.trim());
			});
		if (!left) {
			return null;
		}
		const dir = left.string.trim() === '</' ? -1 : 1;
		if (!right) {
			return { dir: voidTags.includes(tag.name) ? 0 : dir, start: cmPos(line, left.start),
				end: cmPos(line, cm.getLine(line).length) };
		}
		if (right.string.trim() === '/>' || voidTags.includes(tag.name)) {
			return {dir: 0, start: cmPos(line, left.start), end: cmPos(line, right.end)};
		}
		return {dir, start: cmPos(line, left.start), end: cmPos(line, right.end)};
	},
	hasTag = function(token, type, name) {
		return (token.type || '').includes(`mw-${type}tag-name`) && token.string.trim() === name;
	},
	scanForTag = function(cm, where, dir, type, name) {
		const config = cm.state.matchTags,
			maxScanLen = config.maxScanLineLength,
			{maxScanLines} = config,
			stack = [],
			lineEnd = dir > 0
				? Math.min(where.line + maxScanLines, cm.lineCount())
				: Math.max(-1, where.line - maxScanLines);
		let lineNo;
		for (lineNo = where.line; lineNo !== lineEnd; lineNo += dir) {
			const line = cm.getLine(lineNo);
			if (!line || line.length > maxScanLen) {
				continue;
			}
			let pos = dir > 0 ? 0 : line.length;
			if (lineNo === where.line) {
				pos = where.ch;
			}
			const lineTokens = cm.getLineTokens(lineNo).filter((ele) => { // jshint ignore: line
				return (dir > 0 ? ele.start >= pos : ele.end <= pos) && hasTag(ele, type, name);
			});
			if (lineTokens.length === 0) {
				continue;
			}
			if (dir < 0) {
				lineTokens.reverse();
			}
			for (let i = 0; i < lineTokens.length; i++) {
				const tag = findWholeTag(cm, {
					line: lineNo, start: lineTokens[i].start, end: lineTokens[i].end, name, type
				});
				if (!tag || tag.dir === 0) {
					continue;
				}
				if (tag.dir === dir) {
					stack.push(tag);
				} else if (stack.length === 0) {
					return tag;
				} else {
					stack.pop();
				}
			}
		}
		return lineNo === (dir > 0 ? cm.lineCount() : -1) ? false : null;
	},
	markTag = function(cm, autoclear) {
		if (cm.somethingSelected()) {
			return;
		}
		const tagName = getTag(cm, cm.getCursor());
		if (!tagName) {
			return;
		}
		const tag = findWholeTag(cm, tagName),
			marks = [],
			config = cm.state.matchTags;
		if (!tag) {
			return;
		}
		const {dir} = tag,
			match = dir ? scanForTag(cm, dir > 0 ? tag.end : tag.start, dir, tagName.type, tagName.name) : true;
		if ((match || config.highlightNonMatching)
				&& cm.getLine(tag.start.line).length <= config.maxHighlightLen) {
			const style = match ? 'cm-matchingtag' : 'cm-nonmatchingtag';
			marks.push(cm.markText(tag.start, tag.end, {className: style}));
			if (typeof match === 'object' && cm.getLine(match.start.line).length <= config.maxHighlightLen) {
				marks.push(cm.markText(match.start, match.end, {className: 'cm-matchingtag'}));
			}
		}
		if (marks.length) {
			const clear = function() {
				cm.operation(() => {
					marks.forEach((mark) => {
						mark.clear();
					});
				});
			};
			if (autoclear) {
				setTimeout(clear, 2000);
			} else {
				return clear;
			}
		}
	},
	scheduleHighlight = function(cm) {
		const state = cm.state.matchTags;
		clearTimeout(state.timeout);
		state.timeout = setTimeout(() => {
			doMatchTags(cm);
		}, state.delay);
	},
	doMatchTags = function(cm) {
		cm.operation(() => {
			if (cm.state.matchTags.currentlyHighlighted) {
				cm.state.matchTags.currentlyHighlighted();
				cm.state.matchTags.currentlyHighlighted = null;
			}
			cm.state.matchTags.currentlyHighlighted = markTag(cm, false);
		});
	},
	clearHighlighted = function(cm) {
		if (cm.state.matchTags && cm.state.matchTags.currentlyHighlighted) {
			cm.state.matchTags.currentlyHighlighted();
			cm.state.matchTags.currentlyHighlighted = null;
		}
	};
CodeMirror.defineExtension('highlightTag', function() {
	markTag(this, true);
});
CodeMirror.defineOption('matchTags', false, (cm, val, old) => {
	if (old && old !== CodeMirror.Init) {
		cm.off('cursorActivity', scheduleHighlight);
		clearHighlighted(cm);
	}
	if (val) {
		cm.state.matchTags = $.extend({}, defaults, typeof val === 'object' ? val : {});
		cm.on('cursorActivity', scheduleHighlight);
	}
});
