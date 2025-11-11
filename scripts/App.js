class Application {
    constructor() {
        this.codeEditor = document.getElementById('code-editor');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.treeViewElement = document.getElementById('tree-view');
        this.propertiesBodyElement = document.getElementById('properties-body');
        this.cacheListElement = document.getElementById('cache-list');

        this.state = new AppState();

        this.codeExecutor = new CodeExecutor(this.state, this.previewCanvas);
        this.selectionManager = new SelectionManager(this.state);
        this.dragHandler = new DragHandler(this.state, this.codeEditor, this.previewCanvas);
        this.resizeHandler = new ResizeHandler(this.state, this.codeEditor, this.previewCanvas, this.dragHandler);
        this.treeView = new TreeView(this.state, this.treeViewElement, this.codeEditor);
        this.propertiesPanel = new PropertiesPanel(this.state, this.propertiesBodyElement, this.dragHandler);
        this.toolbarHandler = new ToolbarHandler(this.state, this.previewCanvas, this.codeEditor);
        this.fileCache = new FileCache(this.state, this.cacheListElement);
        this.keyboardHandler = new KeyboardHandler(this.state, this.codeEditor);
        this.uiController = new UIController(this.state);

        window.app = this;
        window.selectionManager = this.selectionManager;
        window.dragHandler = this.dragHandler;
        window.resizeHandler = this.resizeHandler;
        window.treeView = this.treeView;
        window.propertiesPanel = this.propertiesPanel;
        window.uiController = this.uiController;

        this.initialize();
    }

    /**
     * Initializes the application by setting up the canvas dimensions, initializing components,
     * configuring event listeners, and preparing the initial preview. This method ensures that
     * all necessary subsystems are properly initialized and ready for operation.
     *
     * @return {void} Does not return a value.
     */
    initialize() {
        this.previewCanvas.style.width = Constants.CANVAS.WIDTH + 'px';
        this.previewCanvas.style.height = Constants.CANVAS.HEIGHT + 'px';

        this.toolbarHandler.initialize();
        this.fileCache.initialize();
        this.keyboardHandler.initialize();
        this.uiController.initialize();

        let updateTimeout;
        this.codeEditor.addEventListener('input', () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => this.updatePreview(), 300);
        });

        this.setupGridControls();

        this.setupExportButton();

        this.updatePreview();
    }

    /**
     * Updates the preview canvas by resetting its content, applying dimensions, and executing the code from the code editor.
     * Additionally, rebuilds the tree view and updates the properties panel if necessary.
     * Displays an error message if an exception occurs during execution.
     *
     * @return {void} Does not return a value.
     */
    updatePreview() {
        try {
            this.previewCanvas.innerHTML = '';
            this.previewCanvas.style.width = Constants.CANVAS.WIDTH + 'px';
            this.previewCanvas.style.height = Constants.CANVAS.HEIGHT + 'px';

            this.codeExecutor.parseAndExecute(this.codeEditor.value);

            if (this.state.treeVisible) {
                this.treeView.build();
            }
            this.propertiesPanel.update();
        } catch (error) {
            this.showError(error.message);
            console.error(error);
        }
    }

    /**
     * Displays an error message on the preview canvas.
     *
     * @param {string} msg - The error message to display.
     * @return {void} Does not return a value.
     */
    showError(msg) {
        const div = document.createElement('div');
        div.className = 'error-message';
        div.textContent = 'Error: ' + msg;
        this.previewCanvas.appendChild(div);
    }

    /**
     * Configures grid controls by attaching event listeners to relevant DOM elements.
     * Removes existing inline `onchange` handlers and replaces them with event listeners
     * to handle grid size and grid mode changes dynamically.
     *
     * @return {void} Does not return a value.
     */
    setupGridControls() {
        const gridSizeInput = document.querySelector('input[onchange="changeGridSize(this)"]');
        if (gridSizeInput) {
            gridSizeInput.removeAttribute('onchange');
            gridSizeInput.addEventListener('change', (e) => {
                this.state.setGridSize(parseInt(e.target.value));
            });
        }

        const gridModeSelect = document.getElementById('grid-mode');
        if (gridModeSelect) {
            gridModeSelect.removeAttribute('onchange');
            gridModeSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                if (mode === '1') {
                    this.state.setSnapMode(Constants.SNAP_MODE.NONE);
                } else if (mode === '2') {
                    this.state.setSnapMode(Constants.SNAP_MODE.GRID);
                } else {
                    this.state.setSnapMode(Constants.SNAP_MODE.ELEMENTS);
                }
            });
        }
    }

    /**
     * Sets up the export button functionality. When the export button is clicked,
     * the current value from the code editor is exported as a `.cs` file.
     *
     * @return {void} Does not return a value.
     */
    setupExportButton() {
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const blob = new Blob([this.codeEditor.value], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'unity_imgui_export.cs';
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Application();
    });
} else {
    new Application();
}