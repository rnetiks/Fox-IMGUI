const WIDTH = 1920, HEIGHT = 1080;
const codeEditor = document.getElementById('code-editor');
const previewCanvas = document.getElementById('preview-canvas');
const fileCache = new Map();

let variables = {}, functions = {}, currentColor = {r: 1, g: 1, b: 1, a: 1};
let scrollViews = [], hierarchyData = [], selectedElements = [];
let expandedItems = new Set(), lineNumbers = new Map();
let isDragging = false, isResizing = false, resizeMode = null, resizeStart = {};
let isDraggingFromToolbar = false, dragOutline = null, dragType = null;
let draggedTreeItem = null, currentParentTarget = null;
let lastClickedIndex = null, multiSelectAnchor = null;
let treeVisible = false, propertiesVisible = false, cacheVisible = false;

// File upload
document.getElementById('file-upload').addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            fileCache.set(file.name, ev.target.result);
            updateCacheList();
            updatePreview();
        };
        reader.readAsDataURL(file);
    });
});

function updateCacheList() {
    const list = document.getElementById('cache-list');
    list.innerHTML = '';
    fileCache.forEach((data, name) => {
        const item = document.createElement('div');
        item.className = 'cache-item';
        item.innerHTML = `
                <img src="${data}" alt="${name}">
                <span class="cache-item-name">${name}</span>
                <button class="cache-item-delete">×</button>
            `;
        item.querySelector('.cache-item-delete').addEventListener('click', () => {
            fileCache.delete(name);
            updateCacheList();
            updatePreview();
        });
        list.appendChild(item);
    });
}

function updatePreview() {
    try {
        previewCanvas.innerHTML = '';
        previewCanvas.style.width = WIDTH + 'px';
        previewCanvas.style.height = HEIGHT + 'px';

        parseAndExecute(codeEditor.value);
        if (treeVisible) buildTreeView();
        updatePropertiesPanel();
    } catch (error) {
        showError(error.message);
        console.error(error);
    }
}

function showError(msg) {
    const div = document.createElement('div');
    div.className = 'error-message';
    div.textContent = 'Error: ' + msg;
    previewCanvas.appendChild(div);
}

let gridSize = 10;
let snapMode = 'none'; // 'none', 'grid', or 'elements'
let snapThreshold = 5; function getAllElementBounds(excludeItems) {
    const bounds = [];
    const excludeSet = new Set(excludeItems);

    function collectBounds(items) {
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
    }

    collectBounds(hierarchyData);
    return bounds;
}

function findSnapPosition(draggedRect, allBounds) {
    let snapX = null;
    let snapY = null;
    let snapLinesX = [];
    let snapLinesY = [];

    const draggedCenterX = draggedRect.x + draggedRect.width / 2;
    const draggedCenterY = draggedRect.y + draggedRect.height / 2;
    const draggedRight = draggedRect.x + draggedRect.width;
    const draggedBottom = draggedRect.y + draggedRect.height;

    allBounds.forEach(bound => {
        if (Math.abs(draggedRect.x - bound.left) < snapThreshold) {
            snapX = bound.left;
            snapLinesX.push({
                x: bound.left, y1: Math.min(draggedRect.y, bound.top), y2: Math.max(draggedBottom, bound.bottom)
            });
        }
        if (Math.abs(draggedRect.x - bound.right) < snapThreshold) {
            snapX = bound.right;
            snapLinesX.push({
                x: bound.right, y1: Math.min(draggedRect.y, bound.top), y2: Math.max(draggedBottom, bound.bottom)
            });
        }
        if (Math.abs(draggedRight - bound.left) < snapThreshold) {
            snapX = bound.left - draggedRect.width;
            snapLinesX.push({
                x: bound.left, y1: Math.min(draggedRect.y, bound.top), y2: Math.max(draggedBottom, bound.bottom)
            });
        }
        if (Math.abs(draggedRight - bound.right) < snapThreshold) {
            snapX = bound.right - draggedRect.width;
            snapLinesX.push({
                x: bound.right, y1: Math.min(draggedRect.y, bound.top), y2: Math.max(draggedBottom, bound.bottom)
            });
        }
        if (Math.abs(draggedCenterX - bound.centerX) < snapThreshold) {
            snapX = bound.centerX - draggedRect.width / 2;
            snapLinesX.push({
                x: bound.centerX, y1: Math.min(draggedRect.y, bound.top), y2: Math.max(draggedBottom, bound.bottom)
            });
        }

        if (Math.abs(draggedRect.y - bound.top) < snapThreshold) {
            snapY = bound.top;
            snapLinesY.push({
                y: bound.top, x1: Math.min(draggedRect.x, bound.left), x2: Math.max(draggedRight, bound.right)
            });
        }
        if (Math.abs(draggedRect.y - bound.bottom) < snapThreshold) {
            snapY = bound.bottom;
            snapLinesY.push({
                y: bound.bottom, x1: Math.min(draggedRect.x, bound.left), x2: Math.max(draggedRight, bound.right)
            });
        }
        if (Math.abs(draggedBottom - bound.top) < snapThreshold) {
            snapY = bound.top - draggedRect.height;
            snapLinesY.push({
                y: bound.top, x1: Math.min(draggedRect.x, bound.left), x2: Math.max(draggedRight, bound.right)
            });
        }
        if (Math.abs(draggedBottom - bound.bottom) < snapThreshold) {
            snapY = bound.bottom - draggedRect.height;
            snapLinesY.push({
                y: bound.bottom, x1: Math.min(draggedRect.x, bound.left), x2: Math.max(draggedRight, bound.right)
            });
        }
        if (Math.abs(draggedCenterY - bound.centerY) < snapThreshold) {
            snapY = bound.centerY - draggedRect.height / 2;
            snapLinesY.push({
                y: bound.centerY, x1: Math.min(draggedRect.x, bound.left), x2: Math.max(draggedRight, bound.right)
            });
        }
    });

    return {snapX, snapY, snapLinesX, snapLinesY};
}

