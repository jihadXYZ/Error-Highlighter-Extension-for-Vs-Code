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
// Decoration cache to avoid unnecessary updates
const decorationCache = new Map();
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
        updateDecorations();
    }
    catch (error) {
        console.error('Failed to activate Error Highlighter:', error);
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
    // Info decoration (blue background)
    infoDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        border: '3px solid #007bff',
        isWholeLine: true,
        overviewRulerColor: '#007bff',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
        },
        dark: {
            backgroundColor: 'rgba(0, 123, 255, 0.15)',
        }
    });
}
function registerCommands(context) {
    // Register command to refresh highlighting
    const refreshCommand = vscode.commands.registerCommand('error-highlither.refresh', () => {
        decorationCache.clear();
        updateDecorations();
        vscode.window.showInformationMessage('Error highlighting refreshed');
    });
    context.subscriptions.push(refreshCommand);
}
function setupEventListeners(context) {
    // Listen for diagnostic changes
    const diagnosticListener = vscode.languages.onDidChangeDiagnostics(({ uris }) => {
        // Only update if diagnostics changed in visible editors
        const visibleEditors = vscode.window.visibleTextEditors;
        const shouldUpdate = uris.some(uri => visibleEditors.some(editor => editor.document.uri.toString() === uri.toString()));
        if (shouldUpdate) {
            throttledUpdateDecorations();
        }
    });
    // Listen for active editor changes
    const editorListener = vscode.window.onDidChangeActiveTextEditor(() => {
        throttledUpdateDecorations();
    });
    // Listen for document changes
    const documentListener = vscode.workspace.onDidChangeTextDocument(({ document }) => {
        // Only update if the changed document is visible
        const isVisible = vscode.window.visibleTextEditors.some(editor => editor.document === document);
        if (isVisible) {
            throttledUpdateDecorations();
        }
    });
    // Clean up inactive editor cache periodically
    const cacheCleanupInterval = setInterval(() => {
        const visibleEditorUris = new Set(vscode.window.visibleTextEditors.map(editor => editor.document.uri.toString()));
        for (const uri of decorationCache.keys()) {
            if (!visibleEditorUris.has(uri)) {
                decorationCache.delete(uri);
            }
        }
    }, 30000); // Clean up every 30 seconds
    context.subscriptions.push(diagnosticListener, editorListener, documentListener, errorDecorationType, warningDecorationType, infoDecorationType, { dispose: () => clearInterval(cacheCleanupInterval) });
}
function throttledUpdateDecorations() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(updateDecorations, 100); // Reduced from 250ms to 100ms
}
function updateDecorations() {
    try {
        const visibleEditors = vscode.window.visibleTextEditors;
        for (const editor of visibleEditors) {
            const document = editor.document;
            const uri = document.uri.toString();
            // Check if we need to update this editor
            const diagnostics = vscode.languages.getDiagnostics(document.uri);
            const cachedDecorations = decorationCache.get(uri);
            if (cachedDecorations &&
                diagnostics.length ===
                    (cachedDecorations.errors.length +
                        cachedDecorations.warnings.length +
                        cachedDecorations.infos.length)) {
                continue; // Skip if nothing changed
            }
            // Group diagnostics by severity
            const errorRanges = [];
            const warningRanges = [];
            const infoRanges = [];
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
            // Cache the new decorations
            decorationCache.set(uri, {
                errors: errorRanges,
                warnings: warningRanges,
                infos: infoRanges
            });
            // Apply decorations
            editor.setDecorations(errorDecorationType, errorRanges);
            editor.setDecorations(warningDecorationType, warningRanges);
            editor.setDecorations(infoDecorationType, infoRanges);
        }
    }
    catch (error) {
        console.error('Failed to update decorations:', error);
    }
}
// This method is called when your extension is deactivated
function deactivate() {
    try {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        decorationCache.clear();
        errorDecorationType?.dispose();
        warningDecorationType?.dispose();
        infoDecorationType?.dispose();
    }
    catch (error) {
        console.error('Failed to deactivate extension:', error);
    }
}
//# sourceMappingURL=extension.js.map