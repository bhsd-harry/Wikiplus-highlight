(() => {
	const i18n = {
		'wphl-version': '1.5',
		'wphl-lang': 'zh-hant',
		'wphl-addon-search': '搜尋',
		'wphl-addon-active-line': '突出顯示游標所在行',
		'wphl-addon-trailingspace': '顯示尾隨空格',
		'wphl-addon-label': '請選擇您希望載入的外掛程式',
		'wphl-addon-notice': '更改將於打開新的Wikiplus編輯區時生效。',
		'wphl-addon-title': 'Wikiplus突顯外掛程式',
		'wphl-search-placeholder': '使用字串或正規表示式搜尋',
		'wphl-contentmodel': '請選擇內容模型：'
	};
	mw.messages.set(i18n);
	mw.storage.setObject('Wikiplus-highlight-i18n', i18n);
})();