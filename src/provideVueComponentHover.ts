import * as vscode from 'vscode'
import { IRule } from './types'

export default function provideVueComponentHover(document, position, rules: IRule[]) {
  const componentName = document.getText(document.getWordRangeAtPosition(position))

  // 遍历配置查找匹配的组件前缀
  for (const rule of rules) {
    if (componentName.startsWith(rule.prefix) && rule.docUrl) {
      const url = rule.docUrl.replace('{name}', componentName)

      return new vscode.Hover(`See：${url}`)
    }
  }
}
