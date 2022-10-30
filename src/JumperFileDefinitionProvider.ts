/*
 * @Author: atdow
 * @Date: 2017-08-21 14:59:59
 * @LastEditors: null
 * @LastEditTime: 2022-10-31 00:40:11
 * @Description: file description
 */
import * as vscode from "vscode";
const pathUtil = require("path");
const util = require("./util");

interface IAliasConfigsItem {
  alias: string;
  target: string;
}

export default class JumperFileDefinitionProvider
  implements vscode.DefinitionProvider
{
  targetFileExtensions: string[] = [];
  aliasConfigs: IAliasConfigsItem[] = [];

  constructor(
    targetFileExtensions: string[] = [],
    aliasConfigs: string[] = []
  ) {
    this.targetFileExtensions = targetFileExtensions;
    aliasConfigs.forEach((aliasConfigsItem) => {
      try {
        const aliasConfigsItemArr = aliasConfigsItem.split(":");
        if (aliasConfigsItemArr && aliasConfigsItemArr.length === 2) {
          this.aliasConfigs.push({
            alias: aliasConfigsItemArr[0],
            target: aliasConfigsItemArr[1],
          });
        }
      } catch (error) {
        // console.log("aliasConfigs:", aliasConfigs);
      }
    });
  }

  judeLineType(line: String, keyword: string, document) {
    const that = this;
    const lineInfo: {
      type: string;
      path: String;
      simplePath: string;
      hasAlias: Boolean;
      aliasPath: string;
      absolutePath: string;
    } = {
      type: "",
      path: "",
      simplePath: "",
      hasAlias: false,
      aliasPath: "",
      absolutePath: "",
    };
    if (!line) {
      return lineInfo;
    }
    const pureLine = line.trim();
    // import 类型
    if (pureLine.startsWith("import")) {
      lineInfo.type = "import";
      lineTextUpdateLineInfo(pureLine);
    }
    // 标签类型
    if (pureLine.startsWith("<")) {
      lineInfo.type = "tag";
      const importLine = util.documentTextFindComponentImportLine(
        document.getText(),
        util.upperCamelCaseTagName(keyword)
      );
      if (importLine) {
        lineTextUpdateLineInfo(importLine.trim());
      }
    }
    function lineTextUpdateLineInfo(lineText) {
      const { path, simplePath, hasAlias, aliasPath, absolutePath } =
        importTypeAnalysis(lineText);
      lineInfo.path = path;
      lineInfo.simplePath = simplePath;
      lineInfo.hasAlias = hasAlias;
      lineInfo.aliasPath = aliasPath;
      lineInfo.absolutePath = absolutePath;
    }
    function importTypeAnalysis(importLine) {
      let path = "";
      let simplePath = "";
      let aliasPath = "";
      let hasAlias = false;
      let absolutePath = "";

      const originImportPath = util.importLineFindOriginImportPath(importLine);
      const pureOriginImportPath = originImportPath.replace(/^[\.]\//, ""); // 清除./
      const currentDirPath = util.getCurrentDir(document);

      // 带../相对路径
      if (pureOriginImportPath.match(/\.\.\//)) {
        const appendPath = pureOriginImportPath.replace(/\.\.\//, ""); // 去除../
        const pathMeshArr = pureOriginImportPath.match(/\.\.\//);
        const currentDirPathArr = currentDirPath.split("/");
        // 相对目录路径
        const prefixPath = currentDirPathArr
          .slice(0, currentDirPathArr.length - pathMeshArr.length)
          .join("/");
        absolutePath = `${prefixPath}/${appendPath}`;
      } else {
        // 当前目录下
        absolutePath = `${currentDirPath}/${pureOriginImportPath}`;
      }

      // alias别名替换
      that.aliasConfigs.forEach((aliasConfigsItem) => {
        if (originImportPath.startsWith(aliasConfigsItem.alias)) {
          hasAlias = true;
          aliasPath = originImportPath.replace(
            new RegExp(`${aliasConfigsItem.alias}`),
            aliasConfigsItem.target
          );
        }
      });
      return { path, simplePath, hasAlias, aliasPath, absolutePath };
    }
    return lineInfo;
  }

  lineTextToLineInfo(line) {}

  getComponentName(position: vscode.Position, document): String[] {
    const doc = vscode.window.activeTextEditor.document;
    const selection = doc.getWordRangeAtPosition(position);
    const selectedText = doc.getText(selection);
    let lineText = doc.lineAt(position).text;
    const lineInfo = this.judeLineType(lineText, selectedText, document);
    // console.log("lineInfo:", lineInfo);
    const { type, path, simplePath, hasAlias, aliasPath, absolutePath } =
      lineInfo;
    let possibleFileNames = [];
    if (type === "import" || type === "tag") {
      if (hasAlias) {
        possibleFileNamesAdd(aliasPath);
      } else {
        possibleFileNamesAdd(absolutePath);
      }
      // console.log("absolutePath:", absolutePath);
      // possibleFileNamesAdd(simplePath);
    }
    function possibleFileNamesAdd(originPath) {
      possibleFileNames.push(originPath + ".vue");
      possibleFileNames.push(originPath + "/index.vue");
      possibleFileNames.push(originPath + ".js");
      possibleFileNames.push(originPath + "/index.js");
      possibleFileNames.push(originPath + ".jsx");
      possibleFileNames.push(originPath + "/index.jsx");
    }

    return possibleFileNames;
  }

  searchFilePath(fileName: String): Thenable<vscode.Uri[]> {
    return vscode.workspace.findFiles(`**/${fileName}`, "**/node_modules"); // Returns promise
  }

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Location | vscode.Location[]> {
    let filePaths = [];
    const componentNames = this.getComponentName(position, document);
    // console.log("componentNames:", componentNames);
    const searchPathActions = componentNames.map(this.searchFilePath);
    const searchPromises = Promise.all(searchPathActions); // pass array of promises

    return searchPromises.then(
      (paths) => {
        filePaths = [].concat.apply([], paths);

        if (filePaths.length) {
          let allPaths = [];
          filePaths.forEach((filePath) => {
            allPaths.push(
              new vscode.Location(
                vscode.Uri.file(`${filePath.path}`),
                new vscode.Position(0, 1)
              )
            );
          });
          return allPaths;
        } else {
          return undefined;
        }
      },
      (reason) => {
        return undefined;
      }
    );
  }
}
