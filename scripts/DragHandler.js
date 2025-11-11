class DragHandler {
    constructor(state, codeEditor, previewCanvas) {
        this.state = state;
        this.codeEditor = codeEditor;
        this.previewCanvas = previewCanvas;
    }

    startDrag(e, selection) {
        this.state.isDragging = true;
        const startX = e.clientX;
        const startY = e.clientY;
        const offsets = selection.map(s => ({
            item: s.item,
            startX: s.item.rect.x,
            startY: s.item.rect.y
        }));

        const draggedItems = selection.map(s => s.item);
        const allBounds = this.state.snapMode === Constants.SNAP_MODE.ELEMENTS
            ? SnapManager.getAllElementBounds(this.state.hierarchyData, draggedItems)
            : [];

        const onMove = (e) => {
            if (!this.state.isDragging) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;

            const firstItem = offsets[0];
            let finalX = firstItem.startX + dx;
            let finalY = firstItem.startY + dy;

            if (this.state.snapMode === Constants.SNAP_MODE.GRID) {
                finalX = SnapManager.snapToGrid(finalX, this.state.gridSize);
                finalY = SnapManager.snapToGrid(finalY, this.state.gridSize);
                dx = finalX - firstItem.startX;
                dy = finalY - firstItem.startY;
                SnapManager.clearSnapGuides();
            } else if (this.state.snapMode === Constants.SNAP_MODE.ELEMENTS) {
                const draggedRect = {
                    x: finalX,
                    y: finalY,
                    width: firstItem.item.rect.width,
                    height: firstItem.item.rect.height
                };

                const { snapX, snapY, snapLinesX, snapLinesY } =
                    SnapManager.findSnapPosition(draggedRect, allBounds);

                if (snapX !== null) {
                    finalX = snapX;
                    dx = finalX - firstItem.startX;
                }
                if (snapY !== null) {
                    finalY = snapY;
                    dy = finalY - firstItem.startY;
                }

                if (snapX !== null || snapY !== null) {
                    SnapManager.drawSnapGuides(this.previewCanvas, snapLinesX, snapLinesY);
                } else {
                    SnapManager.clearSnapGuides();
                }
            } else {
                SnapManager.clearSnapGuides();
            }

            offsets.forEach(({ item, startX: sx, startY: sy }) => {
                item.rect.x = sx + dx;
                item.rect.y = sy + dy;
                item.element.style.left = item.rect.x + 'px';
                item.element.style.top = item.rect.y + 'px';
            });

            if (window.propertiesPanel) {
                window.propertiesPanel.update();
            }
        };

        const onUp = (e) => {
            if (this.state.isDragging) {
                offsets.forEach(({ item }) => this.updateCodeLine(item));
                SnapManager.clearSnapGuides();
            }
            this.state.isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    updateCodeLine(item) {
        const old = item.codeLine.trim();
        const lineNum = this.state.lineNumbers.get(old);
        if (lineNum === undefined) return;

        const lines = this.codeEditor.value.split('\n');
        let newLine = CodeParser.updateRectInLine(lines[lineNum], item.rect);

        if (item.type === 'DrawTexture' && item.textureName !== undefined) {
            newLine = CodeParser.updateTextInLine(newLine, item.textureName);
        } else if (item.type === 'Window') {
            newLine = CodeParser.updateWindowTitleInLine(newLine, item.text);
        } else if (item.text && Constants.TEXT_ELEMENTS.includes(item.type)) {
            newLine = CodeParser.updateTextInLine(newLine, item.text);
        }

        lines[lineNum] = newLine;
        this.codeEditor.value = lines.join('\n');
        item.codeLine = newLine.trim();
        this.state.lineNumbers.delete(old);
        this.state.lineNumbers.set(newLine.trim(), lineNum);
    }
}

class ResizeHandler {
    constructor(state, codeEditor, previewCanvas, dragHandler) {
        this.state = state;
        this.codeEditor = codeEditor;
        this.previewCanvas = previewCanvas;
        this.dragHandler = dragHandler;
    }

    startResize(e, mode, item) {
        e.stopPropagation();
        this.state.isResizing = true;
        this.state.resizeMode = mode;
        this.state.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            rect: { ...item.rect }
        };

        const allBounds = this.state.snapMode === Constants.SNAP_MODE.ELEMENTS
            ? SnapManager.getAllElementBounds(this.state.hierarchyData, [item])
            : [];

        const onMove = (e) => {
            if (!this.state.isResizing) return;
            const dx = e.clientX - this.state.resizeStart.x;
            const dy = e.clientY - this.state.resizeStart.y;
            const r = this.state.resizeStart.rect;

            let newRect = { ...item.rect };

            this.applyResizeMode(newRect, mode, r, dx, dy);

            if (this.state.snapMode === Constants.SNAP_MODE.GRID) {
                this.applyGridSnap(newRect, mode);
                SnapManager.clearSnapGuides();
            } else if (this.state.snapMode === Constants.SNAP_MODE.ELEMENTS) {
                this.applyElementSnap(newRect, mode, allBounds);
            } else {
                SnapManager.clearSnapGuides();
            }

            item.rect = newRect;
            item.element.style.left = item.rect.x + 'px';
            item.element.style.top = item.rect.y + 'px';
            item.element.style.width = Math.max(10, item.rect.width) + 'px';
            item.element.style.height = Math.max(10, item.rect.height) + 'px';

            if (window.propertiesPanel) {
                window.propertiesPanel.update();
            }
        };

        const onUp = () => {
            if (this.state.isResizing) {
                this.dragHandler.updateCodeLine(item);
                this.state.isResizing = false;
                SnapManager.clearSnapGuides();
            }
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    applyResizeMode(newRect, mode, originalRect, dx, dy) {
        if (mode.length === 2) {
            if (mode.includes('t')) {
                newRect.y = originalRect.y + dy;
                newRect.height = originalRect.height - dy;
            }
            if (mode.includes('b')) {
                newRect.height = originalRect.height + dy;
            }
            if (mode.includes('l')) {
                newRect.x = originalRect.x + dx;
                newRect.width = originalRect.width - dx;
            }
            if (mode.includes('r')) {
                newRect.width = originalRect.width + dx;
            }
        } else {
            if (mode === 'top') {
                newRect.y = originalRect.y + dy;
                newRect.height = originalRect.height - dy;
            } else if (mode === 'bottom') {
                newRect.height = originalRect.height + dy;
            } else if (mode === 'left') {
                newRect.x = originalRect.x + dx;
                newRect.width = originalRect.width - dx;
            } else if (mode === 'right') {
                newRect.width = originalRect.width + dx;
            }
        }
    }

    applyGridSnap(newRect, mode) {
        if (mode.includes('l') || mode === 'left') {
            const snappedLeft = SnapManager.snapToGrid(newRect.x, this.state.gridSize);
            newRect.width = newRect.x + newRect.width - snappedLeft;
            newRect.x = snappedLeft;
        }
        if (mode.includes('r') || mode === 'right') {
            const right = newRect.x + newRect.width;
            const snappedRight = SnapManager.snapToGrid(right, this.state.gridSize);
            newRect.width = snappedRight - newRect.x;
        }
        if (mode.includes('t') || mode === 'top') {
            const snappedTop = SnapManager.snapToGrid(newRect.y, this.state.gridSize);
            newRect.height = newRect.y + newRect.height - snappedTop;
            newRect.y = snappedTop;
        }
        if (mode.includes('b') || mode === 'bottom') {
            const bottom = newRect.y + newRect.height;
            const snappedBottom = SnapManager.snapToGrid(bottom, this.state.gridSize);
            newRect.height = snappedBottom - newRect.y;
        }
    }

    applyElementSnap(newRect, mode, allBounds) {
        const snapLinesX = [];
        const snapLinesY = [];
        let snappedX = false;
        let snappedY = false;
        const threshold = Constants.SNAP_CONFIG.THRESHOLD;

        allBounds.forEach(bound => {
            let right = newRect.x + newRect.width;
            let bottom = newRect.y + newRect.height;

            if (!snappedX && (mode.includes('l') || mode === 'left')) {
                const snapResult = this.trySnapX(newRect, bound, threshold, 'left');
                if (snapResult.snapped) {
                    newRect.width = newRect.x + newRect.width - snapResult.value;
                    newRect.x = snapResult.value;
                    snappedX = true;
                    snapLinesX.push(snapResult.line);
                }
            }

            right = newRect.x + newRect.width;

            if (!snappedX && (mode.includes('r') || mode === 'right')) {
                const snapResult = this.trySnapX({ x: right }, bound, threshold, 'right');
                if (snapResult.snapped) {
                    newRect.width = snapResult.value - newRect.x;
                    snappedX = true;
                    snapLinesX.push(snapResult.line);
                }
            }

            if (!snappedY && (mode.includes('t') || mode === 'top')) {
                const snapResult = this.trySnapY(newRect, bound, threshold, 'top');
                if (snapResult.snapped) {
                    newRect.height = newRect.y + newRect.height - snapResult.value;
                    newRect.y = snapResult.value;
                    snappedY = true;
                    snapLinesY.push(snapResult.line);
                }
            }

            bottom = newRect.y + newRect.height;

            if (!snappedY && (mode.includes('b') || mode === 'bottom')) {
                const snapResult = this.trySnapY({ y: bottom }, bound, threshold, 'bottom');
                if (snapResult.snapped) {
                    newRect.height = snapResult.value - newRect.y;
                    snappedY = true;
                    snapLinesY.push(snapResult.line);
                }
            }
        });

        if (snapLinesX.length > 0 || snapLinesY.length > 0) {
            SnapManager.drawSnapGuides(this.previewCanvas, snapLinesX, snapLinesY);
        } else {
            SnapManager.clearSnapGuides();
        }
    }

    trySnapX(rect, bound, threshold, edge) {
        const checks = [
            { value: bound.left, line: { x: bound.left, y1: Math.min(rect.y, bound.top), y2: Math.max(rect.y + (rect.height || 0), bound.bottom) } },
            { value: bound.right, line: { x: bound.right, y1: Math.min(rect.y, bound.top), y2: Math.max(rect.y + (rect.height || 0), bound.bottom) } },
            { value: bound.centerX, line: { x: bound.centerX, y1: Math.min(rect.y, bound.top), y2: Math.max(rect.y + (rect.height || 0), bound.bottom) } }
        ];

        for (const check of checks) {
            if (Math.abs(rect.x - check.value) < threshold) {
                return { snapped: true, value: check.value, line: check.line };
            }
        }

        return { snapped: false };
    }

    trySnapY(rect, bound, threshold, edge) {
        const checks = [
            { value: bound.top, line: { y: bound.top, x1: Math.min(rect.x, bound.left), x2: Math.max(rect.x + (rect.width || 0), bound.right) } },
            { value: bound.bottom, line: { y: bound.bottom, x1: Math.min(rect.x, bound.left), x2: Math.max(rect.x + (rect.width || 0), bound.right) } },
            { value: bound.centerY, line: { y: bound.centerY, x1: Math.min(rect.x, bound.left), x2: Math.max(rect.x + (rect.width || 0), bound.right) } }
        ];

        for (const check of checks) {
            if (Math.abs(rect.y - check.value) < threshold) {
                return { snapped: true, value: check.value, line: check.line };
            }
        }

        return { snapped: false };
    }
}