function drawSnapGuides(snapLinesX, snapLinesY) {
    document.querySelectorAll('.snap-guide').forEach(g => g.remove());

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

function clearSnapGuides() {
    document.querySelectorAll('.snap-guide').forEach(g => g.remove());
}


function parseAndExecute(code) {
    variables = {};
    functions = {};
    currentColor = {r: 1, g: 1, b: 1, a: 1};
    scrollViews = [];
    hierarchyData = [];
    lineNumbers.clear();

    const lines = code.split('\n');
    lines.forEach((line, i) => {
        const trim = line.trim();
        if (trim && !trim.startsWith('//') && !trim.startsWith('function')) {
            lineNumbers.set(trim, i);
        }
    });

    const funcRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let match;
    while ((match = funcRegex.exec(code)) !== null) {
        const name = match[1];
        const start = match.index + match[0].length;
        let braces = 1, end = start;
        for (let i = start; i < code.length; i++) {
            if (code[i] === '{') braces++;
            if (code[i] === '}' && --braces === 0) {
                end = i;
                break;
            }
        }
        functions[name] = code.substring(start, end);
    }

    let main = code.replace(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
    executeCode(main, previewCanvas, 0, 0, null);
}

function executeCode(code, container, offX, offY, parent) {
    const lines = code.split('\n');
    let i = 0, currentScrollView = null, currentGroup = null;

    while (i < lines.length) {
        let line = lines[i++].trim();
        if (!line || line.startsWith('//')) continue;

        if (line.startsWith('var ')) {
            const m = line.match(/var\s+(\w+)\s*=\s*({[\s\S]*?});/);
            if (m) {
                try {
                    variables[m[1]] = eval('(' + m[2] + ')');
                } catch (e) {
                }
            }
            continue;
        }

        if (line.includes('GUI.color')) {
            const m = line.match(/new\s+Color\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/);
            if (m) currentColor = {r: +m[1], g: +m[2], b: +m[3], a: +m[4]};
            continue;
        }

        if (line.includes('GUI.BeginScrollView')) {
            const rects = line.match(/new\s+Rect\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/g);
            if (rects && rects.length >= 2) {
                const vr = parseRect(rects[0]), cr = parseRect(rects[1]);
                const sv = createElement('ScrollView', line, container, offX, offY, parent, vr);
                if (sv) {
                    currentScrollView = sv.hierarchyItem;
                    scrollViews.push({
                        element: sv.element.querySelector('.gui-scroll-content'), hierarchyItem: sv.hierarchyItem
                    });
                }
            }
            continue;
        }

        if (line.includes('GUI.EndScrollView')) {
            if (scrollViews.length > 0) scrollViews.pop();
            currentScrollView = null;
            continue;
        }

        if (line.includes('GUI.BeginGroup')) {
            const rect = parseRect(line);
            if (rect) {
                const grp = createElement('BeginGroup', line, container, offX, offY, parent, rect);
                currentGroup = grp.hierarchyItem;
            }
            continue;
        }

        if (line.includes('GUI.EndGroup')) {
            currentGroup = null;
            continue;
        }

        const currCont = scrollViews.length > 0 ? scrollViews[scrollViews.length - 1].element : currentGroup ? currentGroup.element.querySelector('.gui-group-content') : container;
        const currOff = (scrollViews.length > 0 || currentGroup) ? {x: 0, y: 0} : {x: offX, y: offY};
        const currParent = currentScrollView || currentGroup || parent;

        const types = ['Button', 'Label', 'TextField', 'Toggle', 'HorizontalSlider', 'VerticalSlider', 'DrawTexture', 'Box', 'TextArea', 'PasswordField', 'RepeatButton', 'HorizontalScrollbar', 'VerticalScrollbar', 'SelectionGrid', 'DrawTextureWithTexCoords'];

        for (const type of types) {
            if (line.includes(`GUI.${type}`)) {
                const rect = parseRect(line);
                if (rect) createElement(type, line, currCont, currOff.x, currOff.y, currParent, rect);
                break;
            }
        }

        if (line.includes('GUI.Window')) createWindow(line);
    }
}

function createElement(type, line, container, offX, offY, parent, rect) {
    if (!rect) rect = parseRect(line);
    if (!rect) return null;

    const el = ['TextField', 'TextArea', 'PasswordField'].includes(type) ? document.createElement(type === 'TextArea' ? 'textarea' : 'input') : document.createElement('div');

    el.className = `gui-element gui-${type.toLowerCase()}`;
    Object.assign(el.style, {
        left: (rect.x + offX) + 'px', top: (rect.y + offY) + 'px', width: rect.width + 'px', height: rect.height + 'px'
    });

    let text = '', value = 0.5, textureName = '', checked = false;

    if (['Label', 'Button', 'TextField', 'TextArea', 'PasswordField', 'Toggle', 'Box', 'RepeatButton'].includes(type)) {
        text = parseString(line);
        if (type === 'TextField' || type === 'PasswordField') {
            el.type = type === 'PasswordField' ? 'password' : 'text';
            el.value = text;
        } else if (type === 'TextArea') {
            el.value = text;
        } else if (type === 'Toggle') {
            checked = line.includes('true');
            const box = document.createElement('div');
            box.className = 'gui-toggle-box';
            if (checked) box.textContent = '✓';
            const lbl = document.createElement('span');
            lbl.textContent = text;
            lbl.style.color = '#fff';
            el.appendChild(box);
            el.appendChild(lbl);
        } else {
            el.textContent = text;
        }
    } else if (['HorizontalSlider', 'VerticalSlider', 'HorizontalScrollbar', 'VerticalScrollbar'].includes(type)) {
        const m = line.match(/\)\s*,\s*([0-9.]+)/);
        value = m ? +m[1] : 0.5;
        const thumb = document.createElement('div');
        thumb.className = type.includes('Scrollbar') ? 'scrollbar-thumb' : 'gui-slider-thumb';
        if (type.startsWith('Horizontal')) {
            thumb.style.width = '10px';
            thumb.style.height = '100%';
            thumb.style.left = (value * (rect.width - 10)) + 'px';
        } else {
            thumb.style.width = '100%';
            thumb.style.height = '10px';
            thumb.style.top = ((1 - value) * (rect.height - 10)) + 'px';
        }
        el.appendChild(thumb);
    } else if (type === 'DrawTexture' || type === 'DrawTextureWithTexCoords') {
        textureName = parseString(line);
        const img = fileCache.get(textureName);
        if (img) {
            el.style.backgroundImage = `url(${img})`;
        } else {
            el.textContent = textureName || 'Texture';
            el.style.background = '#ccc';
        }
    } else if (type === 'BeginGroup') {
        el.innerHTML = '<div class="gui-group-content"></div>';
    } else if (type === 'ScrollView') {
        const content = document.createElement('div');
        content.className = 'gui-scroll-content';
        el.appendChild(content);
        scrollViews.push({element: content});
    } else if (type === 'SelectionGrid') {
        const m = line.match(/\)\s*,\s*(\d+)\s*,\s*new\s+string\[\]\s*\{([^}]+)\}\s*,\s*(\d+)/);
        if (m) {
            const selected = +m[1];
            const items = m[2].split(',').map(s => s.trim().replace(/"/g, ''));
            const cols = +m[3];
            el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            items.forEach((item, idx) => {
                const cell = document.createElement('div');
                cell.className = 'gui-selectiongrid-item';
                if (idx === selected) cell.classList.add('selected');
                cell.textContent = item;
                el.appendChild(cell);
            });
        }
    }

    container.appendChild(el);

    const hierarchyItem = {
        type,
        text: text || textureName || type,
        children: [],
        element: el,
        codeLine: line,
        rect,
        value,
        textureName,
        checked,
        parent
    };

    el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFromPreview(hierarchyItem, e.ctrlKey || e.metaKey);
    });

    el.addEventListener('mousedown', (e) => {
        if (e.altKey) {
            return;
        }
        if (selectedElements.some(s => s.item === hierarchyItem)) {
            e.stopPropagation();
            startDrag(e, selectedElements);
        }
    });

    if (parent) parent.children.push(hierarchyItem); else hierarchyData.push(hierarchyItem);

    return {element: el, hierarchyItem};
}

