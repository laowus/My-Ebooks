# <div align='center'><img src="https://github.com/laowus/You-Ebook/blob/main/public/icon.png" width="100" height="100"><br/>捡书 My Ebooks</div>

一款基于 Tauri + Vue 3 开发的电子书编辑器。

你可以导入一些电子书，合并删除其中的内容，然后生成导出。

支持导入格式: EPUB、MOBI、TXT、HTML、AZW3、FB2、

导出格式：EPUB、TXT、HTML

### 联系:

有兴趣可以加入

QQ 群：616712461 (备注：My Ebook)

或者本人

QQ:37156760 (备注：My Ebook)

交流共同进步

### TODO

-v 0.0.2

- [x] 1、 输出 HTML 空格转义。
- [x] 2、 目录标题拉动，进行位置的更改。

-v 0.0.3

- [x] 1、 批量编辑，删空行，缩进。
      ![Github snap 6](https://github.com/laowus/You-Ebook/blob/main/snapshot/06.jpg)
- [x] 2、 优化正则分割章节
      ![Github snap 7](https://github.com/laowus/You-Ebook/blob/main/snapshot/07.jpg)

-v 0.0.4

- [x] 3、 支持 html 文字( 加粗, 斜体, 下划线, 颜色, 方向 添加图片 )
      解压 epub 文件的图片放到 images 文件夹下面, 文件名使用自定义的短 id（避免重复）
      同步解析 html 标签，转换为对应的格式。图片存放形式：images/短 id.图片格式
      写入数据库中。
      ![Github snap 10](https://github.com/laowus/You-Ebook/blob/main/snapshot/10.jpg)
      ![Github snap 11](https://github.com/laowus/You-Ebook/blob/main/snapshot/11.jpg)
- [x] 4、 数据备份, 数据恢复。
      备份 bookdata 文件夹下面 zip 文件, 恢复时解压到程序目录下的 bookdata 文件夹中。
      ![Github snap 13](https://github.com/laowus/You-Ebook/blob/main/snapshot/13.jpg)
- [x] 5、 编辑窗口添加一个查找和替换文字的操作框。
  - 查找：输入要查找的文字，点击查找按钮，会在编辑窗口中查找匹配的文字。
  - 替换：输入要替换的文字，点击替换按钮，会将当前选中的文字替换为输入的文字。
  - 全部替换：输入要替换的文字，点击全部替换按钮，会将所有匹配的文字都替换为输入的文字。
    ![Github snap 12](https://github.com/laowus/You-Ebook/blob/main/snapshot/12.jpg)

-v 0.0.5

- [x] 6、 支持章节标题添加 html 标签。
      批量对内容页添加章名
      ![Github snap 14](https://github.com/laowus/You-Ebook/blob/main/snapshot/14.jpg)
      ![Github snap 15](https://github.com/laowus/You-Ebook/blob/main/snapshot/15.jpg)

- [x] 7、修改正则
      修复一些 bug，添加 无法正则的提示。
      优化正则，支持对内容页添加章名的正则匹配。支持 一 二 这种章名进行分割.

- [x] 8、 处理图片相关问题, 图片目录不存在导致写入错误。
      cover 封面是否需要写入数据库中。保存路径默认 /cover/bookId.jpg。

### 开发/测试环境

- Windows 10( 个人电脑只有 Windows 系统的,linux 苹果系统没有测试)
- IDE：[Visual Studio Code](https://code.visualstudio.com/)
- [Nodejs](https://nodejs.org/)：v20.18.0(只是我电脑上的版本,其他版本可能也没关系)
- 其他：详见 [package.json](package.json)

### 功能特性

- 支持导入文件格式：EPUB、TXT、HTML、MOBI （导入前确认下导入文件是否为标准格式）
- 支持导出文件格式：EPUB、TXT、HTML
- 两种书籍生成方式。
  - 1、新建书籍：
    - 输入书籍名字和作者，简介，还有封面。
    - 如果是当前有正在编辑的书籍，则会覆盖当前的书籍（书籍不会被删除，可以在历史记录里面）
  - 2、导入书籍。
    - 导入前如果没有在编辑的书籍状态，则默认为当前导入的书籍为书籍信息。譬如导入的是 epub 文件，就会获取当前 epub 文件的名字和作者、封面作为当前的书籍信息。
    - （默认如果当前是书籍编辑状态，导入则为增加到当前书籍中的内容。如果想重新新建一个书籍，请重启软件恢复空状态，或者新建一本书。）

### 预览图

![Github snap 1](https://github.com/laowus/You-Ebook/blob/main/snapshot/01.jpg)
![Github snap 2](https://github.com/laowus/You-Ebook/blob/main/snapshot/02.jpg)
![Github snap 3](https://github.com/laowus/You-Ebook/blob/main/snapshot/03.jpg)
![Github snap 4](https://github.com/laowus/You-Ebook/blob/main/snapshot/04.jpg)
![Github snap 5](https://github.com/laowus/You-Ebook/blob/main/snapshot/05.jpg)
![Github snap 6](https://github.com/laowus/You-Ebook/blob/main/snapshot/06.jpg)
![Github snap 7](https://github.com/laowus/You-Ebook/blob/main/snapshot/07.jpg)
![Github snap 8](https://github.com/laowus/You-Ebook/blob/main/snapshot/08.jpg)

### For 开发者- 请先下载安装最新版（或最新 LTS 版本） [Nodejs](https://nodejs.org/)

### 还有安装 rust, 还要安装 vs 2019 的 c++ 开发工具

- <b>安装依赖</b>
  `pnpm install`
- <b>开发模式运行</b>
  `pnpm tauri dev`
- <b>构建打包</b>
  `pnpm tauri build`
