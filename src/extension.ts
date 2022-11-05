/*
 * @Author: atdow
 * @Date: 2017-08-21 14:59:59
 * @LastEditors: null
 * @LastEditTime: 2022-11-05 18:04:44
 * @Description: file description
 */
'use strict'
import * as vscode from 'vscode'
import JumperFileDefinitionProvider from './JumperFileDefinitionProvider'

const languageConfiguration: vscode.LanguageConfiguration = {
  wordPattern: /(\w+((-\w+)+)?)/
}

export function activate(context: vscode.ExtensionContext) {
  const configParams = vscode.workspace.getConfiguration('vue-jumper')
  const supportedLanguages = configParams.get('supportedLanguages') as Array<string>
  const targetFileExtensions = configParams.get('targetFileExtensions') as Array<string>
  const aliasConfigs = configParams.get('aliasConfigs') as Array<string>

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      supportedLanguages,
      new JumperFileDefinitionProvider(targetFileExtensions, aliasConfigs)
    )
  )

  /* Provides way to get selected text even if there is dash
   * ( must have fot retrieving component name )
   */
  context.subscriptions.push(vscode.languages.setLanguageConfiguration('vue', languageConfiguration))
}

// this method is called when your extension is deactivated
export function deactivate() {}