function createWindow(line) {
    const rect = parseRect(line);
    if (!rect) return;

    let title = 'Window';
    const tm = line.match(/,\s*"([^"]+)"/);
    if (tm) title = tm[1];

    const after = line.substring(line.indexOf(')') + 1);
    const fm = after.match(/,\s*(\w+)\s*,/);
    const funcName = fm ? fm[1] : null;

    const div = document.createElement('div');
    div.className = 'gui-element gui-window';
    Object.assign(div.style, {
        left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px'
    });

    const titleBar = document.createElement('div');
    titleBar.className = 'gui-window-title';
    titleBar.textContent = title;

    const content = document.createElement('div');
    content.className = 'gui-window-content';
    content.style.width = '100%';
    content.style.height = (rect.height - 30) + 'px';

    div.appendChild(titleBar);
    div.appendChild(content);
    previewCanvas.appendChild(div);

    const hierarchyItem = {
        type: 'Window', text: title, children: [], element: div, codeLine: line, rect, parent: null
    };
    hierarchyData.push(hierarchyItem);

    div.addEventListener('click', (e) => {
        if (e.target === titleBar) {
            e.stopPropagation();
            selectFromPreview(hierarchyItem, e.ctrlKey || e.metaKey);
        }
    });

    if (funcName && functions[funcName]) {
        executeCode(functions[funcName], content, 0, 0, hierarchyItem);
    }
}

function parseRect(str) {
    const m = str.match(/new\s+Rect\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/);
    return m ? {x: +m[1], y: +m[2], width: +m[3], height: +m[4]} : null;
}

function parseString(str) {
    const m = str.match(/"([^"]*)"/);
    return m ? m[1] : '';
}

function selectFromPreview(item, multi) {
    if (!multi) clearAllSelections();

    const existing = selectedElements.findIndex(s => s.item === item);
    if (existing !== -1) {
        selectedElements[existing].element?.classList.remove('selected');
        selectedElements[existing].treeElement?.classList.remove('selected');
        selectedElements.splice(existing, 1);
    } else {
        item.element.classList.add('selected');
        selectedElements.push({item, element: item.element});
        showResizeHandles(item.element);
    }

    if (treeVisible) buildTreeView();
    updatePropertiesPanel();
}

function showResizeHandles(el) {
    document.querySelectorAll('.resize-handle').forEach(h => h.remove());
    if (selectedElements.length !== 1) return;

    const handles = ['tl', 'tr', 'bl', 'br', 'top', 'bottom', 'left', 'right'];
    handles.forEach(pos => {
        const h = document.createElement('div');
        h.className = `resize-handle ${pos.length > 2 ? 'edge' : 'corner'} ${pos}`;
        h.dataset.pos = pos;
        h.style.display = 'none'; h.addEventListener('mousedown', (e) => {
            if (e.altKey) startResize(e, pos, selectedElements[0].item);
        });
        el.appendChild(h);
    });
}

document.addEventListener('keydown', (e) => {
    if (document.activeElement === codeEditor) return;

    if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        if (snapMode === 'none') {
            document.getElementById("grid-mode").selectedIndex = 1
            snapMode = 'grid';
            console.log('Snap mode: Grid');
        } else if (snapMode === 'grid') {
            document.getElementById("grid-mode").selectedIndex = 2
            snapMode = 'elements';
            console.log('Snap mode: Elements');
        } else {
            document.getElementById("grid-mode").selectedIndex = 0
            snapMode = 'none';
            console.log('Snap mode: Off');
        }
    }
});
document.addEventListener('keydown', (e) => {
    if (e.altKey && selectedElements.length === 1) {
        e.preventDefault();
        document.querySelectorAll('.resize-handle').forEach(h => {
            h.style.display = 'block';
        });
    }
});

document.addEventListener('keyup', (e) => {
    if (!e.altKey) {
        document.querySelectorAll('.resize-handle').forEach(h => {
            h.style.display = 'none';
        });
    }
});

