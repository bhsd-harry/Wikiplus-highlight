/**
 * @name Wikiplus-highlight Wikiplus编辑器的CodeMirror语法高亮扩展
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */
import {CDN} from '@bhsd/common';
import {renderEditor} from './core';

declare namespace mw.libs {
	let wphl: {version?: string, cmVersion?: string} | undefined;
}

(async () => {
	const {libs} = mw,
		{wphl} = libs;
	if (!wphl?.version) {
		const version = '3.2.5';
		libs.wphl = {version, ...wphl}; // 开始加载

		// 路径
		const MW_CDN = `npm/@bhsd/codemirror-mediawiki@${libs.wphl.cmVersion || 'latest'}/dist/wiki.min.js`,
			REPO_CDN = 'npm/wikiplus-highlight';

		if (!('CodeMirror6' in globalThis)) {
			await $.ajax(`${CDN}/${MW_CDN}`, {dataType: 'script'});
		}

		// 监视 Wikiplus 编辑框
		const observer = new MutationObserver(records => {
			const $editArea = $(records.flatMap(({addedNodes}) => [...addedNodes]))
				.find<HTMLTextAreaElement>('#Wikiplus-Quickedit, #Wikiplus-Setting-Input');
			if ($editArea.length > 0) {
				void renderEditor($editArea, $editArea.attr('id') === 'Wikiplus-Setting-Input');
			}
		});
		observer.observe(document.body, {childList: true});

		mediaWiki.loader.load(`${CDN}/${REPO_CDN}@${version}/styles.min.css`, 'text/css');
	}
})();
