/* eslint-env node */
'use strict';

const config = require('@bhsd/common/eslintrc.browser.cjs');

module.exports = {
	...config,
	rules: {
		...config.rules,
		'no-underscore-dangle': [
			2,
			{
				...config.rules['no-underscore-dangle'][1],
				allow: [
					'_',
					'_WikiplusPages',
				],
			},
		],
	},
};