function startResize(e, mode, item) {
    e.stopPropagation();
    isResizing = true;
    resizeMode = mode;
    resizeStart = {
        x: e.clientX, y: e.clientY, rect: {...item.rect}
    };

    const allBounds = snapMode === 'elements' ? getAllElementBounds([item]) : [];

    const onMove = (e) => {
        if (!isResizing) return;
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        const r = resizeStart.rect;

        let newRect = {...item.rect};

        if (mode.length === 2) {
            if (mode.includes('t')) {
                newRect.y = r.y + dy;
                newRect.height = r.height - dy;
            }
            if (mode.includes('b')) {
                newRect.height = r.height + dy;
            }
            if (mode.includes('l')) {
                newRect.x = r.x + dx;
                newRect.width = r.width - dx;
            }
            if (mode.includes('r')) {
                newRect.width = r.width + dx;
            }
        }
        else {
            if (mode === 'top') {
                newRect.y = r.y + dy;
                newRect.height = r.height - dy;
            } else if (mode === 'bottom') {
                newRect.height = r.height + dy;
            } else if (mode === 'left') {
                newRect.x = r.x + dx;
                newRect.width = r.width - dx;
            } else if (mode === 'right') {
                newRect.width = r.width + dx;
            }
        }

        let snapLinesX = [];
        let snapLinesY = [];
        let snappedX = false;
        let snappedY = false;

        if (snapMode === 'grid') {
            if (mode.includes('l') || mode === 'left') {
                const snappedLeft = snapToGridValue(newRect.x, gridSize);
                newRect.width = newRect.x + newRect.width - snappedLeft;
                newRect.x = snappedLeft;
            }
            if (mode.includes('r') || mode === 'right') {
                const right = newRect.x + newRect.width;
                const snappedRight = snapToGridValue(right, gridSize);
                newRect.width = snappedRight - newRect.x;
            }
            if (mode.includes('t') || mode === 'top') {
                const snappedTop = snapToGridValue(newRect.y, gridSize);
                newRect.height = newRect.y + newRect.height - snappedTop;
                newRect.y = snappedTop;
            }
            if (mode.includes('b') || mode === 'bottom') {
                const bottom = newRect.y + newRect.height;
                const snappedBottom = snapToGridValue(bottom, gridSize);
                newRect.height = snappedBottom - newRect.y;
            }
            clearSnapGuides();
        } else if (snapMode === 'elements') {
            allBounds.forEach(bound => {
                let right = newRect.x + newRect.width;
                let bottom = newRect.y + newRect.height;

                if (!snappedX && (mode.includes('l') || mode === 'left')) {
                    if (Math.abs(newRect.x - bound.left) < snapThreshold) {
                        newRect.width = newRect.x + newRect.width - bound.left;
                        newRect.x = bound.left;
                        snappedX = true;
                        snapLinesX.push({
                            x: bound.left,
                            y1: Math.min(newRect.y, bound.top),
                            y2: Math.max(newRect.y + newRect.height, bound.bottom)
                        });
                    } else if (Math.abs(newRect.x - bound.right) < snapThreshold) {
                        newRect.width = newRect.x + newRect.width - bound.right;
                        newRect.x = bound.right;
                        snappedX = true;
                        snapLinesX.push({
                            x: bound.right,
                            y1: Math.min(newRect.y, bound.top),
                            y2: Math.max(newRect.y + newRect.height, bound.bottom)
                        });
                    } else if (Math.abs(newRect.x - bound.centerX) < snapThreshold) {
                        newRect.width = newRect.x + newRect.width - bound.centerX;
                        newRect.x = bound.centerX;
                        snappedX = true;
                        snapLinesX.push({
                            x: bound.centerX,
                            y1: Math.min(newRect.y, bound.top),
                            y2: Math.max(newRect.y + newRect.height, bound.bottom)
                        });
                    }
                }

                right = newRect.x + newRect.width;

                if (!snappedX && (mode.includes('r') || mode === 'right')) {
                    if (Math.abs(right - bound.left) < snapThreshold) {
                        newRect.width = bound.left - newRect.x;
                        snappedX = true;
                        snapLinesX.push({
                            x: bound.left,
                            y1: Math.min(newRect.y, bound.top),
                            y2: Math.max(newRect.y + newRect.height, bound.bottom)
                        });
                    } else if (Math.abs(right - bound.right) < snapThreshold) {
                        newRect.width = bound.right - newRect.x;
                        snappedX = true;
                        snapLinesX.push({
                            x: bound.right,
                            y1: Math.min(newRect.y, bound.top),
                            y2: Math.max(newRect.y + newRect.height, bound.bottom)
                        });
                    } else if (Math.abs(right - bound.centerX) < snapThreshold) {
                        newRect.width = bound.centerX - newRect.x;
                        snappedX = true;
                        snapLinesX.push({
                            x: bound.centerX,
                            y1: Math.min(newRect.y, bound.top),
                            y2: Math.max(newRect.y + newRect.height, bound.bottom)
                        });
                    }
                }

                if (!snappedY && (mode.includes('t') || mode === 'top')) {
                    if (Math.abs(newRect.y - bound.top) < snapThreshold) {
                        newRect.height = newRect.y + newRect.height - bound.top;
                        newRect.y = bound.top;
                        snappedY = true;
                        snapLinesY.push({
                            y: bound.top,
                            x1: Math.min(newRect.x, bound.left),
                            x2: Math.max(newRect.x + newRect.width, bound.right)
                        });
                    } else if (Math.abs(newRect.y - bound.bottom) < snapThreshold) {
                        newRect.height = newRect.y + newRect.height - bound.bottom;
                        newRect.y = bound.bottom;
                        snappedY = true;
                        snapLinesY.push({
                            y: bound.bottom,
                            x1: Math.min(newRect.x, bound.left),
                            x2: Math.max(newRect.x + newRect.width, bound.right)
                        });
                    } else if (Math.abs(newRect.y - bound.centerY) < snapThreshold) {
                        newRect.height = newRect.y + newRect.height - bound.centerY;
                        newRect.y = bound.centerY;
                        snappedY = true;
                        snapLinesY.push({
                            y: bound.centerY,
                            x1: Math.min(newRect.x, bound.left),
                            x2: Math.max(newRect.x + newRect.width, bound.right)
                        });
                    }
                }

                bottom = newRect.y + newRect.height;

                if (!snappedY && (mode.includes('b') || mode === 'bottom')) {
                    if (Math.abs(bottom - bound.top) < snapThreshold) {
                        newRect.height = bound.top - newRect.y;
                        snappedY = true;
                        snapLinesY.push({
                            y: bound.top,
                            x1: Math.min(newRect.x, bound.left),
                            x2: Math.max(newRect.x + newRect.width, bound.right)
                        });
                    } else if (Math.abs(bottom - bound.bottom) < snapThreshold) {
                        newRect.height = bound.bottom - newRect.y;
                        snappedY = true;
                        snapLinesY.push({
                            y: bound.bottom,
                            x1: Math.min(newRect.x, bound.left),
                            x2: Math.max(newRect.x + newRect.width, bound.right)
                        });
                    } else if (Math.abs(bottom - bound.centerY) < snapThreshold) {
                        newRect.height = bound.centerY - newRect.y;
                        snappedY = true;
                        snapLinesY.push({
                            y: bound.centerY,
                            x1: Math.min(newRect.x, bound.left),
                            x2: Math.max(newRect.x + newRect.width, bound.right)
                        });
                    }
                }
            });

            if (snapLinesX.length > 0 || snapLinesY.length > 0) {
                drawSnapGuides(snapLinesX, snapLinesY);
            } else {
                clearSnapGuides();
            }
        } else {
            clearSnapGuides();
        }

        item.rect = newRect;
        item.element.style.left = item.rect.x + 'px';
        item.element.style.top = item.rect.y + 'px';
        item.element.style.width = Math.max(10, item.rect.width) + 'px';
        item.element.style.height = Math.max(10, item.rect.height) + 'px';
        updatePropertiesPanel();
    };

    const onUp = () => {
        if (isResizing) {
            updateCodeLine(item);
            isResizing = false;
            clearSnapGuides();
        }
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

function snapToGridValue(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
}

function changeGridSize(caller) {
    gridSize = caller.value;
}

function changeGridMode(caller) {
    let gridMode = caller.value;
    if (gridMode == "1") {
        snapMode = 'none';
    } else if (gridMode == "2") {
        snapMode = 'grid';
    } else {
        snapMode = 'elements';
    }
}

function startDrag(e, selection) {
    isDragging = true;
    const startX = e.clientX, startY = e.clientY;
    const offsets = selection.map(s => ({
        item: s.item, startX: s.item.rect.x, startY: s.item.rect.y
    }));

    const draggedItems = selection.map(s => s.item);
    const allBounds = snapMode === 'elements' ? getAllElementBounds(draggedItems) : [];

    const onMove = (e) => {
        if (!isDragging) return;
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;

        const firstItem = offsets[0];
        let finalX = firstItem.startX + dx;
        let finalY = firstItem.startY + dy;

        if (snapMode === 'grid') {
            finalX = snapToGridValue(finalX, gridSize);
            finalY = snapToGridValue(finalY, gridSize);
            dx = finalX - firstItem.startX;
            dy = finalY - firstItem.startY;
            clearSnapGuides();
        } else if (snapMode === 'elements') {
            const draggedRect = {
                x: finalX, y: finalY, width: firstItem.item.rect.width, height: firstItem.item.rect.height
            };

            const {snapX, snapY, snapLinesX, snapLinesY} = findSnapPosition(draggedRect, allBounds);

            if (snapX !== null) {
                finalX = snapX;
                dx = finalX - firstItem.startX;
            }
            if (snapY !== null) {
                finalY = snapY;
                dy = finalY - firstItem.startY;
            }

            if (snapX !== null || snapY !== null) {
                drawSnapGuides(snapLinesX, snapLinesY);
            } else {
                clearSnapGuides();
            }
        } else {
            clearSnapGuides();
        }

        offsets.forEach(({item, startX: sx, startY: sy}) => {
            item.rect.x = sx + dx;
            item.rect.y = sy + dy;
            item.element.style.left = item.rect.x + 'px';
            item.element.style.top = item.rect.y + 'px';
        });
        updatePropertiesPanel();
    };

    const onUp = (e) => {
        if (isDragging) {
            offsets.forEach(({item}) => updateCodeLine(item));
            clearSnapGuides();
        }
        isDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

function findParentTarget(x, y, draggedItem) {
    const rect = previewCanvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    const containers = getAllContainers(hierarchyData);

    for (const container of containers) {
        if (container === draggedItem || container === draggedItem?.parent) continue;
        const r = container.rect;
        if (canvasX >= r.x && canvasX <= r.x + r.width && canvasY >= r.y && canvasY <= r.y + r.height) {
            return container;
        }
    }
    return null;
}

function findParentTargetAtPosition(x, y) {
    const rect = previewCanvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    const containers = getAllContainers(hierarchyData);

    for (const container of containers) {
        const r = container.rect;
        if (canvasX >= r.x && canvasX <= r.x + r.width && canvasY >= r.y && canvasY <= r.y + r.height) {
            return container;
        }
    }
    return null;
}

function getAllContainers(items) {
    let containers = [];
    for (const item of items) {
        if (['Window', 'Box', 'BeginGroup', 'ScrollView'].includes(item.type)) {
            containers.push(item);
        }
        if (item.children && item.children.length > 0) {
            containers = containers.concat(getAllContainers(item.children));
        }
    }
    return containers;
}

function updateCodeLine(item) {
    const old = item.codeLine.trim();
    const lineNum = lineNumbers.get(old);
    if (lineNum === undefined) return;

    const lines = codeEditor.value.split('\n');
    let newLine = lines[lineNum].replace(/new\s+Rect\s*\(\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*\)/, `new Rect(${Math.round(item.rect.x)}, ${Math.round(item.rect.y)}, ${Math.round(item.rect.width)}, ${Math.round(item.rect.height)})`);

    if (item.type === 'DrawTexture' && item.textureName !== undefined) {
        newLine = newLine.replace(/"[^"]*"/, `"${item.textureName}"`);
    } else if (item.type === 'Window') {
        newLine = newLine.replace(/,\s*"[^"]*"/, `, "${item.text}"`);
    } else if (item.text && ['Label', 'Button', 'TextField', 'Toggle', 'TextArea', 'PasswordField', 'Box'].includes(item.type)) {
        newLine = newLine.replace(/"[^"]*"/, `"${item.text}"`);
    }

    lines[lineNum] = newLine;
    codeEditor.value = lines.join('\n');
    item.codeLine = newLine.trim();
    lineNumbers.delete(old);
    lineNumbers.set(newLine.trim(), lineNum);
}

function clearAllSelections() {
    selectedElements.forEach(s => {
        if (s.element) s.element.classList.remove('selected');
        if (s.treeElement) s.treeElement.classList.remove('selected');
    });
    selectedElements = [];
    document.querySelectorAll('.resize-handle').forEach(h => h.remove());
}

// Toolbar drag
document.querySelectorAll('.toolbar-btn[data-type]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        isDraggingFromToolbar = true;
        dragType = btn.dataset.type;
        btn.classList.add('dragging');

        dragOutline = document.createElement('div');
        dragOutline.className = 'drag-outline';
        previewCanvas.appendChild(dragOutline);

        const sizes = {
            Label: [100, 20],
            Button: [100, 30],
            TextField: [150, 25],
            Toggle: [100, 20],
            HorizontalSlider: [150, 20],
            VerticalSlider: [20, 150],
            DrawTexture: [100, 100],
            Box: [150, 150],
            TextArea: [200, 100],
            PasswordField: [150, 25],
            HorizontalScrollbar: [150, 20],
            VerticalScrollbar: [20, 150],
            SelectionGrid: [150, 150]
        };
        const [w, h] = sizes[dragType] || [100, 30];

        const onMove = (e) => {
            if (!isDraggingFromToolbar) return;
            const rect = previewCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            dragOutline.style.left = x + 'px';
            dragOutline.style.top = y + 'px';
            dragOutline.style.width = w + 'px';
            dragOutline.style.height = h + 'px';
        };

        const onUp = (e) => {
            if (isDraggingFromToolbar) {
                const rect = previewCanvas.getBoundingClientRect();
                const x = Math.round(e.clientX - rect.left);
                const y = Math.round(e.clientY - rect.top);
                if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
                    const parentTarget = !e.shiftKey ? currentParentTarget : null;
                    addNewElement(dragType, x, y, w, h, parentTarget);
                }
            }
            isDraggingFromToolbar = false;
            if (dragOutline) {
                dragOutline.remove();
                dragOutline = null;
            }
            btn.classList.remove('dragging');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
});

function addNewElement(type, x, y, w, h, parentTarget) {
    const templates = {
        Label: `GUI.Label(new Rect(${x}, ${y}, ${w}, ${h}), "Label");`,
        Button: `GUI.Button(new Rect(${x}, ${y}, ${w}, ${h}), "Button");`,
        TextField: `GUI.TextField(new Rect(${x}, ${y}, ${w}, ${h}), "Text");`,
        Toggle: `GUI.Toggle(new Rect(${x}, ${y}, ${w}, ${h}), false, "Toggle");`,
        HorizontalSlider: `GUI.HorizontalSlider(new Rect(${x}, ${y}, ${w}, ${h}), 0.5, 0, 1);`,
        VerticalSlider: `GUI.VerticalSlider(new Rect(${x}, ${y}, ${w}, ${h}), 0.5, 0, 1);`,
        DrawTexture: `GUI.DrawTexture(new Rect(${x}, ${y}, ${w}, ${h}), "texture");`,
        Box: `GUI.Box(new Rect(${x}, ${y}, ${w}, ${h}), "Box");`,
        TextArea: `GUI.TextArea(new Rect(${x}, ${y}, ${w}, ${h}), "TextArea");`,
        PasswordField: `GUI.PasswordField(new Rect(${x}, ${y}, ${w}, ${h}), "pass", '*');`,
        HorizontalScrollbar: `GUI.HorizontalScrollbar(new Rect(${x}, ${y}, ${w}, ${h}), 0.5, 0.1, 0, 1);`,
        VerticalScrollbar: `GUI.VerticalScrollbar(new Rect(${x}, ${y}, ${w}, ${h}), 0.5, 0.1, 0, 1);`,
        SelectionGrid: `GUI.SelectionGrid(new Rect(${x}, ${y}, ${w}, ${h}), 0, new string[] {"A", "B", "C", "D"}, 2);`
    };

    let line = templates[type];
    if (!line) return;

    const lines = codeEditor.value.split('\n');

    if (parentTarget && ['Window', 'ScrollView', 'BeginGroup'].includes(parentTarget.type)) {
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
            const parentLineNum = lineNumbers.get(parentTarget.codeLine.trim());
            if (parentLineNum !== undefined) {
                insertPos = parentLineNum + 1;
            }
        }

        if (insertPos !== -1) {
            const baseIndent = lines[insertPos - 1].match(/^(\s*)/)[1];
            lines.splice(insertPos, 0, baseIndent + '    ' + line);
            codeEditor.value = lines.join('\n');
            updatePreview();
            return;
        }
    }

    let idx = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('//') || !lines[i].trim()) idx = i + 1; else break;
    }
    lines.splice(idx, 0, line);
    codeEditor.value = lines.join('\n');
    updatePreview();
}

