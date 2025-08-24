/**
 * @name Wikiplus-highlight Wikiplus编辑器的CodeMirror语法高亮扩展
 * @author Bhsd <https://github.com/bhsd-harry>
 * @license GPL-3.0
 */
import {CDN} from '@bhsd/browser';
import {renderEditor} from './core';

declare namespace mediaWiki.libs {
	let wphl: {version?: string, cmVersion?: string} | undefined;
}

(async () => {
	if (!mw.config.get('wgIsArticle') || mw.config.get('wgAction') !== 'view') {
		return;
	}
	const {libs} = mediaWiki,
		{wphl} = libs;
	if (!wphl?.version) {
		const version = '3.2.10';
		libs.wphl = {version, ...wphl}; // 开始加载

		// 路径
		const MW_CDN = `npm/@bhsd/codemirror-mediawiki@${libs.wphl.cmVersion ?? 'latest'}/dist/wiki.min.js`,
			REPO_CDN = 'npm/wikiplus-highlight';

		if (typeof CodeMirror6 !== 'function') {
			await $.ajax(`${CDN}/${MW_CDN}`, {dataType: 'script', cache: true});
		}

		// 监视 Wikiplus 编辑框
		const observer = new MutationObserver(records => {
			const selector = '#Wikiplus-Quickedit, #Wikiplus-Setting-Input',
				[added] = $(records.flatMap(({addedNodes}) => [...addedNodes])).find<HTMLTextAreaElement>(selector);
			if (added) {
				void renderEditor(added, added.id === 'Wikiplus-Setting-Input');
			}
			const [removed] = $(records.flatMap(({removedNodes}) => [...removedNodes]))
					.find<HTMLTextAreaElement>(selector),
				cm = CodeMirror6.instances?.get(removed!);
			if (typeof cm?.destroy === 'function') {
				cm.destroy();
			}
		});
		observer.observe(document.body, {childList: true});

		mw.loader.load(`${CDN}/${REPO_CDN}@${version}/styles.min.css`, 'text/css');
	}
})();
