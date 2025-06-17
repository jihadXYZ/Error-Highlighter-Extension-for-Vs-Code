"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
// Decoration types for different severity levels
let errorDecorationType;
let warningDecorationType;
let infoDecorationType;
// Use WeakMap to prevent memory leaks - keys will be garbage collected automatically
const decorationCache = new WeakMap();
// Debounce timer
let updateTimeout;
// Track active editor for performance
let activeEditor;
/**
 * Called when the extension is activated
 */
function activate(context) {
    console.log('Error Highlighter Pro activated');
    createDecorationTypes();
    setupEventListeners(context);
    // Initial update if there's an active editor
    activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        updateDecorations();
    }
}
function createDecorationTypes() {
    errorDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: { id: 'errorHighlighter.errorBackground' },
        border: '2px solid #ff0000',
        isWholeLine: true,
        overviewRulerColor: new vscode.ThemeColor('errorForeground'),
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
        },
        dark: {
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
        }
    });
    warningDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: { id: 'errorHighlighter.warningBackground' },
        border: '2px solid #ffa500',
        isWholeLine: true,
        overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            backgroundColor: 'rgba(255, 165, 0, 0.1)',
        },
        dark: {
            backgroundColor: 'rgba(255, 165, 0, 0.2)',
        }
    });
    infoDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: { id: 'errorHighlighter.infoBackground' },
        border: '2px solid #007bff',
        isWholeLine: true,
        overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
        },
        dark: {
            backgroundColor: 'rgba(0, 123, 255, 0.15)',
        }
    });
}
function setupEventListeners(context) {
    // Optimize diagnostic changes handling
    context.subscriptions.push(vscode.languages.onDidChangeDiagnostics(({ uris }) => {
        if (!activeEditor)
            return;
        // Only update if diagnostics changed in active editor
        if (uris.some(uri => uri.toString() === activeEditor?.document.uri.toString())) {
            requestUpdate();
        }
    }));
    // Track active editor changes
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            requestUpdate();
        }
    }));
    // Update on editor changes
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            requestUpdate();
        }
    }));
    // Cleanup on deactivation
    context.subscriptions.push(errorDecorationType, warningDecorationType, infoDecorationType);
}
function requestUpdate() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(updateDecorations, 50); // Reduced to 50ms for faster response
}
function updateDecorations() {
    const editor = activeEditor;
    if (!editor)
        return;
    const document = editor.document;
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    // Check cache to avoid unnecessary updates
    const cache = decorationCache.get(document);
    if (cache && cache.version === document.version && diagnostics.length === (cache.errors.length + cache.warnings.length + cache.infos.length)) {
        return;
    }
    // Group diagnostics by severity
    const errorRanges = [];
    const warningRanges = [];
    const infoRanges = [];
    // Process diagnostics in batch
    diagnostics.forEach(diagnostic => {
        const startLine = Math.max(0, diagnostic.range.start.line - 1);
        const endLine = Math.min(document.lineCount - 1, diagnostic.range.end.line + 1);
        const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
        switch (diagnostic.severity) {
            case vscode.DiagnosticSeverity.Error:
                errorRanges.push(range);
                break;
            case vscode.DiagnosticSeverity.Warning:
                warningRanges.push(range);
                break;
            case vscode.DiagnosticSeverity.Information:
            case vscode.DiagnosticSeverity.Hint:
                infoRanges.push(range);
                break;
        }
    });
    // Update cache
    decorationCache.set(document, {
        version: document.version,
        errors: errorRanges,
        warnings: warningRanges,
        infos: infoRanges
    });
    // Apply decorations in batch
    editor.setDecorations(errorDecorationType, errorRanges);
    editor.setDecorations(warningDecorationType, warningRanges);
    editor.setDecorations(infoDecorationType, infoRanges);
}
/**
 * This method is called when your extension is deactivated
 */
function deactivate() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    // WeakMap will clean up automatically
    errorDecorationType?.dispose();
    warningDecorationType?.dispose();
    infoDecorationType?.dispose();
}
//# sourceMappingURL=extension.js.map