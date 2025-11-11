class AppState {
    constructor() {
        this.variables = {};
        this.functions = {};
        this.currentColor = { r: 1, g: 1, b: 1, a: 1 };
        this.lineNumbers = new Map();

        this.hierarchyData = [];
        this.scrollViews = [];

        this.selectedElements = [];
        this.lastClickedIndex = null;
        this.multiSelectAnchor = null;

        this.expandedItems = new Set();
        this.treeVisible = false;
        this.propertiesVisible = false;
        this.cacheVisible = false;

        this.isDragging = false;
        this.isResizing = false;
        this.resizeMode = null;
        this.resizeStart = {};
        this.isDraggingFromToolbar = false;
        this.dragOutline = null;
        this.dragType = null;
        this.draggedTreeItem = null;
        this.currentParentTarget = null;

        this.snapMode = Constants.SNAP_MODE.NONE;
        this.gridSize = Constants.SNAP_CONFIG.DEFAULT_GRID_SIZE;

        this.fileCache = new Map();
    }

    reset() {
        this.variables = {};
        this.functions = {};
        this.currentColor = { r: 1, g: 1, b: 1, a: 1 };
        this.hierarchyData = [];
        this.scrollViews = [];
        this.lineNumbers.clear();
    }

    clearSelections() {
        this.selectedElements.forEach(s => {
            if (s.element) s.element.classList.remove('selected');
            if (s.treeElement) s.treeElement.classList.remove('selected');
        });
        this.selectedElements = [];
        document.querySelectorAll('.resize-handle').forEach(h => h.remove());
    }

    addSelection(item, element, treeElement = null) {
        if (element) element.classList.add('selected');
        if (treeElement) treeElement.classList.add('selected');
        this.selectedElements.push({ item, element, treeElement });
    }

    removeSelection(index) {
        const sel = this.selectedElements[index];
        if (sel.element) sel.element.classList.remove('selected');
        if (sel.treeElement) sel.treeElement.classList.remove('selected');
        this.selectedElements.splice(index, 1);
    }

    findSelection(item) {
        return this.selectedElements.findIndex(s => s.item === item);
    }

    isSelected(item) {
        return this.findSelection(item) !== -1;
    }

    toggleTreeVisible() {
        this.treeVisible = !this.treeVisible;
        return this.treeVisible;
    }

    togglePropertiesVisible() {
        this.propertiesVisible = !this.propertiesVisible;
        return this.propertiesVisible;
    }

    toggleCacheVisible() {
        this.cacheVisible = !this.cacheVisible;
        return this.cacheVisible;
    }

    cycleSnapMode() {
        if (this.snapMode === Constants.SNAP_MODE.NONE) {
            this.snapMode = Constants.SNAP_MODE.GRID;
        } else if (this.snapMode === Constants.SNAP_MODE.GRID) {
            this.snapMode = Constants.SNAP_MODE.ELEMENTS;
        } else {
            this.snapMode = Constants.SNAP_MODE.NONE;
        }
        return this.snapMode;
    }

    setSnapMode(mode) {
        this.snapMode = mode;
    }

    setGridSize(size) {
        this.gridSize = size;
    }
}