class TreeView {
    constructor(state, treeViewElement, codeEditor) {
        this.state = state;
        this.treeViewElement = treeViewElement;
        this.codeEditor = codeEditor;
    }

    /**
     * Builds and renders the tree view based on the current hierarchy data.
     * If there are no elements in the hierarchy data, a placeholder message is displayed.
     *
     * @return {void} Does not return a value.
     */
    build() {
        this.treeViewElement.innerHTML = '';

        if (this.state.hierarchyData.length === 0) {
            this.treeViewElement.innerHTML = '<div style="color: #858585; padding: 8px;">No elements</div>';
            return;
        }

        const all = [];
        this.state.hierarchyData.forEach((item, i) => {
            this.treeViewElement.appendChild(this.createTreeItem(item, 0, String(i), all));
        });

        this.restoreSelections(all);
    }

    /**
     * Creates a tree item element with nested children and all associated UI components.
     *
     * @param {Object} item - The data object representing the current tree item.
     * @param {number} depth - The depth level of the current item in the tree structure.
     * @param {string} path - The unique path identifier for the current item.
     * @param {Array} all - The array that stores all tree items for reference.
     * @return {HTMLElement} The created tree item DOM element.
     */
    createTreeItem(item, depth, path, all) {
        const div = document.createElement('div');
        const content = document.createElement('div');
        content.className = 'tree-item';
        content.draggable = true;

        const idx = all.length;
        all.push({ item, element: content, path });

        this.attachDragHandlers(content, item);

        for (let i = 0; i < depth; i++) {
            const indent = document.createElement('span');
            indent.className = 'tree-indent';
            content.appendChild(indent);
        }

        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        const hasChildren = item.children && item.children.length > 0;
        toggle.textContent = hasChildren ? '▶' : '';
        if (!hasChildren) toggle.classList.add('empty');
        content.appendChild(toggle);

        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        icon.textContent = Constants.TREE_ICONS[item.type] || '○';
        content.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = item.type;
        content.appendChild(label);

        if (item.text) {
            const text = document.createElement('span');
            text.className = 'tree-text';
            text.textContent = `"${item.text}"`;
            content.appendChild(text);
        }

        content.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.shiftKey && this.state.lastClickedIndex !== null) {
                window.selectionManager.selectRange(this.state.lastClickedIndex, idx, all);
            } else {
                window.selectionManager.selectElement(item, content, e.ctrlKey || e.metaKey);
                this.state.lastClickedIndex = idx;
            }
        });

        div.appendChild(content);

        if (hasChildren) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-children';

            if (this.state.expandedItems.has(path)) {
                childrenDiv.classList.add('expanded');
                toggle.textContent = '▼';
            }

            item.children.forEach((child, i) => {
                childrenDiv.appendChild(this.createTreeItem(child, depth + 1, `${path}-${i}`, all));
            });

            div.appendChild(childrenDiv);

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                childrenDiv.classList.toggle('expanded');
                toggle.textContent = childrenDiv.classList.contains('expanded') ? '▼' : '▶';
                if (childrenDiv.classList.contains('expanded')) {
                    this.state.expandedItems.add(path);
                } else {
                    this.state.expandedItems.delete(path);
                }
            });
        }

        return div;
    }

    /**
     * Attaches drag event handlers to a specified content element for implementing drag-and-drop functionality.
     *
     * @param {HTMLElement} content - The DOM element to which the drag handlers will be attached.
     * @param {Object} item - The data or item associated with the content element being dragged.
     * @return {void} Does not return a value.
     */
    attachDragHandlers(content, item) {
        content.addEventListener('dragstart', (e) => {
            this.state.draggedTreeItem = item;
            content.classList.add('dragging');
        });

        content.addEventListener('dragend', () => {
            content.classList.remove('dragging');
            document.querySelectorAll('.tree-item').forEach(e => e.classList.remove('drop-target'));
            this.state.draggedTreeItem = null;
        });

        content.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.state.draggedTreeItem && this.state.draggedTreeItem !== item) {
                content.classList.add('drop-target');
            }
        });

        content.addEventListener('dragleave', () => {
            content.classList.remove('drop-target');
        });

        content.addEventListener('drop', (e) => {
            e.preventDefault();
            content.classList.remove('drop-target');
            if (this.state.draggedTreeItem && this.state.draggedTreeItem !== item) {
                this.reorderItems(this.state.draggedTreeItem, item);
            }
        });
    }

    /**
     * Reorders items in the code editor by moving a dragged item to the position of a target item.
     *
     * @param {Object} dragged - The dragged item containing information including its corresponding code line.
     * @param {Object} target - The target item indicating the new position, with its corresponding code line information.
     * @return {void} Does not return a value.
     */
    reorderItems(dragged, target) {
        const lines = this.codeEditor.value.split('\n');
        const dLine = this.state.lineNumbers.get(dragged.codeLine.trim());
        const tLine = this.state.lineNumbers.get(target.codeLine.trim());

        if (dLine === undefined || tLine === undefined) return;

        const dCode = lines[dLine];
        lines.splice(dLine, 1);
        const newIdx = dLine < tLine ? tLine - 1 : tLine;
        lines.splice(newIdx + 1, 0, dCode);

        this.codeEditor.value = lines.join('\n');

        if (window.app) {
            window.app.updatePreview();
        }
    }

    /**
     * Restores the selection state for elements based on the previously saved selections.
     *
     * @param {Array} all - The array of all elements where selection states will be restored.
     *                      Each element is expected to have an `item` property and an `element` property.
     * @return {void} Does not return a value.
     */
    restoreSelections(all) {
        this.state.selectedElements.forEach(s => {
            const found = all.find(a => a.item === s.item);
            if (found) {
                found.element.classList.add('selected');
                s.treeElement = found.element;
            }
        });
    }
}