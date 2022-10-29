/*
 * @Author: atdow
 * @Date: 2017-08-21 14:59:59
 * @LastEditors: null
 * @LastEditTime: 2022-10-29 17:57:08
 * @Description: file description
 */
import * as vscode from "vscode";

export default class JumperFileDefinitionProvider
  implements vscode.DefinitionProvider
{
  targetFileExtensions: string[] = [];

  constructor(targetFileExtensions: string[] = []) {
    this.targetFileExtensions = targetFileExtensions;
  }

  judeLineType(line: String, text: string, document) {
    const lineInfo: any = {
      // type: "import",
      // path: "",
      // simplePath: ""
    };
    if (!line) {
      return lineInfo;
    }
    const pureLine = line.trim();
    // import 类型
    if (pureLine.startsWith("import")) {
      lineInfo.type = "import";
      const { path, simplePath } = importTypeAnalysis(pureLine);
      lineInfo.path = path;
      lineInfo.simplePath = simplePath;
    }
    function importTypeAnalysis(pureLine) {
      let path = "";
      let simplePath = "";
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
      simplePath = path.replace(/\.\.\//, "").replace(/\.\//, "");
      return { path, simplePath };
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
          const { path, simplePath } = importTypeAnalysis(importLine.trim());
          lineInfo.path = path;
          lineInfo.simplePath = simplePath;
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
    // console.log("lineText:", lineText);
    console.log("lineInfo:", lineInfo);
    let possibleFileNames = [],
      altName = "";
    if (lineInfo.type === "import") {
      const simplePath = lineInfo.simplePath;
      possibleFileNames.push(simplePath + ".vue");
      possibleFileNames.push(simplePath + "/index.vue");
    } else if (lineInfo.type === "tag") {
      const simplePath = lineInfo.simplePath;
      possibleFileNames.push(simplePath + ".vue");
      possibleFileNames.push(simplePath + "/index.vue");
    }

    // console.log('position:',position)
    // console.log('selection:',selection)
    // console.log('selectedText:',selectedText)
    // console.log('rowText:',rowText)
    // selectedText.match(/\w+/g).forEach(str => {
    //   return altName += str[0].toUpperCase() + str.substring(1);
    // })
    // console.log("this.targetFileExtensions:", this.targetFileExtensions);

    this.targetFileExtensions.forEach((ext) => {
      possibleFileNames.push(selectedText + ext);
      possibleFileNames.push(selectedText + "/index" + ext);
      possibleFileNames.push(altName + ext);
      possibleFileNames.push(altName + "/index" + ext);
    });

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
    // console.log("this.searchFilePath:", this.searchFilePath);
    // console.log("filePaths:", filePaths);
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