// Tree View
const sidePanels = document.getElementById('side-panels');
const treePanel = document.getElementById('tree-panel');
const treeView = document.getElementById('tree-view');
const propertiesPanel = document.getElementById('properties-panel');
const propertiesBody = document.getElementById('properties-body');
const cachePanel = document.getElementById('cache-panel');

treePanel.classList.add('hidden');
propertiesPanel.classList.add('hidden');
document.getElementById('panel-resizer').style.display = 'none';

function buildTreeView() {
    treeView.innerHTML = '';
    if (hierarchyData.length === 0) {
        treeView.innerHTML = '<div style="color: #858585; padding: 8px;">No elements</div>';
        return;
    }

    const all = [];
    hierarchyData.forEach((item, i) => {
        treeView.appendChild(createTreeItem(item, 0, String(i), all));
    });
    restoreSelections(all);
}

function createTreeItem(item, depth, path, all) {
    const div = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'tree-item';
    content.draggable = true;

    const idx = all.length;
    all.push({item, element: content, path});

    content.addEventListener('dragstart', (e) => {
        draggedTreeItem = item;
        content.classList.add('dragging');
    });

    content.addEventListener('dragend', () => {
        content.classList.remove('dragging');
        document.querySelectorAll('.tree-item').forEach(e => e.classList.remove('drop-target'));
        draggedTreeItem = null;
    });

    content.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedTreeItem && draggedTreeItem !== item) {
            content.classList.add('drop-target');
        }
    });

    content.addEventListener('dragleave', () => {
        content.classList.remove('drop-target');
    });

    content.addEventListener('drop', (e) => {
        e.preventDefault();
        content.classList.remove('drop-target');
        if (draggedTreeItem && draggedTreeItem !== item) {
            reorderItems(draggedTreeItem, item);
        }
    });

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
    const icons = {
        Window: '🗔',
        Button: '▭',
        Label: '🗛',
        TextField: '⎚',
        Toggle: '☑',
        ScrollView: '⬍',
        HorizontalSlider: '━',
        VerticalSlider: '┃',
        DrawTexture: '🖼',
        Box: '📦',
        TextArea: '📝',
        PasswordField: '🔒',
        BeginGroup: '📁',
        HorizontalScrollbar: '⬌',
        VerticalScrollbar: '⬍',
        SelectionGrid: '⊞'
    };
    icon.textContent = icons[item.type] || '○';
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
        if (e.shiftKey && lastClickedIndex !== null) {
            selectRange(lastClickedIndex, idx, all);
        } else {
            selectElement(item, content, e.ctrlKey || e.metaKey);
            lastClickedIndex = idx;
        }
    });

    div.appendChild(content);

    if (hasChildren) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';

        if (expandedItems.has(path)) {
            childrenDiv.classList.add('expanded');
            toggle.textContent = '▼';
        }

        item.children.forEach((child, i) => {
            childrenDiv.appendChild(createTreeItem(child, depth + 1, `${path}-${i}`, all));
        });

        div.appendChild(childrenDiv);

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            childrenDiv.classList.toggle('expanded');
            toggle.textContent = childrenDiv.classList.contains('expanded') ? '▼' : '▶';
            childrenDiv.classList.contains('expanded') ? expandedItems.add(path) : expandedItems.delete(path);
        });
    }

    return div;
}

