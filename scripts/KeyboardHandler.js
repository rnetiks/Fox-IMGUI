class KeyboardHandler {
    constructor(state, codeEditor) {
        this.state = state;
        this.codeEditor = codeEditor;
    }

    initialize() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        if (document.activeElement === this.codeEditor) return;

        if (e.key === 'g' || e.key === 'G') {
            e.preventDefault();
            this.cycleSnapMode();
        }

        if ((e.key === 'n' || e.key === 'N') && !e.altKey) {
            e.preventDefault();
            this.toggleTreeView();
        }

        if ((e.key === 'n' || e.key === 'N') && e.altKey) {
            e.preventDefault();
            this.togglePropertiesPanel();
        }

        if ((e.key === 'a' || e.key === 'A') && e.altKey) {
            e.preventDefault();
            this.toggleCachePanel();
        }

        if (e.altKey && this.state.selectedElements.length === 1) {
            e.preventDefault();
            if (window.selectionManager) {
                window.selectionManager.showAllResizeHandles();
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && this.state.selectedElements.length > 0) {
            e.preventDefault();
            this.duplicateSelected();
        }

        if (e.key === 'Delete' && this.state.selectedElements.length > 0) {
            e.preventDefault();
            this.deleteSelected();
        }

        if (this.state.selectedElements.length > 0 &&
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            this.moveSelected(e.key, e.shiftKey);
        }
    }

    handleKeyUp(e) {
        if (!e.altKey && window.selectionManager) {
            window.selectionManager.hideResizeHandles();
        }
    }

    cycleSnapMode() {
        this.state.cycleSnapMode();
        const gridModeSelect = document.getElementById('grid-mode');
        if (gridModeSelect) {
            if (this.state.snapMode === Constants.SNAP_MODE.NONE) {
                gridModeSelect.selectedIndex = 0;
            } else if (this.state.snapMode === Constants.SNAP_MODE.GRID) {
                gridModeSelect.selectedIndex = 1;
            } else {
                gridModeSelect.selectedIndex = 2;
            }
        }
        console.log('Snap mode:', this.state.snapMode);
    }

    toggleTreeView() {
        const visible = this.state.toggleTreeVisible();
        if (window.uiController) {
            window.uiController.updatePanelVisibility();
        }
        if (visible && window.treeView) {
            window.treeView.build();
        }
    }

    togglePropertiesPanel() {
        this.state.togglePropertiesVisible();
        if (window.uiController) {
            window.uiController.updatePanelVisibility();
        }
        if (this.state.propertiesVisible && window.propertiesPanel) {
            window.propertiesPanel.update();
        }
    }

    toggleCachePanel() {
        const visible = this.state.toggleCacheVisible();
        const cachePanel = document.getElementById('cache-panel');
        if (cachePanel) {
            if (visible) {
                cachePanel.classList.add('visible');
            } else {
                cachePanel.classList.remove('visible');
            }
        }
    }

    duplicateSelected() {
        const lines = this.codeEditor.value.split('\n');
        this.state.selectedElements.forEach(s => {
            const ln = this.state.lineNumbers.get(s.item.codeLine.trim());
            if (ln !== undefined) {
                lines.splice(ln + 1, 0, lines[ln]);
            }
        });
        this.codeEditor.value = lines.join('\n');
        if (window.app) {
            window.app.updatePreview();
        }
        if (this.state.treeVisible && window.treeView) {
            window.treeView.build();
        }
    }

    deleteSelected() {
        const lines = this.codeEditor.value.split('\n');
        const del = new Set();

        this.state.selectedElements.forEach(s => {
            const ln = this.state.lineNumbers.get(s.item.codeLine.trim());
            if (ln !== undefined) {
                del.add(ln);
            }
        });

        Array.from(del).sort((a, b) => b - a).forEach(i => lines.splice(i, 1));
        this.codeEditor.value = lines.join('\n');
        this.state.clearSelections();

        if (window.app) {
            window.app.updatePreview();
        }
        if (this.state.treeVisible && window.treeView) {
            window.treeView.build();
        }
    }

    moveSelected(key, shiftKey) {
        const step = shiftKey ? Constants.MOVE_STEP.FAST : Constants.MOVE_STEP.NORMAL;

        this.state.selectedElements.forEach(s => {
            if (key === 'ArrowUp') s.item.rect.y -= step;
            if (key === 'ArrowDown') s.item.rect.y += step;
            if (key === 'ArrowLeft') s.item.rect.x -= step;
            if (key === 'ArrowRight') s.item.rect.x += step;

            s.element.style.left = s.item.rect.x + 'px';
            s.element.style.top = s.item.rect.y + 'px';

            if (window.dragHandler) {
                window.dragHandler.updateCodeLine(s.item);
            }
        });

        if (window.propertiesPanel) {
            window.propertiesPanel.update();
        }
    }
}

