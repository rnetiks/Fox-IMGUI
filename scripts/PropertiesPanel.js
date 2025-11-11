class PropertiesPanel {
    constructor(state, propertiesBodyElement, dragHandler) {
        this.state = state;
        this.propertiesBodyElement = propertiesBodyElement;
        this.dragHandler = dragHandler;
    }

    update() {
        if (this.state.selectedElements.length === 0) {
            this.propertiesBodyElement.innerHTML = '<div style="color: #858585; font-size: 12px;">No selection</div>';
            return;
        }

        const item = this.state.selectedElements[0].item;
        let html = this.buildTransformSection(item);

        if (item.type === 'DrawTexture') {
            html += this.buildTextureSection(item);
        }

        if (item.text && !['DrawTexture', 'Window'].includes(item.type)) {
            html += this.buildContentSection(item);
        }

        if (item.type === 'Window') {
            html += this.buildWindowSection(item);
        }

        this.propertiesBodyElement.innerHTML = html;
        this.attachEventListeners(item);
    }

    buildTransformSection(item) {
        return `
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
            </div>
        `;
    }

    buildTextureSection(item) {
        const texOpts = Array.from(this.state.fileCache.keys())
            .map(n => `<option value="${n}" ${item.textureName === n ? 'selected' : ''}>${n}</option>`)
            .join('');

        return `
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
                    <span class="property-label">Lock Aspect:</span>
                    <input class="property-checkbox" type="checkbox" data-prop="lockAspect">
                </div>
            </div>
        `;
    }

    buildContentSection(item) {
        return `
            <div class="property-group">
                <h4>Content</h4>
                <div class="property-row">
                    <span class="property-label">Text:</span>
                    <input class="property-input" type="text" value="${item.text}" data-prop="text">
                </div>
            </div>
        `;
    }

    buildWindowSection(item) {
        return `
            <div class="property-group">
                <h4>Window</h4>
                <div class="property-row">
                    <span class="property-label">Title:</span>
                    <input class="property-input" type="text" value="${item.text}" data-prop="windowTitle">
                </div>
            </div>
        `;
    }

    attachEventListeners(item) {
        this.propertiesBodyElement.querySelectorAll('.property-input, .property-select, .property-checkbox')
            .forEach(inp => {
                inp.addEventListener('change', (e) => {
                    this.handlePropertyChange(e, item);
                });
            });
    }

    handlePropertyChange(e, item) {
        const prop = e.target.dataset.prop;
        const val = e.target.type === 'number'
            ? parseFloat(e.target.value)
            : e.target.type === 'checkbox'
                ? e.target.checked
                : e.target.value;

        if (['x', 'y', 'width', 'height'].includes(prop)) {
            this.updateTransform(item, prop, val);
        } else if (prop === 'text') {
            this.updateText(item, val);
        } else if (prop === 'windowTitle') {
            this.updateWindowTitle(item, val);
        } else if (prop === 'texture') {
            this.updateTexture(item, val);
        } else if (prop === 'lockAspect' && val) {
            this.lockAspectRatio(item);
        }
    }

    updateTransform(item, prop, val) {
        item.rect[prop] = val;
        const styleProp = prop === 'x' ? 'left' : prop === 'y' ? 'top' : prop;
        item.element.style[styleProp] = val + 'px';
        this.dragHandler.updateCodeLine(item);
    }

    updateText(item, val) {
        item.text = val;
        if (item.element.tagName === 'INPUT' || item.element.tagName === 'TEXTAREA') {
            item.element.value = val;
        } else if (item.type === 'Toggle') {
            const span = item.element.querySelector('span');
            if (span) span.textContent = val;
        } else {
            item.element.textContent = val;
        }
        this.dragHandler.updateCodeLine(item);
    }

    updateWindowTitle(item, val) {
        item.text = val;
        const titleBar = item.element.querySelector('.gui-window-title');
        if (titleBar) titleBar.textContent = val;
        this.dragHandler.updateCodeLine(item);
    }

    updateTexture(item, val) {
        item.textureName = val;
        const img = this.state.fileCache.get(val);
        if (img) {
            item.element.style.backgroundImage = `url(${img})`;
            item.element.textContent = '';
        } else {
            item.element.style.backgroundImage = '';
            item.element.style.background = '#ccc';
            item.element.textContent = val || 'Texture';
        }
        this.dragHandler.updateCodeLine(item);
    }

    lockAspectRatio(item) {
        const img = this.state.fileCache.get(item.textureName);
        if (img) {
            const temp = new Image();
            temp.onload = () => {
                const aspect = temp.width / temp.height;
                item.rect.height = item.rect.width / aspect;
                item.element.style.height = item.rect.height + 'px';
                this.dragHandler.updateCodeLine(item);
                this.update();
            };
            temp.src = img;
        }
    }
}