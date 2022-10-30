/*
 * @Author: atdow
 * @Date: 2022-10-29 19:56:13
 * @LastEditors: null
 * @LastEditTime: 2022-10-30 19:17:59
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
