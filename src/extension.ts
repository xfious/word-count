// Oliver Kovacs MIT

import * as vscode from 'vscode';

var statusBarItem: vscode.StatusBarItem;
var activateLanguageId = vscode.workspace.getConfiguration('word-count').get<Array<string>>('activateLanguageId');

var countSplitRegexpRaw = vscode.workspace.getConfiguration('word-count').get<string>('countSplitRegexp') || "\\s+";
var countSplitRegexp = new RegExp(countSplitRegexpRaw, 'g');
var countMatchRegexpRaw = vscode.workspace.getConfiguration('word-count').get<string>('countMatchRegexp');
var countMatchRegexp = (countMatchRegexpRaw == undefined || countMatchRegexpRaw === '') ? undefined : new RegExp(countMatchRegexpRaw, 'g');
var filterExcludeRegexpRaw = vscode.workspace.getConfiguration('word-count').get<string>('filterExcludeRegexp');
var filterExcludeRegexp = (filterExcludeRegexpRaw == undefined || filterExcludeRegexpRaw === '') ? undefined : new RegExp(filterExcludeRegexpRaw, "g");
var filterEmpty = vscode.workspace.getConfiguration('word-count').get<boolean>('filterEmpty');
filterEmpty = (filterEmpty == undefined) ? true : filterEmpty;

var maxCharLimit = vscode.workspace.getConfiguration('word-count').get<number>('maxCharLimit') || -1;

export function activate({ subscriptions }: vscode.ExtensionContext) {
  // creates the status bar word counter
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );

  // registers the word-count.show, hide commands which show/hide the status bar
  subscriptions.push(
    vscode.commands.registerCommand('word-count.show', () => {
      statusBarItem.show();
    })
  );

  subscriptions.push(
    vscode.commands.registerCommand('word-count.hide', () => {
      statusBarItem.hide();
    })
  );

  // counts the number of words in a passed in string
  const count = (text: string, hasMaxCharLimit = true): number => {
    // if the text is longer than the max char limit, return -1
    // no limit if maxCharLimit is set to -1
    if (hasMaxCharLimit && text.length > maxCharLimit && maxCharLimit > 0) {
      return -1;
    }

    let words = [];
    if (countMatchRegexp) {
      words = text.match(countMatchRegexp) || [];
    } else {
      words = text.split(countSplitRegexp) || [];
    }
    if (filterExcludeRegexp) {
      //@ts-ignore
      return words.filter((word: string) => !filterExcludeRegexp.test(word)).length;
    }
    if (filterEmpty) {
      return words.filter((word: string) => word).length;
    }
    return words.length;
  };

  // gets the document from the active text editor, and then returns the text in the document. If text is selected, return that text instead
  const getText = (): string | null => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    const { document, selection } = editor;
    const selectionRange =
      selection && !selection.isEmpty
        ? new vscode.Range(
          selection.start.line,
          selection.start.character,
          selection.end.line,
          selection.end.character
        )
        : null;

    return selectionRange
      ? editor.document.getText(selectionRange)
      : document.getText();
  };

  // pops up the details pane
  subscriptions.push(
    vscode.commands.registerCommand('word-count.details', () => {
      const text = getText();
      if (text === null) return null;
      vscode.window.showInformationMessage(
        `Words: ${count(text, true)} Characters: ${text.length}`
      );
    })
  );

  // invoking this gets the text from the doc, counts the words, and then updates the status bar text
  const setWordCount = (): null | void => {
    let currentEditor = vscode.window.activeTextEditor;
    if (currentEditor === undefined) {
      statusBarItem.hide();
      return null;
    }
    let currentLanguageId = currentEditor.document.languageId;
    console.log('Current language ID: ' + currentLanguageId, 'Activate language ID: ' + activateLanguageId);
    if (activateLanguageId !== undefined
      && activateLanguageId !== null
      && activateLanguageId.includes(currentLanguageId) === true) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
      return null;
    }

    const text = getText();
    if (text === null) return null;
    const words = count(text);
    statusBarItem.text = `${words} Word${words === 1 ? '' : 's'}`;
  };

  //on start up, set the word count, then show the status bar, and then show the details pane
  setWordCount();
  statusBarItem.show();
  statusBarItem.command = 'word-count.details';

  vscode.workspace.onDidChangeTextDocument(setWordCount);
  vscode.window.onDidChangeActiveTextEditor(setWordCount);
  vscode.window.onDidChangeTextEditorSelection(setWordCount);
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