function reorderItems(dragged, target) {
    const lines = codeEditor.value.split('\n');
    const dLine = lineNumbers.get(dragged.codeLine.trim());
    const tLine = lineNumbers.get(target.codeLine.trim());
    if (dLine === undefined || tLine === undefined) return;

    const dCode = lines[dLine];
    lines.splice(dLine, 1);
    const newIdx = dLine < tLine ? tLine - 1 : tLine;
    lines.splice(newIdx + 1, 0, dCode);

    codeEditor.value = lines.join('\n');
    updatePreview();
}

function restoreSelections(all) {
    selectedElements.forEach(s => {
        const found = all.find(a => a.item === s.item);
        if (found) {
            found.element.classList.add('selected');
            s.treeElement = found.element;
        }
    });
}

function selectRange(start, end, all) {
    const min = Math.min(start, end), max = Math.max(start, end);
    clearAllSelections();
    for (let i = min; i <= max; i++) {
        const {item, element} = all[i];
        if (item.element) item.element.classList.add('selected');
        element.classList.add('selected');
        selectedElements.push({item, element: item.element, treeElement: element});
    }
    updatePropertiesPanel();
}

function selectElement(item, treeEl, multi) {
    if (!multi) clearAllSelections();

    const existing = selectedElements.findIndex(s => s.item === item);
    if (existing !== -1) {
        selectedElements[existing].element?.classList.remove('selected');
        selectedElements[existing].treeElement?.classList.remove('selected');
        selectedElements.splice(existing, 1);
    } else {
        if (item.element) {
            item.element.classList.add('selected');
            if (selectedElements.length === 0) showResizeHandles(item.element);
        }
        treeEl.classList.add('selected');
        selectedElements.push({item, element: item.element, treeElement: treeEl});
    }
    updatePropertiesPanel();
}

