# Wikiplus-highlight

[![npm version](https://badge.fury.io/js/wikiplus-highlight.svg)](https://www.npmjs.com/package/wikiplus-highlight)
[![CodeQL](https://github.com/bhsd-harry/Wikiplus-highlight/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/Wikiplus-highlight/actions/workflows/codeql.yml)
[![jsDelivr hits (npm)](https://img.shields.io/jsdelivr/npm/hm/wikiplus-highlight)](https://www.npmjs.com/package/wikiplus-highlight)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/12c4209a299b4a378759f425abe445af)](https://app.codacy.com/gh/bhsd-harry/Wikiplus-highlight/dashboard)

**Wikiplus-highlight** 是由 Bhsd 编写的一款 [Wikiplus](https://www.npmjs.com/package/wikiplus-core) 语法高亮插件，它主要基于 MediaWiki 内置的 [JavaScript 模块](https://www.mediawiki.org/wiki/ResourceLoader/Core_modules)和 [CodeMirror](https://codemirror.net/) 编写。

- [使用方法](#使用方法)
- [更多插件](#更多插件)

## 使用方法

在*个人 JS 页*添加以下代码：

```js
mw.loader.load('//cdn.jsdelivr.net/npm/wikiplus-highlight');
```

或

```js
mw.loader.load('//unpkg.com/wikiplus-highlight');
```

如果需要使用特定版本的 [CodeMirror-MediaWiki](https://www.npmjs.com/package/@bhsd/codemirror-mediawiki) 或 [Monaco-Wiki](https://www.npmjs.com/package/monaco-wiki) 进行高亮，需要在加载 Wikiplus-highlight 前指定，例如：

```js
mw.libs.wphl = {
	cmVersion: '3', // 使用 CodeMirror-MediaWiki 3.x.x 版本
	monacoVersion: '1', // 使用 Monaco-Wiki 1.x.x 版本
};
mw.loader.load('//cdn.jsdelivr.net/npm/wikiplus-highlight');
```

## 更多插件

使用 *[Vector](https://www.mediawiki.org/wiki/Skin:Vector)* 皮肤或 MediaWiki 1.35 及以上的 *[Minerva Neue](https://www.mediawiki.org/wiki/Skin:Minerva_Neue)* 皮肤时，在右上角的【更多】菜单将添加一个【CodeMirror插件】选项，点击后可以选择想要加载的 CodeMirror 插件。其他桌面版皮肤（包括 *[Timeless](https://www.mediawiki.org/wiki/Skin:Timeless)*、*[MonoBook](https://www.mediawiki.org/wiki/Skin:MonoBook)* 和 *[Citizen](https://www.mediawiki.org/wiki/Skin:Citizen)*）会在类似性质的菜单中插入这一选项。修改插件设置后将立刻生效。

详细的插件列表和说明请参见 [CodeMirror-MediaWiki](https://www.npmjs.com/package/@bhsd/codemirror-mediawiki) 文档 [1](https://www.npmjs.com/package/@bhsd/codemirror-mediawiki#extensions) 和 [2](https://github.com/bhsd-harry/codemirror-mediawiki/blob/npm/mw/README.md#extensions)。
