class SnapManager {
    static snapToGrid(value, gridSize) {
        return Math.round(value / gridSize) * gridSize;
    }

    static getAllElementBounds(hierarchyData, excludeItems) {
        const bounds = [];
        const excludeSet = new Set(excludeItems);

        const collectBounds = (items) => {
            items.forEach(item => {
                if (!excludeSet.has(item)) {
                    bounds.push({
                        item: item,
                        left: item.rect.x,
                        right: item.rect.x + item.rect.width,
                        top: item.rect.y,
                        bottom: item.rect.y + item.rect.height,
                        centerX: item.rect.x + item.rect.width / 2,
                        centerY: item.rect.y + item.rect.height / 2
                    });
                }
                if (item.children && item.children.length > 0) {
                    collectBounds(item.children);
                }
            });
        };

        collectBounds(hierarchyData);
        return bounds;
    }

    static findSnapPosition(draggedRect, allBounds) {
        let snapX = null;
        let snapY = null;
        let snapLinesX = [];
        let snapLinesY = [];

        const draggedCenterX = draggedRect.x + draggedRect.width / 2;
        const draggedCenterY = draggedRect.y + draggedRect.height / 2;
        const draggedRight = draggedRect.x + draggedRect.width;
        const draggedBottom = draggedRect.y + draggedRect.height;

        const threshold = Constants.SNAP_CONFIG.THRESHOLD;

        allBounds.forEach(bound => {
            if (Math.abs(draggedRect.x - bound.left) < threshold) {
                snapX = bound.left;
                snapLinesX.push({
                    x: bound.left,
                    y1: Math.min(draggedRect.y, bound.top),
                    y2: Math.max(draggedBottom, bound.bottom)
                });
            }
            if (Math.abs(draggedRect.x - bound.right) < threshold) {
                snapX = bound.right;
                snapLinesX.push({
                    x: bound.right,
                    y1: Math.min(draggedRect.y, bound.top),
                    y2: Math.max(draggedBottom, bound.bottom)
                });
            }
            if (Math.abs(draggedRight - bound.left) < threshold) {
                snapX = bound.left - draggedRect.width;
                snapLinesX.push({
                    x: bound.left,
                    y1: Math.min(draggedRect.y, bound.top),
                    y2: Math.max(draggedBottom, bound.bottom)
                });
            }
            if (Math.abs(draggedRight - bound.right) < threshold) {
                snapX = bound.right - draggedRect.width;
                snapLinesX.push({
                    x: bound.right,
                    y1: Math.min(draggedRect.y, bound.top),
                    y2: Math.max(draggedBottom, bound.bottom)
                });
            }
            if (Math.abs(draggedCenterX - bound.centerX) < threshold) {
                snapX = bound.centerX - draggedRect.width / 2;
                snapLinesX.push({
                    x: bound.centerX,
                    y1: Math.min(draggedRect.y, bound.top),
                    y2: Math.max(draggedBottom, bound.bottom)
                });
            }

            if (Math.abs(draggedRect.y - bound.top) < threshold) {
                snapY = bound.top;
                snapLinesY.push({
                    y: bound.top,
                    x1: Math.min(draggedRect.x, bound.left),
                    x2: Math.max(draggedRight, bound.right)
                });
            }
            if (Math.abs(draggedRect.y - bound.bottom) < threshold) {
                snapY = bound.bottom;
                snapLinesY.push({
                    y: bound.bottom,
                    x1: Math.min(draggedRect.x, bound.left),
                    x2: Math.max(draggedRight, bound.right)
                });
            }
            if (Math.abs(draggedBottom - bound.top) < threshold) {
                snapY = bound.top - draggedRect.height;
                snapLinesY.push({
                    y: bound.top,
                    x1: Math.min(draggedRect.x, bound.left),
                    x2: Math.max(draggedRight, bound.right)
                });
            }
            if (Math.abs(draggedBottom - bound.bottom) < threshold) {
                snapY = bound.bottom - draggedRect.height;
                snapLinesY.push({
                    y: bound.bottom,
                    x1: Math.min(draggedRect.x, bound.left),
                    x2: Math.max(draggedRight, bound.right)
                });
            }
            if (Math.abs(draggedCenterY - bound.centerY) < threshold) {
                snapY = bound.centerY - draggedRect.height / 2;
                snapLinesY.push({
                    y: bound.centerY,
                    x1: Math.min(draggedRect.x, bound.left),
                    x2: Math.max(draggedRight, bound.right)
                });
            }
        });

        return { snapX, snapY, snapLinesX, snapLinesY };
    }

    static drawSnapGuides(previewCanvas, snapLinesX, snapLinesY) {
        this.clearSnapGuides();

        snapLinesX.forEach(line => {
            const guide = document.createElement('div');
            guide.className = 'snap-guide snap-guide-vertical';
            guide.style.left = line.x + 'px';
            guide.style.top = line.y1 + 'px';
            guide.style.height = (line.y2 - line.y1) + 'px';
            previewCanvas.appendChild(guide);
        });

        snapLinesY.forEach(line => {
            const guide = document.createElement('div');
            guide.className = 'snap-guide snap-guide-horizontal';
            guide.style.top = line.y + 'px';
            guide.style.left = line.x1 + 'px';
            guide.style.width = (line.x2 - line.x1) + 'px';
            previewCanvas.appendChild(guide);
        });
    }

    static clearSnapGuides() {
        document.querySelectorAll('.snap-guide').forEach(g => g.remove());
    }
}