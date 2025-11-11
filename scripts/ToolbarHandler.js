class ToolbarHandler {
    constructor(state, previewCanvas, codeEditor) {
        this.state = state;
        this.previewCanvas = previewCanvas;
        this.codeEditor = codeEditor;
    }

    initialize() {
        document.querySelectorAll('.toolbar-btn[data-type]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                this.startToolbarDrag(e, btn);
            });
        });
    }

    startToolbarDrag(e, btn) {
        this.state.isDraggingFromToolbar = true;
        this.state.dragType = btn.dataset.type;
        btn.classList.add('dragging');

        this.state.dragOutline = document.createElement('div');
        this.state.dragOutline.className = 'drag-outline';
        this.previewCanvas.appendChild(this.state.dragOutline);

        const [w, h] = Constants.DEFAULT_SIZES[this.state.dragType] || [100, 30];

        const onMove = (e) => {
            if (!this.state.isDraggingFromToolbar) return;
            const rect = this.previewCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.state.dragOutline.style.left = x + 'px';
            this.state.dragOutline.style.top = y + 'px';
            this.state.dragOutline.style.width = w + 'px';
            this.state.dragOutline.style.height = h + 'px';
        };

        const onUp = (e) => {
            if (this.state.isDraggingFromToolbar) {
                const rect = this.previewCanvas.getBoundingClientRect();
                const x = Math.round(e.clientX - rect.left);
                const y = Math.round(e.clientY - rect.top);
                if (x >= 0 && x < Constants.CANVAS.WIDTH && y >= 0 && y < Constants.CANVAS.HEIGHT) {
                    const parentTarget = !e.shiftKey ? this.state.currentParentTarget : null;
                    this.addNewElement(this.state.dragType, x, y, w, h, parentTarget);
                }
            }
            this.state.isDraggingFromToolbar = false;
            if (this.state.dragOutline) {
                this.state.dragOutline.remove();
                this.state.dragOutline = null;
            }
            btn.classList.remove('dragging');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    addNewElement(type, x, y, w, h, parentTarget) {
        const template = Constants.CODE_TEMPLATES[type];
        if (!template) return;

        let line = template(x, y, w, h);
        const lines = this.codeEditor.value.split('\n');

        if (parentTarget && Constants.CONTAINER_TYPES.includes(parentTarget.type)) {
            let insertPos = -1;

            if (parentTarget.type === 'Window') {
                const windowLine = parentTarget.codeLine;
                const funcMatch = windowLine.match(/,\s*(\w+)\s*,/);
                if (funcMatch) {
                    const funcName = funcMatch[1];
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes(`function ${funcName}`) && lines[i].includes('{')) {
                            insertPos = i + 1;
                            break;
                        }
                    }
                }
            } else if (parentTarget.type === 'ScrollView' || parentTarget.type === 'BeginGroup') {
                const parentLineNum = this.state.lineNumbers.get(parentTarget.codeLine.trim());
                if (parentLineNum !== undefined) {
                    insertPos = parentLineNum + 1;
                }
            }

            if (insertPos !== -1) {
                const baseIndent = lines[insertPos - 1].match(/^(\s*)/)[1];
                lines.splice(insertPos, 0, baseIndent + '    ' + line);
                this.codeEditor.value = lines.join('\n');
                if (window.app) {
                    window.app.updatePreview();
                }
                return;
            }
        }

        let idx = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('//') || !lines[i].trim()) {
                idx = i + 1;
            } else {
                break;
            }
        }
        lines.splice(idx, 0, line);
        this.codeEditor.value = lines.join('\n');
        if (window.app) {
            window.app.updatePreview();
        }
    }

    findParentTargetAtPosition(x, y) {
        const rect = this.previewCanvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;

        const containers = this.getAllContainers(this.state.hierarchyData);

        for (const container of containers) {
            const r = container.rect;
            if (canvasX >= r.x && canvasX <= r.x + r.width &&
                canvasY >= r.y && canvasY <= r.y + r.height) {
                return container;
            }
        }
        return null;
    }

    getAllContainers(items) {
        let containers = [];
        for (const item of items) {
            if (Constants.CONTAINER_TYPES.includes(item.type)) {
                containers.push(item);
            }
            if (item.children && item.children.length > 0) {
                containers = containers.concat(this.getAllContainers(item.children));
            }
        }
        return containers;
    }
}

class FileCache {
    constructor(state, cacheListElement) {
        this.state = state;
        this.cacheListElement = cacheListElement;
    }

    initialize() {
        const fileUpload = document.getElementById('file-upload');
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => {
                this.handleFileUpload(e);
            });
        }
    }

    handleFileUpload(e) {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.state.fileCache.set(file.name, ev.target.result);
                this.updateList();
                if (window.app) {
                    window.app.updatePreview();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    updateList() {
        this.cacheListElement.innerHTML = '';
        this.state.fileCache.forEach((data, name) => {
            const item = document.createElement('div');
            item.className = 'cache-item';
            item.innerHTML = `
                <img src="${data}" alt="${name}">
                <span class="cache-item-name">${name}</span>
                <button class="cache-item-delete">×</button>
            `;
            item.querySelector('.cache-item-delete').addEventListener('click', () => {
                this.state.fileCache.delete(name);
                this.updateList();
                if (window.app) {
                    window.app.updatePreview();
                }
            });
            this.cacheListElement.appendChild(item);
        });
    }
}