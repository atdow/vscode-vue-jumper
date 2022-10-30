# vscode-vue-jumper

vue文件跳转到文件定义支持。支持标签跳转、import相对路径文件跳转、import别名路径文件跳转。

## 1. 标签跳转

支持大驼峰组件、中划线组件。

```html
<my-component></my-component>
<MyComponent></MyComponent>
```

## 2. import相对路径文件跳转

```js
import MyComponent form '../../component/MyComponent'
import MyComponent2 form '../../component/MyComponent2.vue'
```

## 3. import别名路径文件跳转

```js
import MyComponent form '@/component/MyComponent'
```

默认配置了 `@:src` ，如果有需要，请到插件配置中设置aliasConfigs：

格式： `别名名称:目标路径`
