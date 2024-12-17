# Wikiplus-highlight

[![npm version](https://badge.fury.io/js/wikiplus-highlight.svg)](https://www.npmjs.com/package/wikiplus-highlight)
[![CodeQL](https://github.com/bhsd-harry/Wikiplus-highlight/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/Wikiplus-highlight/actions/workflows/codeql.yml)
[![jsDelivr hits (npm)](https://img.shields.io/jsdelivr/npm/hm/wikiplus-highlight)](https://www.npmjs.com/package/wikiplus-highlight)

**Wikiplus-highlight** 是由 Bhsd 编写的一款 [Wikiplus](https://github.com/Wikiplus/Wikiplus) 语法高亮插件，它主要基于 MediaWiki 内置的 [JavaScript 模块](https://www.mediawiki.org/wiki/ResourceLoader/Core_modules)和 [CodeMirror](https://codemirror.net/) 编写。

<details>
	<summary>展开</summary>

- [使用方法](#使用方法)
- [更多插件](#更多插件)
	- [高亮当前行](#高亮当前行)
	- [显示不可见字符](#显示不可见字符)
	- [显示空白字符](#显示空白字符)
	- [显示尾随空格](#显示尾随空格)
	- [匹配括号](#匹配括号)
	- [自动闭合括号和引号](#自动闭合括号和引号)
	- [代码折叠](#代码折叠)
	- [自动填充](#自动填充)
	- [匹配标签](#匹配标签)
	- [HTML/URL编码快捷键](#htmlurl编码快捷键)
	- [快速打开链接](#快速打开链接)
	- [语法检查](#语法检查)
	- [添加 WikiEditor 工具栏](#添加-wikieditor-工具栏)
	- [使用 Monaco Editor](#使用-monaco-editor)
	- [调整缩进](#调整缩进)
- [Supported languages](#supported-languages)

</details>

## 使用方法

在*个人 JS 页*添加以下代码：

```js
mw.loader.load('//cdn.jsdelivr.net/npm/wikiplus-highlight');
```

或

```js
mw.loader.load('//unpkg.com/wikiplus-highlight');
```

## 更多插件

使用 *[Vector](https://www.mediawiki.org/wiki/Skin:Vector)* 皮肤或 MediaWiki 1.35 及以上的 *[Minerva Neue](https://www.mediawiki.org/wiki/Skin:Minerva_Neue)* 皮肤时，在右上角的【更多】菜单将添加一个【CodeMirror插件】选项，点击后可以选择想要加载的 CodeMirror 插件。其他桌面版皮肤（包括 *[Timeless](https://www.mediawiki.org/wiki/Skin:Timeless)*、*[MonoBook](https://www.mediawiki.org/wiki/Skin:MonoBook)* 和 *[Citizen](https://www.mediawiki.org/wiki/Skin:Citizen)*）会在类似性质的菜单中插入这一选项。修改插件设置后将立刻生效。

### 高亮当前行

使用这一插件时，光标所在行将添加浅青色背景。

### 显示不可见字符

使用这一插件时，不可见字符将以红色小圆点的形式显示。

### 显示空白字符

使用这一插件时，空格将以小圆点的形式显示，制表符将以箭头的形式显示。

### 显示尾随空格

使用这一插件时，每一行的尾随空格将添加橙红色背景。

### 高亮与选中文字相同的内容

使用这一插件时，与当前选中文字相同的内容将添加浅绿色背景。

### 匹配括号

匹配的括号对会添加青色背景，未匹配的单个括号会添加暗红色背景。

### 自动闭合括号和引号

MediaWiki 模式下自动闭合生效的字符包括 `(`、`[`、`{` 和 `"`，其他模式还额外包括 `'`。如果在选中部分文字的情况下键入这些字符，选中的文字会被成对的括号或引号包裹。

### 代码折叠

MediaWiki 模式下，光标移动至模板、解析器函数或扩展标签内部时会在光标上方出现一个 `－` 标记，点击即可折叠模板和解析器函数的参数或扩展标签内部的文本。折叠后使用一个带有虚线边框的 `⋯` 标记占位，点击该标记将重新展开折叠的代码部分。除此以外，可折叠的代码行行号左侧会出现箭头 `⌄` 作为折叠按钮。同时添加以下快捷键：

- `Ctrl` + `Shift` + `[`/`Cmd` + `Alt` + `[`: 折叠选中的文字（如果可行）
- `Ctrl` + `Shift` + `]`/`Cmd` + `Alt` + `]`: 展开选中的文字
- `Ctrl` + `Alt` + `[`: 折叠所有可折叠的代码
- `Ctrl` + `Alt` + `]`: 展开所有折叠的代码

### 自动填充

MediaWiki 模式下可自动填充魔术字（包括状态开关和解析器函数）、标签名、标签属性名、URL 协议和图片参数。此外按下 `Shift` + `Enter` 还可触发页面名称和模板参数（需要 [TemplateData](https://www.mediawiki.org/wiki/Extension:TemplateData) 扩展）的自动填充。JavaScript 和 CSS 模式下可自动填充关键字和常数。

### 匹配标签

仅用于 MediaWiki 模式，匹配的标签对或自封闭标签会添加青色背景，未匹配的标签会添加暗红色背景。注意被高亮标记为错误的标签不会进行匹配。

### HTML/URL编码快捷键

仅用于 MediaWiki 模式，添加以下快捷键：

- `Ctrl`/`Cmd` + `[`: 将选中的文字转换为HTML实体
- `Ctrl`/`Cmd` + `]`: 将选中的文字解码或转换为URL编码

### 快速打开链接

仅用于 MediaWiki 模式，按住 `Ctrl`/`Cmd` 并点击被高亮标记为内部链接、模板标题或外部链接的文字时，会在新标签页打开对应页面。

### 颜色选择器

仅用于 CSS 和 MediaWiki 模式，表示颜色的文字左侧会出现一个方块提供颜色预览，点击后会弹出一个颜色选择器，选择颜色后会自动修改对应的文字内容。

### 预览 `<ref>` 定义

仅用于 MediaWiki 模式，将鼠标悬停在带有 `name` 属性的 `<ref>` 标签上时会显示对应的内容。

### 语法检查

开启后将在编辑框内提示可能存在的语法错误。

|模式|语法检查库|
|:-:|:-:|
|MediaWiki|[WikiParser-Node](https://github.com/bhsd-harry/wikiparser-node)|
|JavaScript|[ESLint](https://eslint.org/)|
|CSS|[Stylelint](https://stylelint.io/)|
|JSON|[JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)|
|Lua|[luaparse](https://npmjs.com/package/luaparse)|

### 添加 WikiEditor 工具栏

工具栏遵从当前网站安装的 [WikiEditor](https://www.mediawiki.org/wiki/Extension:WikiEditor) 扩展的版本。

### 使用 Monaco Editor

不使用默认的 [CodeMirror 6](https://codemirror.net/) 编辑器，而是使用 [Monaco Editor](https://microsoft.github.io/monaco-editor/)。

### 调整缩进

这是一个设置选项。默认设置下使用 Tab 进行缩进。

## Supported languages

- English (en)
- 中文(简体) (zh-hans)
- 中文(繁體) (zh-hant)

[GNU General Public License 3.0](https://www.gnu.org/licenses/gpl-3.0-standalone.html)
