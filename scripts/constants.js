/**
 * Constants holding configuration and definitions for GUI-related operations and elements.
 */
const Constants = {
    CANVAS: {
        WIDTH: 1920,
        HEIGHT: 1080
    },

    ELEMENT_TYPES: {
        BUTTON: 'Button',
        LABEL: 'Label',
        TEXT_FIELD: 'TextField',
        TOGGLE: 'Toggle',
        HORIZONTAL_SLIDER: 'HorizontalSlider',
        VERTICAL_SLIDER: 'VerticalSlider',
        DRAW_TEXTURE: 'DrawTexture',
        BOX: 'Box',
        TEXT_AREA: 'TextArea',
        PASSWORD_FIELD: 'PasswordField',
        REPEAT_BUTTON: 'RepeatButton',
        HORIZONTAL_SCROLLBAR: 'HorizontalScrollbar',
        VERTICAL_SCROLLBAR: 'VerticalScrollbar',
        SELECTION_GRID: 'SelectionGrid',
        DRAW_TEXTURE_COORDS: 'DrawTextureWithTexCoords',
        WINDOW: 'Window',
        BEGIN_GROUP: 'BeginGroup',
        SCROLL_VIEW: 'ScrollView'
    },

    get ELEMENT_TYPES_ARRAY() {
        return Object.values(this.ELEMENT_TYPES);
    },

    get CONTAINER_TYPES() {
        return [
            this.ELEMENT_TYPES.WINDOW,
            this.ELEMENT_TYPES.BOX,
            this.ELEMENT_TYPES.BEGIN_GROUP,
            this.ELEMENT_TYPES.SCROLL_VIEW
        ];
    },

    get TEXT_INPUT_TYPES() {
        return [
            this.ELEMENT_TYPES.TEXT_FIELD,
            this.ELEMENT_TYPES.TEXT_AREA,
            this.ELEMENT_TYPES.PASSWORD_FIELD
        ];
    },

    get SLIDER_TYPES() {
        return [
            this.ELEMENT_TYPES.HORIZONTAL_SLIDER,
            this.ELEMENT_TYPES.VERTICAL_SLIDER,
            this.ELEMENT_TYPES.HORIZONTAL_SCROLLBAR,
            this.ELEMENT_TYPES.VERTICAL_SCROLLBAR
        ];
    },

    get TEXT_ELEMENTS() {
        return [
            this.ELEMENT_TYPES.LABEL,
            this.ELEMENT_TYPES.BUTTON,
            this.ELEMENT_TYPES.TEXT_FIELD,
            this.ELEMENT_TYPES.TEXT_AREA,
            this.ELEMENT_TYPES.PASSWORD_FIELD,
            this.ELEMENT_TYPES.TOGGLE,
            this.ELEMENT_TYPES.BOX,
            this.ELEMENT_TYPES.REPEAT_BUTTON
        ];
    },

    DEFAULT_SIZES: {
        'Label': [100, 20],
        'Button': [100, 30],
        'TextField': [150, 25],
        'Toggle': [100, 20],
        'HorizontalSlider': [150, 20],
        'VerticalSlider': [20, 150],
        'DrawTexture': [100, 100],
        'Box': [150, 150],
        'TextArea': [200, 100],
        'PasswordField': [150, 25],
        'HorizontalScrollbar': [150, 20],
        'VerticalScrollbar': [20, 150],
        'SelectionGrid': [150, 150]
    },

    CODE_TEMPLATES: {
        'Label': (x, y, w, h) => `GUI.Label(new Rect(${x}, ${y}, ${w}, ${h}), "Label");`,
        'Button': (x, y, w, h) => `GUI.Button(new Rect(${x}, ${y}, ${w}, ${h}), "Button");`,
        'TextField': (x, y, w, h) => `GUI.TextField(new Rect(${x}, ${y}, ${w}, ${h}), "Text");`,
        'Toggle': (x, y, w, h) => `GUI.Toggle(new Rect(${x}, ${y}, ${w}, ${h}), false, "Toggle");`,
        'HorizontalSlider': (x, y, w, h) => `GUI.HorizontalSlider(new Rect(${x}, ${y}, ${w}, ${h}), 0.5, 0, 1);`,
        'VerticalSlider': (x, y, w, h) => `GUI.VerticalSlider(new Rect(${x}, ${y}, ${w}, ${h}), 0.5, 0, 1);`,
        'DrawTexture': (x, y, w, h) => `GUI.DrawTexture(new Rect(${x}, ${y}, ${w}, ${h}), "texture");`,
        'Box': (x, y, w, h) => `GUI.Box(new Rect(${x}, ${y}, ${w}, ${h}), "Box");`,
        'TextArea': (x, y, w, h) => `GUI.TextArea(new Rect(${x}, ${y}, ${w}, ${h}), "TextArea");`,
        'PasswordField': (x, y, w, h) => `GUI.PasswordField(new Rect(${x}, ${y}, ${w}, ${h}), "pass", '*');`,
        'HorizontalScrollbar': (x, y, w, h) => `GUI.HorizontalScrollbar(new Rect(${x}, ${y}, ${w}, ${h}), 0.5, 0.1, 0, 1);`,
        'VerticalScrollbar': (x, y, w, h) => `GUI.VerticalScrollbar(new Rect(${x}, ${y}, ${w}, ${h}), 0.5, 0.1, 0, 1);`,
        'SelectionGrid': (x, y, w, h) => `GUI.SelectionGrid(new Rect(${x}, ${y}, ${w}, ${h}), 0, new string[] {"A", "B", "C", "D"}, 2);`
    },

    TREE_ICONS: {
        'Window': '🗔',
        'Button': '▭',
        'Label': '🗛',
        'TextField': '⎚',
        'Toggle': '☑',
        'ScrollView': '⬍',
        'HorizontalSlider': '⬌',
        'VerticalSlider': '┃',
        'DrawTexture': '🖼',
        'Box': '📦',
        'TextArea': '📝',
        'PasswordField': '🔒',
        'BeginGroup': '📁',
        'HorizontalScrollbar': '⬌',
        'VerticalScrollbar': '⬍',
        'SelectionGrid': '⊞'
    },

    SNAP_MODE: {
        NONE: 'none',
        GRID: 'grid',
        ELEMENTS: 'elements'
    },

    SNAP_CONFIG: {
        THRESHOLD: 5,
        DEFAULT_GRID_SIZE: 10
    },

    PANEL_CONFIG: {
        MIN_SIZE_PCT: 20,
        MAX_SIZE_PCT: 80
    },

    MOVE_STEP: {
        NORMAL: 1,
        FAST: 10
    }
};