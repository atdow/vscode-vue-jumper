/*
 * @Author: atdow
 * @Date: 2017-08-21 14:59:59
 * @LastEditors: null
 * @LastEditTime: 2022-11-04 00:13:10
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
      originPath: string;
    } = {
      type: "",
      path: "",
      originPath: "",
    };
    if (!line) {
      return lineInfo;
    }
    const pureLine = line.trim();
    const importObj = util.documentFindAllImport(document, that.aliasConfigs);
    const registerComponentsObj =
      util.documentFindRegisterComponentsObj(document) || {};
    // console.log("registerComponentsObj:", registerComponentsObj);
    // import 类型
    if (pureLine.startsWith("import")) {
      lineInfo.type = "import";
      this.componentNameInImportObjUpdateLineInfo(keyword, importObj, lineInfo);
    }
    // 标签类型
    if (pureLine.startsWith("<")) {
      lineInfo.type = "tag";
      let searchComponentName = util.upperCamelCaseTagName(keyword);
      // 直接从importObj中查找
      this.componentNameInImportObjUpdateLineInfo(
        searchComponentName,
        importObj,
        lineInfo
      );
      // 从components中查找(组件重命名情况) components: { RenameMyComponent: MyComponent, 's-my-component2': MyComponent2 }
      if (!lineInfo.path) {
        Object.keys(registerComponentsObj).forEach((key) => {
          if (key === searchComponentName || key === keyword) {
            searchComponentName = registerComponentsObj[key];
          }
        });
        this.componentNameInImportObjUpdateLineInfo(
          searchComponentName,
          importObj,
          lineInfo
        );
      }
      // 从mixins中找
      if (!lineInfo.path) {
        const mixins = util.documentFindMixins(document) || [];
        // console.log("mixins:", mixins);
      }
    }
    return lineInfo;
  }
  componentNameInImportObjUpdateLineInfo(componentName, importObj, lineInfo) {
    Object.keys(importObj).forEach((key) => {
      if (key === componentName) {
        lineInfo.originPath = importObj[componentName].originPath;
        lineInfo.path = importObj[componentName].path;
      }
    });
  }

  getComponentName(position: vscode.Position, document): String[] {
    const doc = vscode.window.activeTextEditor.document;
    const selection = doc.getWordRangeAtPosition(position);
    const selectedText = doc.getText(selection);
    let lineText = doc.lineAt(position).text;
    const lineInfo = this.judeLineType(lineText, selectedText, document);
    // console.log("lineInfo:", lineInfo);
    const { type, path, originPath } = lineInfo;
    let possibleFileNames = [];
    if (type === "import" || type === "tag") {
      possibleFileNamesAdd(path);
    }
    function possibleFileNamesAdd(originPath) {
      if (!path) {
        return;
      }
      if (!path.endsWith(".vue")) {
        possibleFileNames.push(path + ".vue");
        possibleFileNames.push(path + "/index.vue");
      }
      if (!path.endsWith(".js")) {
        possibleFileNames.push(path + ".js");
        possibleFileNames.push(path + "/index.js");
      }
      if (!path.endsWith(".jsx")) {
        possibleFileNames.push(path + ".jsx");
        possibleFileNames.push(path + "/index.jsx");
      }
      possibleFileNames.push(path);
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
