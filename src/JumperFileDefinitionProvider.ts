/*
 * @Author: atdow
 * @Date: 2017-08-21 14:59:59
 * @LastEditors: null
 * @LastEditTime: 2022-11-05 00:16:05
 * @Description: file description
 */
import * as vscode from 'vscode'
const pathUtil = require('path')
const util = require('./util')
const fs = require('fs')

interface IAliasConfigsItem {
  alias: string
  target: string
}

export default class JumperFileDefinitionProvider implements vscode.DefinitionProvider {
  targetFileExtensions: string[] = []
  aliasConfigs: IAliasConfigsItem[] = []

  constructor(targetFileExtensions: string[] = [], aliasConfigs: string[] = []) {
    this.targetFileExtensions = targetFileExtensions
    aliasConfigs.forEach((aliasConfigsItem) => {
      try {
        const aliasConfigsItemArr = aliasConfigsItem.split(':')
        if (aliasConfigsItemArr && aliasConfigsItemArr.length === 2) {
          this.aliasConfigs.push({
            alias: aliasConfigsItemArr[0],
            target: aliasConfigsItemArr[1]
          })
        }
      } catch (error) {
        // console.log("aliasConfigs:", aliasConfigs);
      }
    })
  }

  async judeLineType(line: String, keyword: string, document) {
    const that = this
    const lineInfo: {
      type: string
      path: String
      originPath: string
    } = {
      type: '',
      path: '',
      originPath: ''
    }
    if (!line) {
      return lineInfo
    }
    const pureLine = line.trim()
    const importObj = util.documentFindAllImport(
      document.getText(),
      that.aliasConfigs,
      (document.uri ? document.uri : document).fsPath
    )
    console.log('importObj:', importObj)
    const registerComponentsObj = util.documentFindRegisterComponentsObj(document.getText()) || {}
    // import 类型
    if (pureLine.startsWith('import')) {
      lineInfo.type = 'import'
      this.componentNameInImportObjUpdateLineInfo(keyword, importObj, lineInfo)
    }
    // 标签类型
    if (pureLine.startsWith('<')) {
      lineInfo.type = 'tag'
      let searchComponentName = util.upperCamelCaseTagName(keyword)
      // 直接从importObj中查找
      this.componentNameInImportObjUpdateLineInfo(searchComponentName, importObj, lineInfo)
      // 从components中查找(组件重命名情况) components: { RenameMyComponent: MyComponent, 's-my-component2': MyComponent2 }
      if (!lineInfo.path) {
        Object.keys(registerComponentsObj).forEach((key) => {
          if (key === searchComponentName || key === keyword) {
            searchComponentName = registerComponentsObj[key]
          }
        })
        this.componentNameInImportObjUpdateLineInfo(searchComponentName, importObj, lineInfo)
      }
      // 从mixins中找
      if (!lineInfo.path) {
        const mixins = util.documentFindMixins(document.getText()) || []
        for (let i = mixins.length - 1; i >= 0; i--) {
          // 从后面往前找，如果找到了就不再找了
          if (lineInfo.path) {
            break
          }
          let mixinsPath = importObj[mixins[i]].path
          const mixinsPathArr = []
          if (!mixinsPath.endsWith('.js') && !mixinsPath.endsWith('.ts')) {
            mixinsPathArr.push(this.searchFilePath(`${mixinsPath}.js`))
            mixinsPathArr.push(this.searchFilePath(`${mixinsPath}.ts`))
          } else {
            mixinsPathArr.push(this.searchFilePath(`${mixinsPath}`))
          }
          const mixinsFilePathArr = (await Promise.all(mixinsPathArr)) || []
          mixinsFilePathArr.forEach((resItem) => {
            if (resItem.length === 0) {
              return
            }
            const mixinsFilePath = resItem[0]
            let readFileSyncFormatFilePath = mixinsFilePath.path
            if (util.isWindows()) {
              // /c:/code/xxx/src/views/mixins1.js ==> c://code//xxx//src//views//mixins1.js
              readFileSyncFormatFilePath = readFileSyncFormatFilePath.slice(1).replace(/\//g, '//')
            }
            let file = fs.readFileSync(readFileSyncFormatFilePath, { encoding: 'utf-8' })
            if (!file) {
              return
            }
            let documentFindAllImportFormatPath = mixinsFilePath.path
            if (util.isWindows()) {
              // /c:/code/xxx/src/views/mixins1.js => c:/code/xxx/src/views/mixins1.js 为了让documentFindAllImport方法保持一致
              documentFindAllImportFormatPath = documentFindAllImportFormatPath.slice(1)
            }
            const mixinsFileImportObj = util.documentFindAllImport(
              file,
              that.aliasConfigs,
              documentFindAllImportFormatPath
            )
            const mixinsFileRegisterComponentsObj = util.documentFindRegisterComponentsObj(file) || {}
            let searchComponentName = util.upperCamelCaseTagName(keyword)
            Object.keys(mixinsFileRegisterComponentsObj).forEach((key) => {
              if (key === searchComponentName || key === keyword) {
                searchComponentName = mixinsFileRegisterComponentsObj[key]
              }
            })
            this.componentNameInImportObjUpdateLineInfo(searchComponentName, mixinsFileImportObj, lineInfo)
          })
        }
      }
    }
    return lineInfo
  }
  /**
   * 从importObj找到对应的componentName信息，并用来更新lineInfo
   * @param componentName
   * @param importObj
   * @param lineInfo
   */
  componentNameInImportObjUpdateLineInfo(componentName, importObj, lineInfo) {
    Object.keys(importObj).forEach((key) => {
      if (key === componentName) {
        lineInfo.originPath = importObj[componentName].originPath
        lineInfo.path = importObj[componentName].path
      }
    })
  }

  getComponentName(position: vscode.Position, document) {
    const doc = vscode.window.activeTextEditor.document
    const selection = doc.getWordRangeAtPosition(position)
    const selectedText = doc.getText(selection)
    let lineText = doc.lineAt(position).text
    const lineInfo = this.judeLineType(lineText, selectedText, document)
    // console.log("lineInfo:", lineInfo);
    return lineInfo
      .then((res) => {
        const { type, path, originPath } = res
        let possibleFileNames = []
        if (type === 'import' || type === 'tag') {
          possibleFileNamesAdd(path)
        }
        function possibleFileNamesAdd(originPath) {
          if (!path) {
            return
          }
          if (!path.endsWith('.vue')) {
            possibleFileNames.push(path + '.vue')
            possibleFileNames.push(path + '/index.vue')
          }
          if (!path.endsWith('.js')) {
            possibleFileNames.push(path + '.js')
            possibleFileNames.push(path + '/index.js')
          }
          if (!path.endsWith('.jsx')) {
            possibleFileNames.push(path + '.jsx')
            possibleFileNames.push(path + '/index.jsx')
          }
          possibleFileNames.push(path)
        }

        return possibleFileNames
      })
      .catch(() => {
        return []
      })
  }

  searchFilePath(fileName: String): Thenable<vscode.Uri[]> {
    return vscode.workspace.findFiles(`**/${fileName}`, '**/node_modules') // Returns promise
  }

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Location | vscode.Location[]> {
    let filePaths = []
    return this.getComponentName(position, document).then((componentNames) => {
      // console.log("componentNames:", componentNames);
      const searchPathActions = componentNames.map(this.searchFilePath)
      const searchPromises = Promise.all(searchPathActions) // pass array of promises
      return searchPromises.then(
        (paths) => {
          filePaths = [].concat.apply([], paths)

          if (filePaths.length) {
            let allPaths = []
            filePaths.forEach((filePath) => {
              allPaths.push(new vscode.Location(vscode.Uri.file(`${filePath.path}`), new vscode.Position(0, 1)))
            })
            return allPaths
          } else {
            return undefined
          }
        },
        (reason) => {
          return undefined
        }
      )
    })
  }
}