class UIController {
    constructor(state) {
        this.state = state;
        this.sidePanels = document.getElementById('side-panels');
        this.treePanel = document.getElementById('tree-panel');
        this.propertiesPanel = document.getElementById('properties-panel');
        this.panelResizer = document.getElementById('panel-resizer');
        this.editorPanel = document.querySelector('.editor-panel');
        this.previewPanel = document.querySelector('.preview-panel');
        this.resizer = document.getElementById('resizer');
    }

    initialize() {
        this.treePanel.classList.add('hidden');
        this.propertiesPanel.classList.add('hidden');
        this.panelResizer.style.display = 'none';

        this.setupViewToggles();

        this.setupPanelResizer();

        this.setupMainResizer();
    }

    updatePanelVisibility() {
        if (!this.state.treeVisible && !this.state.propertiesVisible) {
            this.sidePanels.classList.remove('visible');
        } else {
            this.sidePanels.classList.add('visible');

            if (this.state.treeVisible && !this.state.propertiesVisible) {
                this.treePanel.classList.remove('hidden');
                this.propertiesPanel.classList.add('hidden');
                this.treePanel.style.flex = '1';
                this.panelResizer.style.display = 'none';
            } else if (!this.state.treeVisible && this.state.propertiesVisible) {
                this.treePanel.classList.add('hidden');
                this.propertiesPanel.classList.remove('hidden');
                this.propertiesPanel.style.flex = '1';
                this.panelResizer.style.display = 'none';
            } else {
                this.treePanel.classList.remove('hidden');
                this.propertiesPanel.classList.remove('hidden');
                this.treePanel.style.flex = '0 0 50%';
                this.propertiesPanel.style.flex = '0 0 50%';
                this.panelResizer.style.display = 'block';
            }
        }
    }

    setupViewToggles() {
        const codeButtons = [
            document.getElementById('view-code'),
            document.getElementById('view-code-2')
        ];
        const splitButtons = [
            document.getElementById('view-split'),
            document.getElementById('view-split-2')
        ];
        const previewButtons = [
            document.getElementById('view-preview'),
            document.getElementById('view-preview-2')
        ];

        codeButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.setViewMode('code'));
            }
        });

        splitButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.setViewMode('split'));
            }
        });

        previewButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.setViewMode('preview'));
            }
        });
    }

    setViewMode(mode) {
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));

        if (mode === 'code') {
            ['view-code', 'view-code-2'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.classList.add('active');
            });
            this.editorPanel.classList.remove('hidden');
            this.editorPanel.classList.add('full-width');
            this.previewPanel.classList.add('hidden');
            this.resizer.classList.add('hidden');
        } else if (mode === 'split') {
            ['view-split', 'view-split-2'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.classList.add('active');
            });
            this.editorPanel.classList.remove('hidden', 'full-width');
            this.previewPanel.classList.remove('hidden', 'full-width');
            this.resizer.classList.remove('hidden');
        } else if (mode === 'preview') {
            ['view-preview', 'view-preview-2'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.classList.add('active');
            });
            this.editorPanel.classList.add('hidden');
            this.previewPanel.classList.remove('hidden');
            this.previewPanel.classList.add('full-width');
            this.resizer.classList.add('hidden');
        }
    }

    setupPanelResizer() {
        let isPanelResizing = false;

        this.panelResizer.addEventListener('mousedown', () => {
            isPanelResizing = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isPanelResizing) return;
            const cont = this.sidePanels.getBoundingClientRect();
            const h = e.clientY - cont.top;
            const pct = (h / cont.height) * 100;
            if (pct >= Constants.PANEL_CONFIG.MIN_SIZE_PCT &&
                pct <= Constants.PANEL_CONFIG.MAX_SIZE_PCT) {
                this.treePanel.style.flex = `0 0 ${pct}%`;
                this.propertiesPanel.style.flex = `0 0 ${100 - pct}%`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isPanelResizing) {
                isPanelResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    setupMainResizer() {
        let isResizingMain = false;

        this.resizer.addEventListener('mousedown', () => {
            isResizingMain = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizingMain) return;
            const pct = (e.clientX / document.body.clientWidth) * 100;
            if (pct >= Constants.PANEL_CONFIG.MIN_SIZE_PCT &&
                pct <= Constants.PANEL_CONFIG.MAX_SIZE_PCT) {
                this.editorPanel.style.width = pct + '%';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizingMain) {
                isResizingMain = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }
}