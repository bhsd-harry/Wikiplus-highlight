(() => {
	const i18n = {
		'wphl-version': '1.5',
		'wphl-lang': 'en',
		'wphl-addon-search': 'Search',
		'wphl-addon-active-line': 'Show active line',
		'wphl-addon-trailingspace': 'Show trailing spaces',
		'wphl-addon-label': 'Please select the addons you wish to load',
		'wphl-addon-notice': 'Changes will apply when opening a new Wikiplus dialog.',
		'wphl-addon-title': 'Wikiplus Highlight Addons',
		'wphl-search-placeholder': 'Search using a string or a regex pattern',
		'wphl-contentmodel': 'Please choose the content model:'
	};
	mw.messages.set(i18n);
	mw.storage.setObject('Wikiplus-highlight-i18n', i18n);
})();
