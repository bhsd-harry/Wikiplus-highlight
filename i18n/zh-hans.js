(() => {
	const i18n = {
		'wphl-version': '1.5',
		'wphl-lang': 'zh-hans',
		'wphl-addon-search': '搜索',
		'wphl-addon-active-line': '高亮显示光标所在行',
		'wphl-addon-trailingspace': '显示尾随空格',
		'wphl-addon-label': '请选择您希望加载的插件',
		'wphl-addon-notice': '更改将于打开新的Wikiplus编辑区时生效。',
		'wphl-addon-title': 'Wikiplus高亮插件',
		'wphl-search-placeholder': '使用字符串或正则表达式搜索',
		'wphl-contentmodel': '请选择内容模型：'
	};
	mw.messages.set(i18n);
	mw.storage.setObject('Wikiplus-highlight-i18n', i18n);
})();