import config, {browser, getOxlintConfig} from '@bhsd/code-standard';
const {
	rules: {'no-underscore-dangle': [, opt]},
} = config.find(({files, rules}) => !files && rules?.['no-underscore-dangle']?.[1]);
opt.allow = [
	'_',
	'_WikiplusPages',
];
const oxlintConfig = getOxlintConfig([
	...config,
	browser,
]);

export default oxlintConfig;
