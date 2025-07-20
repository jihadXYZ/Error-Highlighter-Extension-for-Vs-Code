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
// State to track if highlighting is enabled
let isHighlightingEnabled = true;
// Throttle timer
let updateTimeout;
/**
 * Called when the extension is activated
 */
function activate(context) {
    try {
        console.log('Error Highlighter extension is now active!');
        // Create decoration types for different diagnostic severities
        createDecorationTypes();
        // Register commands
        registerCommands(context);
        // Set up event listeners
        setupEventListeners(context);
        // Initial decoration update
        throttledUpdateDecorations();
    }
    catch (error) {
        console.error('Failed to activate Error Highlighter:', error);
        vscode.window.showErrorMessage('Error Highlighter failed to activate. Please check the console for details.');
    }
}
function createDecorationTypes() {
    // Error decoration (red background)
    errorDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 0, 0, 0.15)',
        border: '3px solid #ff0000',
        isWholeLine: true,
        overviewRulerColor: '#ff0000',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
        },
        dark: {
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
        }
    });
    // Warning decoration (yellow background)
    warningDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 165, 0, 0.15)',
        border: '3px solid #ffa500',
        isWholeLine: true,
        overviewRulerColor: '#ffa500',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            backgroundColor: 'rgba(255, 165, 0, 0.1)',
        },
        dark: {
            backgroundColor: 'rgba(255, 165, 0, 0.2)',
        }
    });
}
function registerCommands(context) {
    // Register command to toggle error highlighting
    const toggleCommand = vscode.commands.registerCommand('error-highlither.toggle', () => {
        isHighlightingEnabled = !isHighlightingEnabled;
        if (isHighlightingEnabled) {
            vscode.window.showInformationMessage('Error highlighting enabled');
            throttledUpdateDecorations();
        }
        else {
            vscode.window.showInformationMessage('Error highlighting disabled');
            clearAllDecorations();
        }
    });
    // Register command to refresh highlighting
    const refreshCommand = vscode.commands.registerCommand('error-highlither.refresh', () => {
        throttledUpdateDecorations();
        vscode.window.showInformationMessage('Error highlighting refreshed');
    });
    context.subscriptions.push(toggleCommand, refreshCommand);
}
function setupEventListeners(context) {
    // Listen for diagnostic changes
    const diagnosticListener = vscode.languages.onDidChangeDiagnostics(() => {
        if (isHighlightingEnabled) {
            throttledUpdateDecorations();
        }
    });
    // Listen for active editor changes
    const editorListener = vscode.window.onDidChangeActiveTextEditor(() => {
        if (isHighlightingEnabled) {
            throttledUpdateDecorations();
        }
    });
    // Listen for document changes
    const documentListener = vscode.workspace.onDidChangeTextDocument(() => {
        if (isHighlightingEnabled) {
            throttledUpdateDecorations();
        }
    });
    context.subscriptions.push(diagnosticListener, editorListener, documentListener, errorDecorationType, warningDecorationType);
}
function throttledUpdateDecorations() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(updateDecorations, 250);
}
function updateDecorations() {
    try {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        const document = activeEditor.document;
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        // Group diagnostics by severity
        const errorRanges = [];
        const warningRanges = [];
        const infoRanges = [];
        diagnostics.forEach(diagnostic => {
            const startLine = Math.max(0, diagnostic.range.start.line - 1); // One line above
            const endLine = Math.min(document.lineCount - 1, diagnostic.range.end.line + 1); // One line below
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
        // Apply decorations
        activeEditor.setDecorations(errorDecorationType, errorRanges);
        activeEditor.setDecorations(warningDecorationType, warningRanges);
    }
    catch (error) {
        console.error('Failed to update decorations:', error);
    }
}
function clearAllDecorations() {
    try {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        activeEditor.setDecorations(errorDecorationType, []);
        activeEditor.setDecorations(warningDecorationType, []);
    }
    catch (error) {
        console.error('Failed to clear decorations:', error);
    }
}
// This method is called when your extension is deactivated
function deactivate() {
    try {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        clearAllDecorations();
        errorDecorationType?.dispose();
        warningDecorationType?.dispose();
    }
    catch (error) {
        console.error('Failed to deactivate extension:', error);
    }
}
//# sourceMappingURL=extension.new.js.map