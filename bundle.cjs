'use strict';

const fs = require('fs'),
	path = require('path'),
	esbuild = require('esbuild'),
	{version} = require('./package.json');

esbuild.buildSync({
	entryPoints: ['src/main.ts'],
	charset: 'utf8',
	bundle: true,
	format: 'esm',
	outfile: 'build/main.js',
	define: {
		$VERSION: JSON.stringify(version),
		$STYLE: JSON.stringify(fs.readFileSync(path.join('dist', 'styles.css'), 'utf8').trim()),
	},
	logLevel: 'info',
});
