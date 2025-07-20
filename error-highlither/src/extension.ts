import * as vscode from 'vscode';

// Decoration types for different severity levels
let errorDecorationType: vscode.TextEditorDecorationType;
let warningDecorationType: vscode.TextEditorDecorationType;

// Use WeakMap to prevent memory leaks - keys will be garbage collected automatically
const decorationCache = new WeakMap<vscode.TextDocument, {
    version: number;
    errors: vscode.Range[];
    warnings: vscode.Range[];
}>();

// Debounce timer
let updateTimeout: NodeJS.Timeout | undefined;

// Track active editor for performance
let activeEditor: vscode.TextEditor | undefined;

// Track if the extension is disposed
let isDisposed = false;

/**
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('Error Highlighter Pro activated');
        
        createDecorationTypes();
        setupEventListeners(context);
        
        // Initial update if there's an active editor
        activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            updateDecorations().catch(console.error);
        }
    } catch (error) {
        console.error('Failed to activate Error Highlighter Pro:', error);
        throw error; // Re-throw to notify VS Code of activation failure
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
}

function setupEventListeners(context: vscode.ExtensionContext) {
    // Optimize diagnostic changes handling
    context.subscriptions.push(
        vscode.languages.onDidChangeDiagnostics(({ uris }) => {
            if (!activeEditor || isDisposed) return;
            
            // Only update if diagnostics changed in active editor
            if (uris.some(uri => uri.toString() === activeEditor?.document.uri.toString())) {
                requestUpdate();
            }
        })
    );

    // Track active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (isDisposed) return;
            activeEditor = editor;
            if (editor) {
                requestUpdate();
            }
        })
    );

    // Update on editor changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (!activeEditor || isDisposed || event.document !== activeEditor.document) return;
            requestUpdate();
        })
    );

    // Cleanup on deactivation
    context.subscriptions.push(
        errorDecorationType,
        warningDecorationType,
    );
}

function requestUpdate() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
        updateTimeout = undefined;
    }
    if (!isDisposed) {
        updateTimeout = setTimeout(() => updateDecorations().catch(console.error), 50);
    }
}

async function updateDecorations() {
    try {
        const editor = activeEditor;
        if (!editor || isDisposed) return;

        const document = editor.document;
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        
        // Check cache to avoid unnecessary updates
        const cache = decorationCache.get(document);
        if (cache && 
            cache.version === document.version && 
            diagnostics.length === (cache.errors.length + cache.warnings.length)) {
            return;
        }

        // Group diagnostics by severity
        const errorRanges: vscode.Range[] = [];
        const warningRanges: vscode.Range[] = [];

        // Process diagnostics in batch
        for (const diagnostic of diagnostics) {
            if (isDisposed) return;

            const startLine = Math.max(0, diagnostic.range.start.line - 1);
            const endLine = Math.min(document.lineCount - 1, diagnostic.range.end.line + 1);
            const range = new vscode.Range(
                startLine, 0,
                endLine, document.lineAt(endLine).text.length
            );

            switch (diagnostic.severity) {
                case vscode.DiagnosticSeverity.Error:
                    errorRanges.push(range);
                    break;
                case vscode.DiagnosticSeverity.Warning:
                    warningRanges.push(range);
                    break;
                // Info and Hint diagnostics are ignored
            }
        }

        if (isDisposed) return;

        // Update cache
        decorationCache.set(document, {
            version: document.version,
            errors: errorRanges,
            warnings: warningRanges,
        });

        // Apply decorations in batch
        await Promise.all([
            editor.setDecorations(errorDecorationType, errorRanges),
            editor.setDecorations(warningDecorationType, warningRanges),
        ]);
    } catch (error) {
        console.error('Failed to update decorations:', error);
    }
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
    try {
        isDisposed = true;
        if (updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = undefined;
        }
        // WeakMap will clean up automatically
        errorDecorationType?.dispose();
        warningDecorationType?.dispose();
    } catch (error) {
        console.error('Error during deactivation:', error);
    }
}