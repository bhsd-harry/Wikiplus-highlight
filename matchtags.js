/*
 * CodeMirror, copyright (c) by Marijn Haverbeke and others
 * Distributed under an MIT license: https://codemirror.net/LICENSE
 * Modified for MediaWiki by Bhsd <https://github.com/bhsd-harry>
 */

(() => {
	'use strict';

	const {Pos, cmpPos, Init} = CodeMirror,
		tagStart = /<(\/?)([a-z]\w*)(?=[\s/>]|$)/giu,
		voidTags = new Set(['br', 'wbr', 'hr', 'img']),
		maxScanLines = 1000;

	/** @ignore */
	class Iter {
		/**
		 * @param {CodeMirror.Editor} cm
		 * @param {CodeMirror.Position} pos 当前位置
		 */
		constructor(cm, {line, ch}) {
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
		 * 判断是否是`<`或`>`
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
					if (this.nextLine()) {
						continue;
					}
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
				const lt = this.ch > 0 ? this.text.lastIndexOf('<', this.ch - 1) : -1;
				if (lt === -1) {
					if (this.prevLine()) {
						continue;
					}
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
					}
					return undefined;
				}
				this.ch = found.index + found[0].length;
				if (this.bracketAt(found.index)) {
					return found;
				}
			}
		}

		/** Jump to the end of the first line, or a non-bracket `>`, or the letter after a tag bracket `>` */
		toPrevTag() {
			for (;;) {
				const gt = this.ch > 0 ? this.text.lastIndexOf('>', this.ch - 1) : -1;
				if (gt === -1) {
					if (this.prevLine()) {
						continue;
					}
					return undefined;
				} else if (this.bracketAt(gt)) {
					this.ch = gt + 1;
					return this.text[gt - 1] === '/' ? 'selfClose' : 'regular';
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
				} else if (end === 'selfClose' || voidTags.has(tagName)) {
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
				if (prev === 'selfClose' || voidTags.has(tagName)) {
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
			const iter = new Iter(this, pos);
			if (!iter.isTag()) {
				return undefined;
			}
			const end = iter.toTagEnd(),
				to = end && Pos(iter.line, iter.ch),
				start = end && iter.toTagStart();
			if (!start || cmpPos(iter, pos) > 0) {
				return undefined;
			}
			const tag = start[2].toLowerCase(),
				here = {from: Pos(iter.line, iter.ch), to, tag};
			if (end === 'selfClose' || voidTags.has(tag)) {
				return {open: here, loc: 'self'};
			} else if (start[1]) { // closing tag
				return {open: iter.findMatchingOpen(tag), close: here, loc: 'close'};
			}
			// opening tag
			return {open: here, close: new Iter(this, to).findMatchingClose(tag), loc: 'open'};
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
			const open = new Iter(this, pos).findMatchingOpen(tag);
			if (open) {
				const close = new Iter(this, pos).findMatchingClose(open.tag);
				return close && {open, close};
			}
			return undefined;
		},
	);

	/** Used by addon/edit/closetag.js */
	CodeMirror.scanForClosingTag = (cm, pos, tagName) => new Iter(cm, pos).findMatchingClose(tagName);

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
			cm.state.tagHit = undefined;
		}
		if (cm.state.tagOther) {
			cm.state.tagOther.clear();
			cm.state.tagOther = undefined;
		}
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
			} else if (match.loc === 'self') {
				cm.state.tagHit = cm.markText(match.open.from, match.open.to, {className: 'cm-matchingtag'});
				return;
			}
			const hit = match.loc === 'open' ? match.open : match.close,
				other = match.loc === 'close' ? match.open : match.close;
			if (hit) {
				cm.state.tagHit = cm.markText(hit.from, hit.to, {className: `cm-${other ? '' : 'non'}matchingtag`});
				if (other) {
					cm.state.tagOther = cm.markText(other.from, other.to, {className: 'cm-matchingtag'});
				}
			}
		});
	};

	mw.loader.addStyleTag(
		'.cm-matchingtag{background-color:#c9ffc8}'
		+ '.cm-nonmatchingtag{background-color:#fff0a8}',
	);
})();
