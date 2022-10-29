/*
 * @Author: atdow
 * @Date: 2017-08-21 14:59:59
 * @LastEditors: null
 * @LastEditTime: 2022-10-29 20:15:51
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
    // this.aliasConfigs = aliasConfigs;
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

  judeLineType(line: String, text: string, document) {
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
      const { path, simplePath, hasAlias, aliasPath, absolutePath } =
        importTypeAnalysis(pureLine);
      lineInfo.path = path;
      lineInfo.simplePath = simplePath;
      lineInfo.hasAlias = hasAlias;
      lineInfo.aliasPath = aliasPath;
      lineInfo.absolutePath = absolutePath;
    }
    function importTypeAnalysis(pureLine) {
      let path = "";
      let simplePath = "";
      let aliasPath = "";
      let hasAlias = false;
      let absolutePath = "";
      // "xxx"
      if (pureLine.match(/\"([^\"]*)\"/)) {
        const pathArr = pureLine.match(/\"([^\"]*)\"/);
        if (pathArr && pathArr.length > 0) {
          path = pathArr.find((item) => !item.match(/\"/));
        }
      }
      // 'xxx'
      if (pureLine.match(/'([^\']*)'/)) {
        const pathArr = pureLine.match(/'([^\']*)'/);
        if (pathArr && pathArr.length > 0) {
          path = pathArr.find((item) => !item.match(/'/));
        }
      }
      simplePath = path.replace(/\.\.\//, "").replace(/\.\//, ""); // 清除相对路径
      const purePath = path.replace(/^[\.]\//, ""); // 清除./
      const fileName = document.fileName;
      const workDir = pathUtil.dirname(fileName);
      const projectPath = util.getProjectPath(document);
      const rootPath = workDir.slice(projectPath.length + 1);
      // console.log("rootPath:", rootPath);
      const rootPathArr = rootPath.split("/");
      // 带../相对路径
      if (purePath.match(/\.\.\//)) {
        const appendPath = purePath.replace(/\.\.\//, "");
        const pathMeshArr = purePath.match(/\.\.\//);
        const prefixPath = rootPathArr
          .slice(0, rootPathArr.length - pathMeshArr.length)
          .join("/");
        absolutePath = `${prefixPath}/${appendPath}`;
      } else {
        // 当前目录下
        absolutePath = `${rootPath}/${purePath}`;
      }

      // alias别名替换
      that.aliasConfigs.forEach((aliasConfigsItem) => {
        if (path.startsWith(aliasConfigsItem.alias)) {
          hasAlias = true;
          simplePath = path.replace(
            new RegExp(`${aliasConfigsItem.alias}\/`),
            ""
          );
          aliasPath = path.replace(
            new RegExp(`${aliasConfigsItem.alias}`),
            aliasConfigsItem.target
          );
        }
        // console.log("@:", path);
      });
      return { path, simplePath, hasAlias, aliasPath, absolutePath };
    }
    // 标签类型
    if (pureLine.startsWith("<")) {
      lineInfo.type = "tag";
      let formatText = text;
      // my-components(<my-components></my-components>形式标签)转MyComponents(<MyComponents></MyComponents>形式标签)
      if (formatText.indexOf("-") !== -1) {
        let myText = "";
        const textCharArr = text.split("");
        for (let i = 0; i < textCharArr.length; i++) {
          if (i === 0) {
            myText += textCharArr[i].toUpperCase();
          } else if (textCharArr[i] === "-") {
            textCharArr[i + 1] = textCharArr[i + 1].toUpperCase();
          } else {
            myText += textCharArr[i];
          }
        }
        formatText = myText;
      }
      // console.log("tag-----------------:");
      // console.log("formatText:", formatText);
      const json = document.getText();
      // 查找标签引入地方
      if (json.match(/import.+'/)) {
        const importArr = json.match(/import.+'/g);
        const importLine = importArr.find(
          (item) => item.indexOf(formatText) !== -1
        );
        // console.log("importLine:", importLine);
        if (importLine) {
          const { path, simplePath, hasAlias, aliasPath, absolutePath } =
            importTypeAnalysis(importLine.trim());
          lineInfo.path = path;
          lineInfo.simplePath = simplePath;
          lineInfo.hasAlias = hasAlias;
          lineInfo.aliasPath = aliasPath;
          lineInfo.absolutePath = absolutePath;
        }
      }
    }
    return lineInfo;
  }

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
