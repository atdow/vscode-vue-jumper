/*
 * @Author: atdow
 * @Date: 2022-10-29 19:56:13
 * @LastEditors: null
 * @LastEditTime: 2023-02-12 13:22:01
 * @Description: file description
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const vscode = require('vscode')
import { IAliasConfigsItem } from './types'

const util = {
  isWindows: function (): boolean {
    // console.log("fs:", fs);
    const isWindows: boolean = /\\/.test(vscode.workspace.rootPath)
    return isWindows
  },
  getCurrentDir: function (currentFile: string): string {
    let workspaceFolders: string[] = vscode.workspace.workspaceFolders.map((item) => item.uri.path)
    let formatCurrentFile: string = currentFile
    if (this.isWindows()) {
      formatCurrentFile = '/' + currentFile.replace(/\\/g, '/')
    }
    // 防止文件根目录和workspaceFolders根目录有大小写差异（主要是windows）
    const upperCaseFilePathRootFolder: string = this.upperCaseFilePathRootFolder(formatCurrentFile)
    const lowerCaseFilePathRootFolder: string = this.lowerCaseFilePathRootFolder(formatCurrentFile)
    // 当前工作区
    let currentWorkspaceFolder: string = ''
    workspaceFolders.forEach((workspaceFoldersItem) => {
      // 这里的判断应该是无用的，可能是虚拟机导致的问题
      if (formatCurrentFile.startsWith('/w:') || formatCurrentFile.startsWith('/W:')) {
        if (formatCurrentFile.slice(3).indexOf(workspaceFoldersItem.slice(3)) === 0) {
          currentWorkspaceFolder = workspaceFoldersItem
        }
      } else {
        if (
          upperCaseFilePathRootFolder.indexOf(workspaceFoldersItem) === 0 ||
          lowerCaseFilePathRootFolder.indexOf(workspaceFoldersItem) === 0
        ) {
          currentWorkspaceFolder = workspaceFoldersItem
        }
      }
    })
    // 这里多了一层目录，也就是当前文件名
    const currentFilePath: string = formatCurrentFile.slice(currentWorkspaceFolder.length + 1)
    const currentFilePathArr: string[] = currentFilePath.split('/')
    return currentFilePathArr.slice(0, currentFilePathArr.length - 1).join('/') // 去除当前文件名并返回
  },
  /**
   * 将路径根目录转大写
   * @param filePath
   * @returns
   */
  upperCaseFilePathRootFolder(filePath: string = ''): string {
    const filePathCharArr = filePath.split('')
    if (!this.charIsUpperCase(filePathCharArr[1])) {
      filePathCharArr[1] = filePathCharArr[1].toLocaleUpperCase()
    }
    return filePathCharArr.join('')
  },
  /**
   * 将路径根目录转小写
   * @param filePath
   * @returns
   */
  lowerCaseFilePathRootFolder(filePath: string = ''): string {
    const filePathCharArr = filePath.split('')
    if (this.charIsUpperCase(filePathCharArr[1])) {
      filePathCharArr[1] = filePathCharArr[1].toLocaleLowerCase()
    }
    return filePathCharArr.join('')
  },
  /**
   * 判断字符是不是大写
   * @param char
   * @returns
   */
  charIsUpperCase(char: string = ''): boolean {
    const charCode = char.charCodeAt(0)
    // 大写字母
    if (charCode >= 65 && charCode <= 90) {
      return true
    } else {
      return false
    }
  },
  /**
   * 从文档文本中查找组件引入代码行
   * @param documentText 文档文本
   * @param componentName 组件名
   * @returns 引入文本行: import MyComponent from "../../MyComponent"
   */
  documentTextFindComponentImportLine(documentText: string, componentName: string): string {
    let importLine: string = ''
    if (documentText.match(/import.+['"]/)) {
      const importArr: string[] = documentText.match(/[^//]import.+['"]/g)
      importLine = importArr.find((item) => item.indexOf(componentName) !== -1) || ''
    }
    return importLine
  },
  documentFindAllImport(
    // document,
    documentText: string = '',
    aliasConfigs: IAliasConfigsItem[] = [],
    currentFilePath: string = ''
  ): object {
    const obj: object = {}
    // console.log("documentText:", documentText);
    if (documentText.match(/import.+['"]/)) {
      const importArr: string[] = documentText.match(/(?<!\/\/\s.*|<!--\s.*)import.+['"]/g)
      importArr.forEach((importLineItem) => {
        let componentName: string = ''
        const path: string = this.importLineFindOriginImportPath(importLineItem)
        const tagSliceArr: string[] = importLineItem.match(/import.*?from/) || [] // ['import componentName from']
        if (tagSliceArr.length > 0) {
          // ['import', 'componentName', 'from']
          componentName = (tagSliceArr[0].match(/[a-zA-Z0-9_]+/g) || []).find(
            (item) => item.trim() !== 'import' && item.trim() !== 'from'
          )
        }
        if (componentName) {
          obj[componentName] = { originPath: path }
        }
        // console.log("componentName:", componentName);
      })
    }
    this.documentImportObjAddPath(obj, aliasConfigs, currentFilePath)
    // console.log("obj:", obj);
    return obj
  },
  documentImportObjAddPath(
    documentImportObj: object = {},
    aliasConfigs: IAliasConfigsItem[] = [],
    currentFilePath: string = ''
  ) {
    Object.keys(documentImportObj).forEach((key) => {
      let absolutePath: string = ''
      const originImportPath: string = documentImportObj[key].originPath
      const pureOriginImportPath: string = originImportPath.replace(/^[\.]\//, '') // 清除./
      const currentDirPath: string = this.getCurrentDir(currentFilePath)
      // console.log('currentDirPath:', currentDirPath)
      // 带../相对路径
      if (pureOriginImportPath.match(/\.\.\//)) {
        const appendPath: string = pureOriginImportPath.replace(/\.\.\//, '') // 去除../
        const pathMeshArr: string[] = pureOriginImportPath.match(/\.\.\//)
        const currentDirPathArr: string[] = currentDirPath.split('/')
        // 相对目录路径
        const prefixPath: string = currentDirPathArr.slice(0, currentDirPathArr.length - pathMeshArr.length).join('/')
        absolutePath = `${prefixPath}/${appendPath}`
      } else {
        // 当前目录下
        absolutePath = `${currentDirPath}/${pureOriginImportPath}`
      }
      // alias别名替换
      aliasConfigs.forEach((aliasConfigsItem) => {
        if (originImportPath.startsWith(aliasConfigsItem.alias)) {
          absolutePath = originImportPath.replace(new RegExp(`${aliasConfigsItem.alias}`), aliasConfigsItem.target)
        }
      })
      documentImportObj[key].path = absolutePath
    })
  },
  documentFindRegisterComponentsObj(documentText: string = ''): object {
    // const documentText = document.getText();
    /**
      匹配到以下结果:
      components: { 's-component': SComponent, MyComponent }

      components: { 
        // 我是注释
        's-component': SComponent, // 我是注释
        MyComponent 
      }
     */
    const componentsCombine: string[] = documentText.match(/components[\s]?:[\s\S]*?{[\s\S]*?}/g) || []
    // console.log("componentsCombine:", componentsCombine);
    if (componentsCombine && componentsCombine.length > 0) {
      /**
        匹配到以下结果:
        { 's-component': SComponent, MyComponent }

        { 
          // 我是注释
          's-component': SComponent, // 我是注释
          MyComponent 
        }
       */
      const componentObjStrArr: string[] = componentsCombine[0].match(/{[\s\S]*?}/) || []
      let componentObjStr: string = ''
      if (componentObjStrArr && componentObjStrArr.length > 0) {
        componentObjStr = componentObjStrArr[0]
      } else {
        return {}
      }
      // ["s-component: SComponent", "MyComponent"]
      const componentArr: string[] = componentObjStr
        .replace(/(\n+)|(\/{2,}.*?(\r|\n))|(\/\*(\n|.)*?\*\/)/g, '') // 去掉注释
        .replace(/[{}'"]/g, '') // 去掉花括号、'、"
        .split(',')
        .map((item) => item.trim())
        .filter((item) => !!item)
      // console.log("componentArr:", componentArr);
      const registerComponentsObj: object = {}
      componentArr.forEach((item) => {
        const splitArr: string[] = item.split(':')
        if (splitArr.length === 2) {
          registerComponentsObj[splitArr[0].trim()] = splitArr[1].trim()
        } else {
          registerComponentsObj[splitArr[0].trim()] = splitArr[0].trim()
        }
      })
      return registerComponentsObj
      // console.log("componentsObj:", componentsObj);
    }
    return {}
  },
  documentFindMixins(documentText: string = ''): string[] {
    documentText = documentText.replace(/(\n+)|(\/{2,}.*?(\r|\n))|(\/\*(\n|.)*?\*\/)/g, '') // 去掉注释
    // const documentText = document.getText();
    const mixinsCombine: string[] = documentText.match(/mixins[\s]?:[\s\S]*?\[[\s\S]*?\]/g) || []
    // console.log("mixinsCombine:", mixinsCombine);
    if (mixinsCombine && mixinsCombine.length > 0) {
      const mixinsStrArr: string[] = mixinsCombine[0].match(/\[[\s\S]*?\]/) || []
      let mixinsStr: string = ''
      if (mixinsStrArr.length > 0) {
        mixinsStr = mixinsStrArr[0]
        const mixins: string[] = mixinsStr
          .replace(/[\[\]]/g, '') // 去掉[、]
          .split(',')
          .map((item) => item.trim())
          .filter((item) => !!item)
        return mixins
      } else {
        return []
      }
    }
    return []
  },
  /**
   * 将tagName转成大驼峰
   * 主要转换: my-components --> MyComponents
   * @param tagName
   */
  upperCamelCaseTagName: function (tagName: string): string {
    let formatTagName: string = tagName
    if (formatTagName.indexOf('-') !== -1) {
      let myText: string = ''
      const textCharArr: string[] = tagName.split('')
      for (let i = 0; i < textCharArr.length; i++) {
        if (i === 0) {
          myText += textCharArr[i].toUpperCase()
        } else if (textCharArr[i] === '-') {
          textCharArr[i + 1] = textCharArr[i + 1].toUpperCase()
        } else {
          myText += textCharArr[i]
        }
      }
      formatTagName = myText
    }
    return formatTagName
  },
  /**
   * 将tagName转成kebabCase
   * 主要转换: MyComponents --> my-components
   * @param tagName
   * @returns
   */
  kebabCaseTagName: function (tagName: string): string {
    let formatTagName: string = tagName
    if (formatTagName.indexOf('-') !== -1) {
      return formatTagName
    }
    let myText = ''
    for (let i = 0; i < tagName.length; i++) {
      const char = tagName[i]
      const charCode = char.charCodeAt(0)
      // 大小字母
      if (charCode >= 65 && charCode <= 90) {
        myText += '-' + char.toLocaleLowerCase()
      } else if (charCode >= 97 && charCode <= 122) {
        // 小写字母
        myText += char
      }
    }
    formatTagName = myText.slice(1)
    return formatTagName
  },
  /**
   * 引入文本行查找原始的引入文件地址
   * @param importLine 引入文本: import MyComponent from "../../MyComponent"
   * @returns ../../MyComponent
   */
  importLineFindOriginImportPath: function (importLine: string): string {
    let originImportPath: string = ''
    // import MyComponent from "../../MyComponent"
    if (importLine.match(/\"([^\"]*)\"/)) {
      const pathArr: string[] = importLine.match(/\"([^\"]*)\"/) || []
      if (pathArr && pathArr.length > 0) {
        originImportPath = pathArr.find((item) => !item.match(/\"/))
      }
    }
    // import MyComponent from '../../MyComponent'
    if (importLine.match(/'([^\']*)'/)) {
      const pathArr: string[] = importLine.match(/'([^\']*)'/) || []
      if (pathArr && pathArr.length > 0) {
        originImportPath = pathArr.find((item) => !item.match(/'/))
      }
    }
    return originImportPath
  },
  /**
   * 弹出错误信息
   */
  showError: function (info: string) {
    vscode.window.showErrorMessage(info)
  },
  /**
   * 弹出提示信息
   */
  showInfo: function (info: string) {
    vscode.window.showInformationMessage(info)
  }
}

module.exports = util
