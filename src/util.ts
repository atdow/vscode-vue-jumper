/*
 * @Author: atdow
 * @Date: 2022-10-29 19:56:13
 * @LastEditors: null
 * @LastEditTime: 2022-10-30 04:11:44
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
    if (workspaceFolders.length !== 1) {
      this.showError(
        "vue jumper暂不支持多工作区(vue jumper not support multi workspaceFolders)！"
      );
      return "";
    }
    const currentFile = (document.uri ? document.uri : document).fsPath;
    let formatCurrentFile = currentFile;
    if (this.isWindows()) {
      formatCurrentFile = "/" + currentFile.replace(/\\/g, "/");
    }
    const currentFilePath = formatCurrentFile.slice(
      workspaceFolders[0].length + 1
    );
    const currentFilePathArr = currentFilePath.split("/");
    return currentFilePathArr.slice(0, currentFilePathArr.length - 1).join("/");
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
