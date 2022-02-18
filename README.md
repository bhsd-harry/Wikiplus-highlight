# Wikiplus-highlight

**Wikiplus-highlight** 是由 Bhsd 编写的一款 [Wikiplus](https://github.com/Wikiplus/Wikiplus) 语法高亮插件，它主要基于 MediaWiki 内置的 [JavaScript 模块](https://www.mediawiki.org/wiki/ResourceLoader/Core_modules)和 [CodeMirror](https://codemirror.net/) 编写。

## 使用方法

在*个人 JS 页*添加以下代码：

```javascript
mw.loader.load('//cdn.jsdelivr.net/gh/bhsd-harry/Wikiplus-highlight@2.0/main.min.js');
```

## 更多插件

使用 *Vector* 皮肤时，在右上角的【更多】菜单将添加一个【Wikiplus高亮设置】选项，点击后可以选择想要加载的 CodeMirror 插件。默认加载【搜索】插件。

### 搜索

这个插件会向 Wikiplus 编辑区添加一个【搜索】按钮及以下快捷键：

- Ctrl(Cmd)-F: 打开搜索框
- Ctrl(Cmd)-G: 搜索下一处
- Shift-Ctrl(Cmd)-G: 搜索上一处

搜索可以使用字符串，也可以使用形如 `/re/` 或 `/re/i` 的正则表达式。正则表达式仅接受可选的 `i` 修饰符，暂不接受其他修饰符。

## Supported languages

- **English (en)**
- ‪**中文(简体)‬ (zh-hans)**
- 中文(繁體)‬ (zh-hant)

[GNU General Public License 3.0](https://www.gnu.org/licenses/gpl-3.0-standalone.html)
