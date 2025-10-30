import config, {browser} from '@bhsd/code-standard';
const {
	rules: {'no-underscore-dangle': [, opt]},
} = config.find(({files, rules}) => !files && rules?.['no-underscore-dangle']?.[1]);
opt.allow = [
	'_',
	'_WikiplusPages',
];

export default [
	...config,
	browser,
];
