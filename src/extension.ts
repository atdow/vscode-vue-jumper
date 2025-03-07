/*
 * @Author: atdow
 * @Date: 2017-08-21 14:59:59
 * @LastEditors: null
 * @LastEditTime: 2022-11-06 18:18:04
 * @Description: file description
 */
'use strict'
import * as vscode from 'vscode'
import JumperFileDefinitionProvider from './JumperFileDefinitionProvider'
import { IRule } from './types'
import provideVueComponentHover from './provideVueComponentHover'

const languageConfiguration: vscode.LanguageConfiguration = {
  wordPattern: /(\w+((-\w+)+)?)/
}

export function activate(context: vscode.ExtensionContext) {
  const configParams = vscode.workspace.getConfiguration('vue-jumper')
  const supportedLanguages = ['vue']
  const aliasConfigs = configParams.get('aliasConfigs') as Array<string>
  const globalComponentsPrefixConfigs = configParams.get('globalComponentsPrefixConfigs') as Array<string>
  const rules = configParams.get('rules') as IRule[]

  // 获取默认搜索模式
  const defaultRule = rules.find((rule) => rule.prefix === '*')

  // 确保有默认搜索模式
  if (!defaultRule) {
    rules.push({
      prefix: '*',
      searchPattern: {
        include: '**/$1',
        exclude: '**/{node_modules,build,dist}'
      }
    })
  }

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      supportedLanguages,
      new JumperFileDefinitionProvider({
        aliasConfigs,
        globalComponentsPrefixConfigs,
        rules
      })
    )
  )

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(supportedLanguages, {
      provideHover: (document, position) => provideVueComponentHover(document, position, rules)
    })
  )

  /* Provides way to get selected text even if there is dash
   * ( must have fot retrieving component name )
   */
  context.subscriptions.push(vscode.languages.setLanguageConfiguration('vue', languageConfiguration))
}

// this method is called when your extension is deactivated
export function deactivate() {}
