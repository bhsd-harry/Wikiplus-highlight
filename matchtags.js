/*
 * CodeMirror, copyright (c) by Marijn Haverbeke and others
 * Distributed under an MIT license: https://codemirror.net/LICENSE
 * Modified for MediaWiki by Bhsd <https://github.com/bhsd-harry>
 */

(() => {
	'use strict';

	const {Pos, cmpPos} = CodeMirror;

	const tagStart = /<(\/?)([A-Z_a-z]\w*)/g,
		voidTags = ['br', 'wbr', 'hr', 'img'],
		maxScanLines = 1000;

	class Iter {
		/**
		 * @param {CodeMirror.Editor} cm
		 * @param {CodeMirror.Position} pos
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

		isTag() {
			const type = this.cm.getTokenTypeAt(Pos(this.line, this.ch));
			return /\b(?:mw-(?:html|ext)tag|tag\b)/.test(type);
		}

		/** @param {number} ch */
		bracketAt(ch) {
			const type = this.cm.getTokenTypeAt(Pos(this.line, ch + 1));
			return /\b(?:mw-(?:html|ext)tag-)?bracket\b/.test(type);
		}

		/** Jump to the start of the next line */
		nextLine() {
			if (this.line >= this.max) {
				return;
			}
			this.ch = 0;
			this.text = this.cm.getLine(++this.line);
			return true;
		}

		/** Jump to the end of the previous line */
		prevLine() {
			if (this.line <= this.min) {
				return;
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
					return;
				}
				this.ch = gt + 1;
				if (!this.bracketAt(gt)) {
					continue;
				}
				return this.text[gt - 1] === '/' ? 'selfClose' : 'regular';
			}
		}

		/** Jump to a `<` towards the line start */
		toTagStart() {
			for (;;) {
				const lt = this.ch ? this.text.lastIndexOf('<', this.ch - 1) : -1;
				if (lt === -1) {
					return;
				}
				if (!this.bracketAt(lt)) {
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
						return;
					}
				}
				if (!this.bracketAt(found.index)) {
					this.ch = found.index + found[0].length;
					continue;
				}
				this.ch = found.index + found[0].length;
				return found;
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
						return;
					}
				}
				if (!this.bracketAt(gt)) {
					this.ch = gt;
					continue;
				}
				const lastSlash = this.text.lastIndexOf('/', gt);
				const selfClose = lastSlash > -1 && !/\S/.test(this.text.slice(lastSlash + 1, gt));
				this.ch = gt + 1;
				return selfClose ? 'selfClose' : 'regular';
			}
		}

		/**
		 * @param {string} tag
		 * @returns {CodeMirror.MatchingTag}
		 */
		findMatchingClose(tag) {
			const /** @type {string[]} */ stack = [];
			for (;;) {
				const next = this.toNextTag();
				if (!next) {
					return;
				}
				const start = this.ch - next[0].length,
					end = this.toTagEnd(),
					tagName = next[2].toLowerCase();
				if (!end) {
					return;
				}
				if (end === 'selfClose' || voidTags.includes(tagName)) {
					continue;
				}
				if (next[1]) { // closing tag
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

		/**
		 * @param {string|undefined} tag
		 * @returns {CodeMirror.MatchingTag}
		 */
		findMatchingOpen(tag) {
			const /** @type {string[]} */ stack = [];
			for (;;) {
				const prev = this.toPrevTag();
				if (!prev) {
					return;
				}
				const end = this.ch,
					start = this.toTagStart();
				if (!start) {
					return;
				}
				const tagName = start[2].toLowerCase();
				if (prev === 'selfClose' || voidTags.includes(tagName)) {
					continue;
				}
				if (start[1]) { // closing tag
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
		/** @type {function(this: CodeMirror.Editor, CodeMirror.Position): CodeMirror.MatchingTagPair} */
		function(pos) {
			let iter = new Iter(this, pos);
			if (!iter.isTag()) {
				return;
			}
			const end = iter.toTagEnd(),
				to = end && Pos(iter.line, iter.ch);
			const start = end && iter.toTagStart();
			if (!start || cmpPos(iter, pos) > 0) {
				return;
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
		/** @type {function(this: CodeMirror.Editor, CodeMirror.Position, string): CodeMirror.MatchingTagPair} */
		function(pos, tag) {
			const iter = new Iter(this, pos),
				op = iter.findMatchingOpen(tag);
			if (!op) {
				return;
			}
			const forward = new Iter(this, pos),
				cl = forward.findMatchingClose(op.tag);
			if (cl) {
				return {open: op, close: cl};
			}
		},
	);

	/** Used by addon/edit/closetag.js */
	CodeMirror.scanForClosingTag = function(cm, pos, tagName) {
		const iter = new Iter(cm, pos);
		return iter.findMatchingClose(tagName);
	};

	CodeMirror.defineOption('matchTags', false, (cm, val, old) => {
		if (old && old !== CodeMirror.Init) {
			cm.off('cursorActivity', doMatchTags);
			clear(cm);
		}
		if (val) {
			cm.on('cursorActivity', doMatchTags);
			doMatchTags(cm);
		}
	});

	/** @param {CodeMirror.EditorWithMatchingTags} cm */
	function clear(cm) {
		if (cm.state.tagHit) {
			cm.state.tagHit.clear();
		}
		if (cm.state.tagOther) {
			cm.state.tagOther.clear();
		}
		cm.state.tagHit = null;
		cm.state.tagOther = null;
	}

	/** @param {CodeMirror.EditorWithMatchingTags} cm */
	function doMatchTags(cm) {
		cm.operation(() => {
			clear(cm);
			if (cm.somethingSelected()) {
				return;
			}
			const match = cm.findMatchingTag(cm.getCursor());
			if (!match) {
				return;
			}
			if (match.at === 'self') {
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
	}

	mw.loader.addStyleTag(
		'.cm-matchingtag{background-color:#c9ffc8}'
		+ '.cm-nonmatchingtag{background-color:#fff0a8}',
	);
})();
