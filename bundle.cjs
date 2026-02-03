'use strict';

const fs = require('fs'),
	esbuild = require('esbuild'),
	{version} = require('./package.json');

const config = {
	entryPoints: ['src/main.ts'],
	charset: 'utf8',
	bundle: true,
	format: 'esm',
	outfile: 'build/main.js',
	define: {
		$VERSION: JSON.stringify(version),
		$STYLE: JSON.stringify(
			esbuild.transformSync(
				fs.readFileSync('styles.css', 'utf8'),
				{loader: 'css', minify: true},
			).code.trim(),
		),
	},
	logLevel: 'info',
};

esbuild.buildSync(config);
esbuild.buildSync({
	...config,
	minify: true,
	target: 'es2019',
	format: 'iife',
	sourcemap: true,
	outfile: 'dist/main.min.js',
});
