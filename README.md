# Wikiplus-highlight
[![npm version](https://badge.fury.io/js/wikiplus-highlight.svg)](https://www.npmjs.com/package/wikiplus-highlight)
[![npm downloads](https://img.shields.io/npm/dw/wikiplus-highlight.svg)](https://www.npmjs.com/package/wikiplus-highlight)
[![jsdelivr hits](https://img.shields.io/jsdelivr/npm/hd/wikiplus-highlight.svg)](https://www.npmjs.com/package/wikiplus-highlight)

**Wikiplus-highlight** 是由 Bhsd 编写的一款 [Wikiplus](https://github.com/Wikiplus/Wikiplus) 语法高亮插件，它主要基于 MediaWiki 内置的 [JavaScript 模块](https://www.mediawiki.org/wiki/ResourceLoader/Core_modules)和 [CodeMirror](https://codemirror.net/) 编写。

## 使用方法

### 最新版本

在*个人 JS 页*添加以下代码：

```javascript
mw.loader.load('//cdn.jsdelivr.net/npm/wikiplus-highlight@2.12.1');
```

或

```javascript
mw.loader.load('//unpkg.com/wikiplus-highlight@2.12.1/dist/main.min.js');
```

### 稳定版本

在*个人 JS 页*添加以下代码：

```javascript
mw.loader.load('//cdn.jsdelivr.net/npm/wikiplus-highlight');
```

或

```javascript
mw.loader.load('//unpkg.com/wikiplus-highlight/dist/main.min.js');
```

由于 CDN 的缓存机制，稳定版本的更新大约会滞后一周。

## 更多插件

使用 *[Vector](https://www.mediawiki.org/wiki/Skin:Vector)* 皮肤或 MediaWiki 1.35 及以上的 *[Minerva Neue](https://www.mediawiki.org/wiki/Skin:Minerva_Neue)* 皮肤时，在右上角的【更多】菜单将添加一个【Wikiplus高亮设置】选项，点击后可以选择想要加载的 CodeMirror 插件。其他桌面版皮肤（包括 *[Timeless](https://www.mediawiki.org/wiki/Skin:Timeless)*、*[MonoBook](https://www.mediawiki.org/wiki/Skin:MonoBook)* 和 *[Citizen](https://www.mediawiki.org/wiki/Skin:Citizen)*）会在类似性质的菜单中插入这一选项。默认加载【搜索】插件。修改插件设置后，不需要重载页面，只需打开一个新的 Wikiplus 编辑框就会立刻生效。

### 搜索

这个插件会向 Wikiplus 编辑区添加一个【搜索】按钮及以下快捷键：

- `Ctrl`/`Cmd` + `F`: 打开搜索框
- `Ctrl`/`Cmd` + `G`: 搜索下一处
- `Shift` + `Ctrl`/`Cmd` + `G`: 搜索上一处

除了使用以上快捷键，也可以通过在搜索框中按下 `Enter` 键或点击搜索框右侧的 `▼` 按钮来执行搜索下一处的命令，点击 `▲` 按钮将执行搜索上一处的命令。搜索可以使用字符串，也可以使用形如 `/re/` 或 `/re/i` 的正则表达式。正则表达式仅接受可选的 `i` 修饰符，暂不接受其他修饰符。全文中匹配的字符都会添加淡粉色背景。如果没有匹配的结果，搜索框会添加粉色背景。

### 高亮当前行

使用这一插件时，如果当前没有选中的文字，光标所在行将添加浅蓝色背景。

### 尾随空格

使用这一插件时，每一行的尾随空格将添加红色波浪下划线。

### 匹配括号

与 MediaWiki 官方提供的 [CodeMirror](https://www.mediawiki.org/wiki/Extension:CodeMirror) 扩展不同，这一插件只会在光标位于括号（包括 `{}`、`[]`，JavaScript、CSS 和 Lua 模式下还包括 `()`）处时才会生效，但括号匹配时会考虑其语法含义。以下是一个简单的例子：

```wikitext
<!--[-->]
```

CodeMirror 扩展会错误地匹配 `<!-- -->` 注释内外的括号，而这个插件不会。匹配的括号对会添加绿色边框，未匹配的单个括号会添加黄色边框。

### 自动闭合括号和引号

MediaWiki 模式下自动闭合生效的字符包括 `(`、`[`、`{` 和 `"`，不包括有特殊含义的 `'`。如果在选中部分文字的情况下键入这些字符，选中的文字会被成对的括号或引号包裹。

### 匹配标签

匹配的标签对或自封闭标签会添加浅绿色背景，未匹配的标签会添加浅黄色背景。注意被高亮标记为错误的标签不会进行匹配。

### 代码折叠

光标移动至模板参数或扩展/HTML 标签内部时会在该行代码上方出现一个淡黄色背景的 `－` 标记，点击即可折叠模板参数或标签内部文本。折叠后使用一个带有虚线边框的 `⋯` 标记占位，点击该标记将重新展开折叠的代码部分。

### HTML/URL编码快捷键

添加以下快捷键：

- `Ctrl`/`Cmd` + `/`: 将选中的文字转换为HTML实体
- `Ctrl`/`Cmd` + `\`: 将选中的文字转换为URL编码

### 快速打开模板

右键点击被高亮标记为模板标题或 `#invoke` 魔术字的第一个参数（即模块标题）时，会在新标签页打开对应页面。如果当前站点安装了 [Widget](https://www.mediawiki.org/wiki/Extension:Widget) 扩展，则当右键点击 `#widget` 魔术字的第一个参数（即小部件标题）时会在新标签页打开对应小部件的编辑界面（即 `action=edit`）。

### 调整缩进

这不是一个真正意义上的插件，而是一个设置选项。默认设置下使用 Tab 进行缩进。勾选这一选项时，会出现一个新的文本框以设置缩进对应的空格个数，初始值为 `4`。

### 用于其他编辑器

勾选这一选项时，除[【搜索】](#搜索)插件以外的当前正在使用的插件也将作用于其他开启了 CodeMirror 高亮的编辑器。目前支持的编辑器包括 [InPageEdit-v2](https://github.com/inpageedit/inpageedit-v2) 和 [Inspector](https://zh.moegirl.org.cn/User:Bhsd/Inspector)，不包括 MediaWiki 默认的编辑器。

## Supported languages

- **English (en)**
- ‪**中文(简体)‬ (zh-hans)**
- 中文(繁體)‬ (zh-hant)

[GNU General Public License 3.0](https://www.gnu.org/licenses/gpl-3.0-standalone.html)
