class CodeExecutor {
    constructor(state, previewCanvas) {
        this.state = state;
        this.previewCanvas = previewCanvas;
        this.elementFactory = new ElementFactory(state);
    }

    /**
     * Parses the provided code, extracts functions, builds line numbers, and executes the remaining main code.
     *
     * @param {string} code - The source code to be parsed and executed.
     * @return {void} Does not return a value.
     */
    parseAndExecute(code) {
        this.state.reset();

        this.state.lineNumbers = CodeParser.buildLineNumbers(code);

        this.state.functions = CodeParser.extractFunctions(code);

        let main = CodeParser.removeFunctions(code);

        this.executeCode(main, this.previewCanvas, 0, 0, null);
    }

    /**
     * Parses and executes a block of GUI-related code, creating and managing graphical elements
     * such as windows, buttons, labels, scroll views, and groups.
     *
     * @param {string} code - The source code instructions to be parsed and executed.
     * @param {object} container - The parent container in which the GUI elements are to be rendered.
     * @param {number} offX - The horizontal offset to be applied to the elements.
     * @param {number} offY - The vertical offset to be applied to the elements.
     * @param {object} parent - The parent GUI element under which the current elements will be grouped.
     * @return {void} Does not return a value.
     */
    executeCode(code, container, offX, offY, parent) {
        const lines = code.split('\n');
        let i = 0, currentScrollView = null, currentGroup = null;

        while (i < lines.length) {
            let line = lines[i++].trim();
            if (!line || line.startsWith('//')) continue;

            if (line.startsWith('var ')) {
                const varData = CodeParser.parseVariable(line);
                if (varData) {
                    this.state.variables[varData.name] = varData.value;
                }
                continue;
            }

            if (line.includes('GUI.color')) {
                const color = CodeParser.parseColor(line);
                if (color) {
                    this.state.currentColor = color;
                }
                continue;
            }

            if (line.includes('GUI.BeginScrollView')) {
                const rects = CodeParser.parseScrollViewRects(line);
                if (rects) {
                    const sv = this.elementFactory.createElement(
                        'ScrollView',
                        line,
                        container,
                        offX,
                        offY,
                        parent,
                        rects.viewRect
                    );
                    if (sv) {
                        currentScrollView = sv.hierarchyItem;
                        this.state.scrollViews.push({
                            element: sv.element.querySelector('.gui-scroll-content'),
                            hierarchyItem: sv.hierarchyItem
                        });
                    }
                }
                continue;
            }

            if (line.includes('GUI.EndScrollView')) {
                if (this.state.scrollViews.length > 0) {
                    this.state.scrollViews.pop();
                }
                currentScrollView = null;
                continue;
            }

            if (line.includes('GUI.BeginGroup')) {
                const rect = CodeParser.parseRect(line);
                if (rect) {
                    const grp = this.elementFactory.createElement(
                        'BeginGroup',
                        line,
                        container,
                        offX,
                        offY,
                        parent,
                        rect
                    );
                    currentGroup = grp.hierarchyItem;
                }
                continue;
            }

            if (line.includes('GUI.EndGroup')) {
                currentGroup = null;
                continue;
            }

            const currCont = this.state.scrollViews.length > 0
                ? this.state.scrollViews[this.state.scrollViews.length - 1].element
                : currentGroup
                    ? currentGroup.element.querySelector('.gui-group-content')
                    : container;

            const currOff = (this.state.scrollViews.length > 0 || currentGroup)
                ? { x: 0, y: 0 }
                : { x: offX, y: offY };

            const currParent = currentScrollView || currentGroup || parent;

            if (line.includes('GUI.Window')) {
                const windowData = this.elementFactory.createWindow(line, this.previewCanvas);
                if (windowData && windowData.funcName && this.state.functions[windowData.funcName]) {
                    this.executeCode(
                        this.state.functions[windowData.funcName],
                        windowData.content,
                        0,
                        0,
                        windowData.hierarchyItem
                    );
                }
                continue;
            }

            const guiTypes = [
                'Button', 'Label', 'TextField', 'Toggle',
                'HorizontalSlider', 'VerticalSlider', 'DrawTexture', 'Box',
                'TextArea', 'PasswordField', 'RepeatButton',
                'HorizontalScrollbar', 'VerticalScrollbar',
                'SelectionGrid', 'DrawTextureWithTexCoords'
            ];

            for (const type of guiTypes) {
                if (line.includes(`GUI.${type}`)) {
                    const rect = CodeParser.parseRect(line);
                    if (rect) {
                        this.elementFactory.createElement(
                            type,
                            line,
                            currCont,
                            currOff.x,
                            currOff.y,
                            currParent,
                            rect
                        );
                    }
                    break;
                }
            }
        }
    }
}