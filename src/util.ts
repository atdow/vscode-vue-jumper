/*
 * @Author: atdow
 * @Date: 2022-10-29 19:56:13
 * @LastEditors: null
 * @LastEditTime: 2022-10-30 03:30:54
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
      this.showError("暂不支持多工作区！");
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
};

module.exports = util;
