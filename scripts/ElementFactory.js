class ElementFactory {
    constructor(state) {
        this.state = state;
    }

    createElement(type, line, container, offX, offY, parent, rect) {
        if (!rect) rect = CodeParser.parseRect(line);
        if (!rect) return null;

        const isTextInput = Constants.TEXT_INPUT_TYPES.includes(type);
        const el = isTextInput
            ? document.createElement(type === 'TextArea' ? 'textarea' : 'input')
            : document.createElement('div');

        el.className = `gui-element gui-${type.toLowerCase()}`;
        Object.assign(el.style, {
            left: (rect.x + offX) + 'px',
            top: (rect.y + offY) + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px'
        });

        let text = '', value = 0.5, textureName = '', checked = false;

        if (Constants.TEXT_ELEMENTS.includes(type)) {
            text = CodeParser.parseString(line);

            if (type === 'TextField' || type === 'PasswordField') {
                el.type = type === 'PasswordField' ? 'password' : 'text';
                el.value = text;
            } else if (type === 'TextArea') {
                el.value = text;
            } else if (type === 'Toggle') {
                checked = line.includes('true');
                this.createToggleElement(el, checked, text);
            } else {
                el.textContent = text;
            }
        } else if (Constants.SLIDER_TYPES.includes(type)) {
            value = CodeParser.parseSliderValue(line);
            this.createSliderElement(el, type, value, rect);
        } else if (type === 'DrawTexture' || type === 'DrawTextureWithTexCoords') {
            textureName = CodeParser.parseString(line);
            this.createTextureElement(el, textureName);
        } else if (type === 'BeginGroup') {
            el.innerHTML = '<div class="gui-group-content"></div>';
        } else if (type === 'ScrollView') {
            this.createScrollViewElement(el);
        } else if (type === 'SelectionGrid') {
            this.createSelectionGridElement(el, line);
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

        this.attachEventListeners(el, hierarchyItem);

        if (parent) {
            parent.children.push(hierarchyItem);
        } else {
            this.state.hierarchyData.push(hierarchyItem);
        }

        return { element: el, hierarchyItem };
    }

    createToggleElement(el, checked, text) {
        const box = document.createElement('div');
        box.className = 'gui-toggle-box';
        if (checked) box.textContent = '✓';

        const lbl = document.createElement('span');
        lbl.textContent = text;
        lbl.style.color = '#fff';

        el.appendChild(box);
        el.appendChild(lbl);
    }

    createSliderElement(el, type, value, rect) {
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
    }

    createTextureElement(el, textureName) {
        const img = this.state.fileCache.get(textureName);
        if (img) {
            el.style.backgroundImage = `url(${img})`;
        } else {
            el.textContent = textureName || 'Texture';
            el.style.background = '#ccc';
        }
    }

    createScrollViewElement(el) {
        const content = document.createElement('div');
        content.className = 'gui-scroll-content';
        el.appendChild(content);
    }

    createSelectionGridElement(el, line) {
        const gridData = CodeParser.parseSelectionGrid(line);
        if (gridData) {
            el.style.gridTemplateColumns = `repeat(${gridData.columns}, 1fr)`;
            gridData.items.forEach((item, idx) => {
                const cell = document.createElement('div');
                cell.className = 'gui-selectiongrid-item';
                if (idx === gridData.selected) cell.classList.add('selected');
                cell.textContent = item;
                el.appendChild(cell);
            });
        }
    }

    createWindow(line, previewCanvas) {
        const rect = CodeParser.parseRect(line);
        if (!rect) return;

        const title = CodeParser.parseWindowTitle(line);
        const funcName = CodeParser.parseWindowFunction(line);

        const div = document.createElement('div');
        div.className = 'gui-element gui-window';
        Object.assign(div.style, {
            left: rect.x + 'px',
            top: rect.y + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px'
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
            type: 'Window',
            text: title,
            children: [],
            element: div,
            codeLine: line,
            rect,
            parent: null
        };

        this.state.hierarchyData.push(hierarchyItem);

        titleBar.addEventListener('click', (e) => {
            e.stopPropagation();
            window.selectionManager.selectFromPreview(hierarchyItem, e.ctrlKey || e.metaKey);
        });

        return { content, funcName, hierarchyItem };
    }

    attachEventListeners(el, hierarchyItem) {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            window.selectionManager.selectFromPreview(hierarchyItem, e.ctrlKey || e.metaKey);
        });

        el.addEventListener('mousedown', (e) => {
            if (e.altKey) return;
            if (this.state.selectedElements.some(s => s.item === hierarchyItem)) {
                e.stopPropagation();
                window.dragHandler.startDrag(e, this.state.selectedElements);
            }
        });
    }
}