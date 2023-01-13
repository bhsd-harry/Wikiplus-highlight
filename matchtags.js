/*
 * CodeMirror, copyright (c) by Marijn Haverbeke and others
 * Distributed under an MIT license: https://codemirror.net/LICENSE
 * Modified for MediaWiki by Bhsd <https://github.com/bhsd-harry>
 */

(() => {
	'use strict';

	const {Pos, cmpPos, Init} = CodeMirror;

	const tagStart = /<(\/?)([_a-z]\w*)/giu,
		voidTags = ['br', 'wbr', 'hr', 'img'],
		maxScanLines = 1000;

	/** @ignore */
	class Iter {
		/**
		 * @param {CodeMirror.Editor} cm
		 * @param {CodeMirror.Position} pos 当前位置
		 */
		constructor(cm, pos) {
			const {line, ch} = pos;
			this.line = line;
			this.ch = ch;
			this.cm = cm;
			this.text = cm.getLine(line);
			this.min = Math.max(line - maxScanLines + 1, cm.firstLine());
			this.max = Math.min(line + maxScanLines - 1, cm.lastLine());
		}

		/** 是否是标签 */
		isTag() {
			const type = this.cm.getTokenTypeAt(Pos(this.line, this.ch));
			return /\b(?:mw-(?:html|ext)tag|tag\b)/u.test(type);
		}

		/**
		 * 判断是否是括号
		 * @param {number} ch 列号
		 */
		bracketAt(ch) {
			const type = this.cm.getTokenTypeAt(Pos(this.line, ch + 1));
			return /\b(?:mw-(?:html|ext)tag-)?bracket\b/u.test(type);
		}

		/** Jump to the start of the next line */
		nextLine() {
			if (this.line >= this.max) {
				return false;
			}
			this.ch = 0;
			this.text = this.cm.getLine(++this.line);
			return true;
		}

		/** Jump to the end of the previous line */
		prevLine() {
			if (this.line <= this.min) {
				return false;
			}
			this.text = this.cm.getLine(--this.line);
			this.ch = this.text.length;
			return true;
		}

		/** Jump to the letter after a `>` towards the line end */
		toTagEnd() {
			for (;;) {
				const gt = this.text.indexOf('>', this.ch);
				if (gt === -1) {
					return undefined;
				}
				this.ch = gt + 1;
				if (this.bracketAt(gt)) {
					return this.text[gt - 1] === '/' ? 'selfClose' : 'regular';
				}
			}
		}

		/** Jump to a `<` towards the line start */
		toTagStart() {
			for (;;) {
				const lt = this.ch ? this.text.lastIndexOf('<', this.ch - 1) : -1;
				if (lt === -1) {
					return undefined;
				} else if (!this.bracketAt(lt)) {
					this.ch = lt;
					continue;
				}
				tagStart.lastIndex = lt;
				this.ch = lt;
				const match = tagStart.exec(this.text);
				if (match && match.index === lt) {
					return match;
				}
			}
		}

		/** Jump to the start of the last line, or the letter after a `tagStart` */
		toNextTag() {
			for (;;) {
				tagStart.lastIndex = this.ch;
				const found = tagStart.exec(this.text);
				if (!found) {
					if (this.nextLine()) {
						continue;
					} else {
						return undefined;
					}
				}
				if (this.bracketAt(found.index)) {
					this.ch = found.index + found[0].length;
					return found;
				}
				this.ch = found.index + found[0].length;
			}
		}

		/** Jump to the end of the first line, or a non-bracket `>`, or the letter after a tag bracket `>` */
		toPrevTag() {
			for (;;) {
				const gt = this.ch ? this.text.lastIndexOf('>', this.ch - 1) : -1;
				if (gt === -1) {
					if (this.prevLine()) {
						continue;
					} else {
						return undefined;
					}
				}
				if (this.bracketAt(gt)) {
					const lastSlash = this.text.lastIndexOf('/', gt);
					const selfClose = lastSlash > -1 && !/\S/u.test(this.text.slice(lastSlash + 1, gt));
					this.ch = gt + 1;
					return selfClose ? 'selfClose' : 'regular';
				}
				this.ch = gt;
			}
		}

		// eslint-disable-next-line jsdoc/require-returns-check
		/**
		 * 搜索匹配的闭合标签
		 * @param {string} tag 标签名
		 * @returns {CodeMirror.MatchingTag}
		 */
		findMatchingClose(tag) {
			const /** @type {string[]} */ stack = [];
			for (;;) {
				const next = this.toNextTag();
				if (!next) {
					return undefined;
				}
				const start = this.ch - next[0].length,
					end = this.toTagEnd(),
					tagName = next[2].toLowerCase();
				if (!end) {
					return undefined;
				} else if (end === 'selfClose' || voidTags.includes(tagName)) {
					continue;
				} else if (next[1]) { // closing tag
					let i = stack.length - 1;
					for (; i >= 0; --i) {
						if (stack[i] === tagName) {
							stack.length = i;
							break;
						}
					}
					if (i < 0 && (!tag || tag === tagName)) {
						return {tag: tagName, from: Pos(this.line, start), to: Pos(this.line, this.ch)};
					}
				} else { // opening tag
					stack.push(tagName);
				}
			}
		}

		// eslint-disable-next-line jsdoc/require-returns-check
		/**
		 * 搜索匹配的开启标签
		 * @param {string|undefined} tag 标签名
		 * @returns {CodeMirror.MatchingTag}
		 */
		findMatchingOpen(tag) {
			const /** @type {string[]} */ stack = [];
			for (;;) {
				const prev = this.toPrevTag();
				if (!prev) {
					return undefined;
				}
				const {ch: end} = this,
					start = this.toTagStart();
				if (!start) {
					return undefined;
				}
				const tagName = start[2].toLowerCase();
				if (prev === 'selfClose' || voidTags.includes(tagName)) {
					continue;
				} else if (start[1]) { // closing tag
					stack.push(tagName);
				} else { // opening tag
					let i = stack.length - 1;
					for (; i >= 0; --i) {
						if (stack[i] === tagName) {
							stack.length = i;
							break;
						}
					}
					if (i < 0 && (!tag || tag === tagName)) {
						// eslint-disable-next-line unicorn/consistent-destructuring
						return {tag: tagName, from: Pos(this.line, this.ch), to: Pos(this.line, end)};
					}
				}
			}
		}
	}

	CodeMirror.defineExtension(
		'findMatchingTag',

		/**
		 * @this {CodeMirror.Editor}
		 * @param {CodeMirror.Position} pos 当前位置
		 * @returns {CodeMirror.MatchingTagPair}
		 */
		function(pos) {
			let iter = new Iter(this, pos);
			if (!iter.isTag()) {
				return undefined;
			}
			const end = iter.toTagEnd(),
				to = end && Pos(iter.line, iter.ch);
			const start = end && iter.toTagStart();
			if (!start || cmpPos(iter, pos) > 0) {
				return undefined;
			}
			const tag = start[2].toLowerCase(),
				here = {from: Pos(iter.line, iter.ch), to, tag};
			if (end === 'selfClose' || voidTags.includes(tag)) {
				return {open: here, close: null, at: 'self'};
			}

			if (start[1]) { // closing tag
				return {open: iter.findMatchingOpen(tag), close: here, at: 'close'};
			} // opening tag
			iter = new Iter(this, to);
			return {open: here, close: iter.findMatchingClose(tag), at: 'open'};
		},
	);

	CodeMirror.defineExtension(
		'findEnclosingTag',

		/**
		 * @this {CodeMirror.Editor}
		 * @param {CodeMirror.Position} pos
		 * @param {string} tag
		 * @returns {CodeMirror.MatchingTagPair}
		 */
		function(pos, tag) {
			const iter = new Iter(this, pos),
				open = iter.findMatchingOpen(tag);
			if (!open) {
				return undefined;
			}
			const forward = new Iter(this, pos),
				close = forward.findMatchingClose(open.tag);
			return close ? {open, close} : undefined;
		},
	);

	/** Used by addon/edit/closetag.js */
	CodeMirror.scanForClosingTag = (cm, pos, tagName) => {
		const iter = new Iter(cm, pos);
		return iter.findMatchingClose(tagName);
	};

	CodeMirror.defineOption('matchTags', false, (cm, val, old) => {
		if (old && old !== Init) {
			cm.off('cursorActivity', doMatchTags);
			clear(cm);
		}
		if (val) {
			cm.on('cursorActivity', doMatchTags);
			doMatchTags(cm);
		}
	});

	/**
	 * 清除高亮
	 * @param {CodeMirror.EditorWithMatchingTags} cm
	 */
	const clear = cm => {
		if (cm.state.tagHit) {
			cm.state.tagHit.clear();
		}
		if (cm.state.tagOther) {
			cm.state.tagOther.clear();
		}
		cm.state.tagHit = null;
		cm.state.tagOther = null;
	};

	/**
	 * 搜索并高亮匹配的标签
	 * @param {CodeMirror.EditorWithMatchingTags} cm
	 */
	const doMatchTags = cm => {
		cm.operation(() => {
			clear(cm);
			if (cm.somethingSelected()) {
				return;
			}
			const match = cm.findMatchingTag(cm.getCursor());
			if (!match) {
				return;
			} else if (match.at === 'self') {
				cm.state.tagHit = cm.markText(match.open.from, match.open.to, {className: 'cm-matchingtag'});
				return;
			}
			const hit = match.at === 'open' ? match.open : match.close,
				other = match.at === 'close' ? match.open : match.close;
			if (hit) {
				cm.state.tagHit = cm.markText(hit.from, hit.to, {className: `cm-${other ? '' : 'non'}matchingtag`});
			}
			if (other) {
				cm.state.tagOther = cm.markText(other.from, other.to, {className: 'cm-matchingtag'});
			}
		});
	};

	mw.loader.addStyleTag(
		'.cm-matchingtag{background-color:#c9ffc8}'
		+ '.cm-nonmatchingtag{background-color:#fff0a8}',
	);
})();
