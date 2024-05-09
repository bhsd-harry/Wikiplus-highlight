## 3.2.2

*2024-05-09*

**Fixed**

- Fix keyboard shortcuts for submission in [Monaco Editor](https://microsoft.github.io/monaco-editor/)

## 3.2.1

*2024-05-05*

**Fixed**

- Fix incompatibility with [jQuery](https://api.jquery.com/jQuery.ajax/#jQuery-ajax-settings-settings) < 3.4, since [v3.1.0](#v310)

## v3.2.0

*2024-05-01*

**Changed**

- Alternative highlighting with [Monaco Editor](https://microsoft.github.io/monaco-editor/) is now provided by [CodeMirror-MediaWiki](https://github.com/bhsd-harry/codemirror-mediawiki)

## v3.1.0

*2024-04-19*

**Added**

- Alternative highlighting with [Monaco Editor](https://microsoft.github.io/monaco-editor/)

## v3.0.8

*2024-04-16*

**Fixed**

- The [CodeMirror-MediaWiki](https://github.com/bhsd-harry/codemirror-mediawiki) library was sometimes loaded twice when [InPageEdit](https://github.com/inpageedit/inpageedit-v2) is also installed

## v3.0.7

*2024-03-17*

**Added**

- The version of the [CodeMirror-MediaWiki](https://github.com/bhsd-harry/codemirror-mediawiki) library is now customizable by modifying the `cmVersion` key of the global variable `mw.libs.wphl`

## v3.0.5

*2024-03-05*

**Changed**

- [CodeMirror-MediaWiki](https://github.com/bhsd-harry/codemirror-mediawiki), including the preference dialog, is now loaded before editing

## v3.0.3

*2024-02-24*

**Fixed**

- When using the new version of [Wikiplus](https://www.npmjs.com/package/wikiplus-core), the guessing of the highlight mode is improved

## v3.0.2

*2024-02-07*

**Fixed**

- User preference in version 2 is not inherited in version 3

## v3.0.0

*2024-02-06*

First TypeScript version dependent on [CodeMirror-MediaWiki](https://github.com/bhsd-harry/codemirror-mediawiki)
