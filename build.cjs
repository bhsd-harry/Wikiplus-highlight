'use strict';

const esbuild = require('esbuild'),
	{cssPlugin} = require('@bhsd/browser/esbuild'),
	{version} = require('./package.json');

const config = {
	entryPoints: ['src/main.ts'],
	charset: 'utf8',
	bundle: true,
	format: 'esm',
	outfile: 'build/main.js',
	define: {
		$VERSION: JSON.stringify(version),
	},
	logLevel: 'info',
	plugins: [cssPlugin],
};

(async () => {
	await esbuild.build(config);
	await esbuild.build({
		...config,
		minify: true,
		target: 'es2019',
		format: 'iife',
		sourcemap: true,
		outfile: 'dist/main.min.js',
	});
})();
