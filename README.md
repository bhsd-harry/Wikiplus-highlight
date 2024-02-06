# Wikiplus-highlight

[![npm version](https://badge.fury.io/js/wikiplus-highlight.svg)](https://www.npmjs.com/package/wikiplus-highlight)
[![CodeQL](https://github.com/bhsd-harry/Wikiplus-highlight/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/bhsd-harry/Wikiplus-highlight/actions/workflows/github-code-scanning/codeql)

**Wikiplus-highlight** 是由 Bhsd 编写的一款 [Wikiplus](https://github.com/Wikiplus/Wikiplus) 语法高亮插件，它主要基于 MediaWiki 内置的 [JavaScript 模块](https://www.mediawiki.org/wiki/ResourceLoader/Core_modules)和 [CodeMirror](https://codemirror.net/) 编写。

## 使用方法

### 最新版本

在*个人 JS 页*添加以下代码：

```javascript
mw.loader.load('//cdn.jsdelivr.net/npm/wikiplus-highlight@2.60.3');
```

或

```javascript
mw.loader.load('//unpkg.com/wikiplus-highlight@2.60.3/dist/main.js');
```

### 稳定版本

在*个人 JS 页*添加以下代码：

```javascript
mw.loader.load('//cdn.jsdelivr.net/npm/wikiplus-highlight');
```

或

```javascript
mw.loader.load('//unpkg.com/wikiplus-highlight/dist/main.js');
```

由于 CDN 的缓存机制，稳定版本的更新大约会滞后一周。

## 更多插件

使用 *[Vector](https://www.mediawiki.org/wiki/Skin:Vector)* 皮肤或 MediaWiki 1.35 及以上的 *[Minerva Neue](https://www.mediawiki.org/wiki/Skin:Minerva_Neue)* 皮肤时，在右上角的【更多】菜单将添加一个【CodeMirror插件】选项，点击后可以选择想要加载的 CodeMirror 插件。其他桌面版皮肤（包括 *[Timeless](https://www.mediawiki.org/wiki/Skin:Timeless)*、*[MonoBook](https://www.mediawiki.org/wiki/Skin:MonoBook)* 和 *[Citizen](https://www.mediawiki.org/wiki/Skin:Citizen)*）会在类似性质的菜单中插入这一选项。修改插件设置后将立刻生效。

### 高亮当前行

使用这一插件时，光标所在行将添加浅蓝色背景。

### 尾随空格

使用这一插件时，每一行的尾随空格将添加浅红色背景。

### 匹配括号

匹配的括号对会添加绿色边框，未匹配的单个括号会添加黄色边框。

### 自动闭合括号和引号

MediaWiki 模式下自动闭合生效的字符包括 `(`、`[`、`{` 和 `"`，不包括有特殊含义的 `'`。如果在选中部分文字的情况下键入这些字符，选中的文字会被成对的括号或引号包裹。

### 匹配标签

匹配的标签对或自封闭标签会添加浅绿色背景，未匹配的标签会添加浅黄色背景。注意被高亮标记为错误的标签不会进行匹配。

### 代码折叠

光标移动至模板内部时会在该行代码上方出现一个淡黄色背景的 `－` 标记，点击即可折叠模板参数。折叠后使用一个带有虚线边框的 `⋯` 标记占位，点击该标记将重新展开折叠的代码部分。

### HTML/URL编码快捷键

添加以下快捷键：

- `Ctrl`/`Cmd` + `[`: 将选中的文字转换为HTML实体
- `Ctrl`/`Cmd` + `]`: 将选中的文字解码或转换为URL编码

### 快速打开内部链接

右键点击被高亮标记为内部链接或模板标题时，会在新标签页打开对应页面。

### 维基语法检查

这个功能基于 [wikiparser-node](https://github.com/bhsd-harry/wikiparser-node)。开启后将在编辑框内提示可能存在的维基语法错误。

### 调整缩进

这是一个设置选项。默认设置下使用 Tab 进行缩进。

## Supported languages

- English (en)
- 中文(简体) (zh-hans)
- 中文(繁體) (zh-hant)

[GNU General Public License 3.0](https://www.gnu.org/licenses/gpl-3.0-standalone.html)