// Properties Panel
function updatePropertiesPanel() {
    if (selectedElements.length === 0) {
        propertiesBody.innerHTML = '<div style="color: #858585; font-size: 12px;">No selection</div>';
        return;
    }

    const item = selectedElements[0].item;
    const texOpts = Array.from(fileCache.keys()).map(n => `<option value="${n}" ${item.textureName === n ? 'selected' : ''}>${n}</option>`).join('');

    let html = `
            <div class="property-group">
                <h4>Transform</h4>
                <div class="property-row">
                    <span class="property-label">X:</span>
                    <input class="property-input" type="number" value="${Math.round(item.rect.x)}" data-prop="x">
                </div>
                <div class="property-row">
                    <span class="property-label">Y:</span>
                    <input class="property-input" type="number" value="${Math.round(item.rect.y)}" data-prop="y">
                </div>
                <div class="property-row">
                    <span class="property-label">Width:</span>
                    <input class="property-input" type="number" value="${Math.round(item.rect.width)}" data-prop="width">
                </div>
                <div class="property-row">
                    <span class="property-label">Height:</span>
                    <input class="property-input" type="number" value="${Math.round(item.rect.height)}" data-prop="height">
                </div>
            </div>`;

    if (item.type === 'DrawTexture') {
        html += `
            <div class="property-group">
                <h4>Texture</h4>
                <div class="property-row">
                    <span class="property-label">Image:</span>
                    <select class="property-select" data-prop="texture">
                        <option value="">None</option>
                        ${texOpts}
                    </select>
                </div>
                <div class="property-row">
<!--                    <button class="property-input">Fix Aspect</button>-->
                    <span class="property-label">Lock Aspect:</span>
                    <input class="property-checkbox" type="checkbox" data-prop="lockAspect">
                </div>
            </div>`;
    }

    if (item.text && !['DrawTexture', 'Window'].includes(item.type)) {
        html += `
            <div class="property-group">
                <h4>Content</h4>
                <div class="property-row">
                    <span class="property-label">Text:</span>
                    <input class="property-input" type="text" value="${item.text}" data-prop="text">
                </div>
            </div>`;
    }

    if (item.type === 'Window') {
        html += `
            <div class="property-group">
                <h4>Window</h4>
                <div class="property-row">
                    <span class="property-label">Title:</span>
                    <input class="property-input" type="text" value="${item.text}" data-prop="windowTitle">
                </div>
            </div>`;
    }

    propertiesBody.innerHTML = html;

    propertiesBody.querySelectorAll('.property-input, .property-select, .property-checkbox').forEach(inp => {
        inp.addEventListener('change', (e) => {
            const prop = e.target.dataset.prop;
            const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.type === 'checkbox' ? e.target.checked : e.target.value;

            if (['x', 'y', 'width', 'height'].includes(prop)) {
                item.rect[prop] = val;
                item.element.style[prop === 'x' ? 'left' : prop === 'y' ? 'top' : prop] = val + 'px';
                updateCodeLine(item);
            } else if (prop === 'text') {
                item.text = val;
                if (item.element.tagName === 'INPUT' || item.element.tagName === 'TEXTAREA') {
                    item.element.value = val;
                } else if (item.type === 'Toggle') {
                    const span = item.element.querySelector('span');
                    if (span) span.textContent = val;
                } else {
                    item.element.textContent = val;
                }
                updateCodeLine(item);
            } else if (prop === 'windowTitle') {
                item.text = val;
                const titleBar = item.element.querySelector('.gui-window-title');
                if (titleBar) titleBar.textContent = val;
                updateCodeLine(item);
            } else if (prop === 'texture') {
                item.textureName = val;
                const img = fileCache.get(val);
                if (img) {
                    item.element.style.backgroundImage = `url(${img})`;
                    item.element.textContent = '';
                } else {
                    item.element.style.backgroundImage = '';
                    item.element.style.background = '#ccc';
                    item.element.textContent = val || 'Texture';
                }
                updateCodeLine(item);
            } else if (prop === 'lockAspect' && val) {
                const img = fileCache.get(item.textureName);
                if (img) {
                    const temp = new Image();
                    temp.onload = () => {
                        const aspect = temp.width / temp.height;
                        item.rect.height = item.rect.width / aspect;
                        item.element.style.height = item.rect.height + 'px';
                        updateCodeLine(item);
                        updatePropertiesPanel();
                    };
                    temp.src = img;
                }
            }
        });
    });
}

