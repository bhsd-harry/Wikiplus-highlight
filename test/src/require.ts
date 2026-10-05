/* eslint-disable jsdoc/require-jsdoc */
import Parser from 'wikiparser-node';

const config: Record<string, unknown> = {};

Object.assign(globalThis, {
	mw: {
		config: {
			get(key?: string) {
				return key ? config[key] : config;
			},
			set(obj: Record<string, unknown>) {
				Object.assign(config, obj);
			},
		},
		loader: {
			using() {
				//
			},
		},
		msg() {
			//
		},
		Title: class {
			declare title: Parser.Title;

			constructor(title: string) {
				this.title = Parser.normalizeTitle(title);
			}

			getNamespaceId(): number {
				return this.title.ns;
			}

			getExtension(): string | undefined {
				return this.title.extension;
			}
		},
	},
	OO: {
		ui: {
			confirm() {
				return mw.config.get('confirm');
			},
		},
	},
});
