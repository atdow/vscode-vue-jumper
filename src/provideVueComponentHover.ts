import * as vscode from 'vscode'
import { IComponentDocsConfig } from './types'

export default function provideVueComponentHover(document, position, componentDocsConfig: IComponentDocsConfig[]) {
  const componentName = document.getText(document.getWordRangeAtPosition(position))

  // 遍历配置查找匹配的组件前缀
  for (const item of componentDocsConfig) {
    if (componentName.startsWith(item.prefix)) {
      const url = item.url.replace('{name}', componentName)
      return new vscode.Hover(`See：${url}`)
    }
  }
}