// Panel resizer
const panelResizer = document.getElementById('panel-resizer');
let isPanelResizing = false;

panelResizer.addEventListener('mousedown', () => {
    isPanelResizing = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isPanelResizing) return;
    const cont = sidePanels.getBoundingClientRect();
    const h = e.clientY - cont.top;
    const pct = (h / cont.height) * 100;
    if (pct >= 20 && pct <= 80) {
        treePanel.style.flex = `0 0 ${pct}%`;
        propertiesPanel.style.flex = `0 0 ${100 - pct}%`;
    }
});

document.addEventListener('mouseup', () => {
    if (isPanelResizing) {
        isPanelResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

// Export
document.getElementById('export-btn').addEventListener('click', () => {
    const blob = new Blob([codeEditor.value], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unity_imgui_export.cs';
    a.click();
    URL.revokeObjectURL(url);
});

// Keyboard
document.addEventListener('keydown', (e) => {
    if (document.activeElement === codeEditor) return;

    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (e.altKey) {
            propertiesVisible = !propertiesVisible;
            propertiesVisible ? propertiesPanel.classList.remove('hidden') : propertiesPanel.classList.add('hidden');
            updatePropertiesPanel();
        } else {
            treeVisible = !treeVisible;
            treeVisible ? treePanel.classList.remove('hidden') : treePanel.classList.add('hidden');
            if (treeVisible) buildTreeView();
        }

        if (!treeVisible && !propertiesVisible) {
            sidePanels.classList.remove('visible');
        } else {
            sidePanels.classList.add('visible');
            if (treeVisible && !propertiesVisible) {
                treePanel.style.flex = '1';
                document.getElementById('panel-resizer').style.display = 'none';
            } else if (!treeVisible && propertiesVisible) {
                propertiesPanel.style.flex = '1';
                document.getElementById('panel-resizer').style.display = 'none';
            } else {
                treePanel.style.flex = '0 0 50%';
                propertiesPanel.style.flex = '0 0 50%';
                document.getElementById('panel-resizer').style.display = 'block';
            }
        }
    }

    if ((e.key === 'a' || e.key === 'A') && e.altKey) {
        e.preventDefault();
        cacheVisible = !cacheVisible;
        cacheVisible ? cachePanel.classList.add('visible') : cachePanel.classList.remove('visible');
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElements.length > 0) {
        e.preventDefault();
        const lines = codeEditor.value.split('\n');
        selectedElements.forEach(s => {
            const ln = lineNumbers.get(s.item.codeLine.trim());
            if (ln !== undefined) lines.splice(ln + 1, 0, lines[ln]);
        });
        codeEditor.value = lines.join('\n');
        updatePreview();
        if (treeVisible) buildTreeView();
    }

    if (e.key === 'Delete' && selectedElements.length > 0) {
        e.preventDefault();
        const lines = codeEditor.value.split('\n');
        const del = new Set();
        selectedElements.forEach(s => {
            const ln = lineNumbers.get(s.item.codeLine.trim());
            if (ln !== undefined) del.add(ln);
        });
        Array.from(del).sort((a, b) => b - a).forEach(i => lines.splice(i, 1));
        codeEditor.value = lines.join('\n');
        clearAllSelections();
        updatePreview();
        if (treeVisible) buildTreeView();
    }

    if (selectedElements.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        selectedElements.forEach(s => {
            if (e.key === 'ArrowUp') s.item.rect.y -= step;
            if (e.key === 'ArrowDown') s.item.rect.y += step;
            if (e.key === 'ArrowLeft') s.item.rect.x -= step;
            if (e.key === 'ArrowRight') s.item.rect.x += step;
            s.element.style.left = s.item.rect.x + 'px';
            s.element.style.top = s.item.rect.y + 'px';
            updateCodeLine(s.item);
        });
        updatePropertiesPanel();
    }
});

// View toggle
const editorPanel = document.querySelector('.editor-panel');
const previewPanel = document.querySelector('.preview-panel');
const resizer = document.getElementById('resizer');

[document.getElementById('view-code'), document.getElementById('view-code-2')].forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
        document.getElementById('view-code').classList.add('active');
        document.getElementById('view-code-2').classList.add('active');
        editorPanel.classList.remove('hidden');
        editorPanel.classList.add('full-width');
        previewPanel.classList.add('hidden');
        resizer.classList.add('hidden');
    });
});

[document.getElementById('view-split'), document.getElementById('view-split-2')].forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
        document.getElementById('view-split').classList.add('active');
        document.getElementById('view-split-2').classList.add('active');
        editorPanel.classList.remove('hidden', 'full-width');
        previewPanel.classList.remove('hidden', 'full-width');
        resizer.classList.remove('hidden');
    });
});

[document.getElementById('view-preview'), document.getElementById('view-preview-2')].forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
        document.getElementById('view-preview').classList.add('active');
        document.getElementById('view-preview-2').classList.add('active');
        editorPanel.classList.add('hidden');
        previewPanel.classList.remove('hidden');
        previewPanel.classList.add('full-width');
        resizer.classList.add('hidden');
    });
});

// Resizer
let isResizingMain = false;
resizer.addEventListener('mousedown', () => {
    isResizingMain = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isResizingMain) return;
    const pct = (e.clientX / document.body.clientWidth) * 100;
    if (pct >= 20 && pct <= 80) editorPanel.style.width = pct + '%';
});

document.addEventListener('mouseup', () => {
    if (isResizingMain) {
        isResizingMain = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

let updateTimeout;
codeEditor.addEventListener('input', () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updatePreview, 300);
});

updatePreview();