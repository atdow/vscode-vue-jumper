/*
 * @Author: atdow
 * @Date: 2022-10-29 19:56:13
 * @LastEditors: null
 * @LastEditTime: 2022-10-31 00:11:23
 * @Description: file description
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const exec = require("child_process").exec;

const util = {
  isWindows: function () {
    const isWindows = /\\/.test(vscode.workspace.rootPath);
    return isWindows;
  },
  getCurrentDir: function (document) {
    let workspaceFolders = vscode.workspace.workspaceFolders.map(
      (item) => item.uri.path
    );
    const currentFile = (document.uri ? document.uri : document).fsPath;
    let formatCurrentFile = currentFile;
    if (this.isWindows()) {
      formatCurrentFile = "/" + currentFile.replace(/\\/g, "/");
    }
    // 当前工作区
    let currentWorkspaceFolder = "";
    workspaceFolders.forEach((workspaceFoldersItem) => {
      if (formatCurrentFile.indexOf(workspaceFoldersItem) === 0) {
        currentWorkspaceFolder = workspaceFoldersItem;
      }
    });
    // 这里多了一层目录，也就是当前文件名
    const currentFilePath = formatCurrentFile.slice(
      currentWorkspaceFolder.length + 1
    );
    const currentFilePathArr = currentFilePath.split("/");
    return currentFilePathArr.slice(0, currentFilePathArr.length - 1).join("/"); // 去除当前文件名并返回
  },
  /**
   * 从文档文本中查找组件引入代码行
   * @param documentText 文档文本
   * @param componentName 组件名
   * @returns 引入文本行: import MyComponent from "../../MyComponent"
   */
  documentTextFindComponentImportLine(
    documentText: string,
    componentName: string
  ): string {
    let importLine = "";
    if (documentText.match(/import.+'/)) {
      const importArr = documentText.match(/[^//]import.+'/g);
      importLine =
        importArr.find((item) => item.indexOf(componentName) !== -1) || "";
    }
    return importLine;
  },
  /**
   * 将tagName转成大驼峰
   * 主要转换: my-components --> MyComponents
   * @param tagName
   */
  upperCamelCaseTagName: function (tagName: string): string {
    let formatTagName = tagName;
    if (formatTagName.indexOf("-") !== -1) {
      let myText = "";
      const textCharArr = tagName.split("");
      for (let i = 0; i < textCharArr.length; i++) {
        if (i === 0) {
          myText += textCharArr[i].toUpperCase();
        } else if (textCharArr[i] === "-") {
          textCharArr[i + 1] = textCharArr[i + 1].toUpperCase();
        } else {
          myText += textCharArr[i];
        }
      }
      formatTagName = myText;
    }
    return formatTagName;
  },
  /**
   * 引入文本行查找原始的引入文件地址
   * @param importLine 引入文本: import MyComponent from "../../MyComponent"
   * @returns ../../MyComponent
   */
  importLineFindOriginImportPath: function (importLine: string): string {
    let originImportPath = "";
    // import MyComponent from "../../MyComponent"
    if (importLine.match(/\"([^\"]*)\"/)) {
      const pathArr = importLine.match(/\"([^\"]*)\"/);
      if (pathArr && pathArr.length > 0) {
        originImportPath = pathArr.find((item) => !item.match(/\"/));
      }
    }
    // import MyComponent from '../../MyComponent'
    if (importLine.match(/'([^\']*)'/)) {
      const pathArr = importLine.match(/'([^\']*)'/);
      if (pathArr && pathArr.length > 0) {
        originImportPath = pathArr.find((item) => !item.match(/'/));
      }
    }
    return originImportPath;
  },
  /**
   * 弹出错误信息
   */
  showError: function (info) {
    vscode.window.showErrorMessage(info);
  },
  /**
   * 弹出提示信息
   */
  showInfo: function (info) {
    vscode.window.showInformationMessage(info);
  },
};

module.exports = util;
