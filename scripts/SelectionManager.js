class SelectionManager {
    constructor(state) {
        this.state = state;
    }

    selectFromPreview(item, multi) {
        if (!multi) {
            this.state.clearSelections();
        }

        const existing = this.state.findSelection(item);
        if (existing !== -1) {
            this.state.removeSelection(existing);
        } else {
            item.element.classList.add('selected');
            this.state.addSelection(item, item.element);
            this.showResizeHandles(item.element);
        }

        if (this.state.treeVisible && window.treeView) {
            window.treeView.build();
        }
        if (window.propertiesPanel) {
            window.propertiesPanel.update();
        }
    }

    selectElement(item, treeEl, multi) {
        if (!multi) {
            this.state.clearSelections();
        }

        const existing = this.state.findSelection(item);
        if (existing !== -1) {
            this.state.removeSelection(existing);
        } else {
            if (item.element) {
                item.element.classList.add('selected');
                if (this.state.selectedElements.length === 0) {
                    this.showResizeHandles(item.element);
                }
            }
            treeEl.classList.add('selected');
            this.state.addSelection(item, item.element, treeEl);
        }

        if (window.propertiesPanel) {
            window.propertiesPanel.update();
        }
    }

    selectRange(start, end, all) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);

        this.state.clearSelections();

        for (let i = min; i <= max; i++) {
            const { item, element } = all[i];
            if (item.element) item.element.classList.add('selected');
            element.classList.add('selected');
            this.state.addSelection(item, item.element, element);
        }

        if (window.propertiesPanel) {
            window.propertiesPanel.update();
        }
    }

    showResizeHandles(el) {
        document.querySelectorAll('.resize-handle').forEach(h => h.remove());
        if (this.state.selectedElements.length !== 1) return;

        const handles = ['tl', 'tr', 'bl', 'br', 'top', 'bottom', 'left', 'right'];
        handles.forEach(pos => {
            const h = document.createElement('div');
            h.className = `resize-handle ${pos.length > 2 ? 'edge' : 'corner'} ${pos}`;
            h.dataset.pos = pos;
            h.style.display = 'none';
            h.addEventListener('mousedown', (e) => {
                if (e.altKey && window.resizeHandler) {
                    window.resizeHandler.startResize(e, pos, this.state.selectedElements[0].item);
                }
            });
            el.appendChild(h);
        });
    }

    hideResizeHandles() {
        document.querySelectorAll('.resize-handle').forEach(h => {
            h.style.display = 'none';
        });
    }

    showAllResizeHandles() {
        document.querySelectorAll('.resize-handle').forEach(h => {
            h.style.display = 'block';
        });
    }
}