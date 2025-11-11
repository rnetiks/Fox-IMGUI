class CodeParser {
    /**
     * Parses a string representation of a rectangle into an object containing its dimensions and position.
     * The input should match the format: "new Rect(x, y, width, height)".
     *
     * @param {string} str - The string representation of a rectangle.
     * @return {Object|null} An object with the properties `x`, `y`, `width`, and `height` if parsing is successful, or `null` if the input does not match the expected format.
     */
    static parseRect(str) {
        const m = str.match(/new\s+Rect\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/);
        return m ? { x: +m[1], y: +m[2], width: +m[3], height: +m[4] } : null;
    }

    /**
     * Parses the input string and extracts the content inside double quotes.
     *
     * @param {string} str - The input string to be parsed.
     * @return {string} The extracted string inside double quotes, or an empty string if no match is found.
     */
    static parseString(str) {
        const m = str.match(/"([^"]*)"/);
        return m ? m[1] : '';
    }

    /**
     * Parses a string to extract color values and returns an object representing the color.
     * The input string is expected to match the format of a new Color constructor call.
     *
     * @param {string} line The string containing the color definition in the format 'new Color(r, g, b, a)'.
     * @return {Object|null} An object representing the color with properties r, g, b, a if the input matches the expected format, otherwise null.
     */
    static parseColor(line) {
        const m = line.match(/new\s+Color\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/);
        return m ? { r: +m[1], g: +m[2], b: +m[3], a: +m[4] } : null;
    }

    /**
     * Parses a string representation of a Vector2 object and extracts its x and y components.
     *
     * @param {string} line - The string input containing a Vector2 representation in the format `new Vector2(x, y)`.
     * @return {Object|null} An object with `x` and `y` properties as numbers if the input matches the expected format, otherwise null.
     */
    static parseVector2(line){
        const m = line.match(/new\s+Vector2\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/);
        return m ? { x: +m[1], y: +m[2] } : null;
    }

    /**
     * Parses a string to extract a 3D vector represented as "new Vector3(x, y, z)".
     *
     * @param {string} line - The string containing the vector representation.
     * @return {Object|null} An object containing the x and y components of the vector if parsing succeeds, or null if the string does not match the expected format.
     */
    static parseVector3(line){
        const m = line.match(/new\s+Vector3\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/);
        return m ? { x: +m[1], y: +m[2] } : null;
    }

    /**
     * Parses a line of code to extract a variable name and its value as an object.
     * The line must define a variable in the format: `var variableName = { ... };`.
     *
     * @param {string} line - The line of code to parse.
     * @return {Object|null} An object containing the variable name (`name`) as a string
     * and its value (`value`) as an object if parsing succeeds. Returns null if the line
     * doesn't match the expected format or if parsing fails.
     */
    static parseVariable(line) {
        const m = line.match(/var\s+(\w+)\s*=\s*({[\s\S]*?});/);
        if (m) {
            try {
                return { name: m[1], value: eval('(' + m[2] + ')') };
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Extracts all function definitions from a given JavaScript code string and returns them as an object.
     * The keys of the object are the function names, and the values are the corresponding function bodies.
     *
     * @param {string} code The JavaScript codes string to parse and extract functions from.
     * @return {Object} An object mapping function names to their respective function bodies as strings.
     */
    static extractFunctions(code) {
        const functions = {};
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

        return functions;
    }

    /**
     * Removes all function declarations from the provided code string.
     *
     * @param {string} code - The source code from which function declarations should be removed.
     * @return {string} The source code with function declarations removed.
     */
    static removeFunctions(code) {
        return code.replace(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
    }

    /**
     * Parses the provided code to generate a map of line content to their line numbers.
     *
     * @param {string} code - The input code as a string to process and extract line numbers.
     * @return {Map<string, number>} A map where the keys are the trimmed, non-empty, non-comment, and non-function declaration lines of code, and the values are their corresponding line numbers.
     */
    static buildLineNumbers(code) {
        const lineNumbers = new Map();
        const lines = code.split('\n');

        lines.forEach((line, i) => {
            const trim = line.trim();
            if (trim && !trim.startsWith('//') && !trim.startsWith('function')) {
                lineNumbers.set(trim, i);
            }
        });

        return lineNumbers;
    }

    /**
     * Parses a string containing rect definitions for a scroll view and extracts the view and content rectangle details.
     *
     * @param {string} line - The input string containing rect definitions in the format of "new Rect(x, y, width, height)".
     * @return {Object|null} An object containing `viewRect` and `contentRect` parsed from the input if at least two rects are found,
     *                       otherwise returns null.
     */
    static parseScrollViewRects(line) {
        const rects = line.match(/new\s+Rect\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/g);
        if (rects && rects.length >= 2) {
            return {
                viewRect: this.parseRect(rects[0]),
                contentRect: this.parseRect(rects[1])
            };
        }
        return null;
    }

    /**
     * Parses a slider value from a given string.
     *
     * @param {string} line - The input string to be parsed, expected to contain a numeric value after a specific pattern.
     * @return {number} The parsed slider value as a number. If the pattern does not match, returns 0.5 as the default value.
     */
    static parseSliderValue(line) {
        const m = line.match(/\)\s*,\s*([0-9.]+)/);
        return m ? +m[1] : 0.5;
    }

    /**
     * Parses a line of text representing a selection grid configuration and extracts relevant data.
     *
     * @param {string} line - The input string containing the selection grid configuration.
     * @return {Object|null} An object containing the selected index, array of items, and number of columns if parsing is successful; otherwise, null.
     */
    static parseSelectionGrid(line) {
        const m = line.match(/\)\s*,\s*(\d+)\s*,\s*new\s+string\[\]\s*\{([^}]+)\}\s*,\s*(\d+)/);
        if (m) {
            return {
                selected: +m[1],
                items: m[2].split(',').map(s => s.trim().replace(/"/g, '')),
                columns: +m[3]
            };
        }
        return null;
    }

    /**
     * Extracts and returns the window title from a given line, if present.
     *
     * @param {string} line - The input string potentially containing the window title.
     * @return {string} The extracted window title if matched, otherwise returns 'Window'.
     */
    static parseWindowTitle(line) {
        const tm = line.match(/,\s*"([^"]+)"/);
        return tm ? tm[1] : 'Window';
    }

    /**
     * Parses a given window function line and extracts a specific condition.
     *
     * @param {string} line - The input string that contains the structured line with a window function.
     * @return {string|null} The extracted condition from the input line, or null if the condition is not found.
     */
    static parseWindowFunction(line) {
        const after = line.substring(line.indexOf(')') + 1);
        const fm = after.match(/,\s*(\w+)\s*,/);
        return fm ? fm[1] : null;
    }

    /**
     * Updates a line of text to replace any occurrence of a `Rect` object construction
     * with a new `Rect` constructed using the rounded values from the provided rect object.
     *
     * @param {string} line - The string containing the line to be updated.
     *                        This line is expected to include a `new Rect()` expression.
     * @param {Object} rect - An object representing the rectangle with properties `x`, `y`,
     *                        `width`, and `height` that will be used to replace the existing `Rect` values.
     * @return {string} - The updated line with the new `Rect` construction replacing the old one.
     */
    static updateRectInLine(line, rect) {
        return line.replace(
            /new\s+Rect\s*\(\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*\)/,
            `new Rect(${Math.round(rect.x)}, ${Math.round(rect.y)}, ${Math.round(rect.width)}, ${Math.round(rect.height)})`
        );
    }

    /**
     * Updates the text within double quotes in a given line with the specified text.
     *
     * @param {string} line - The string containing a line where the update will occur.
     * @param {string} text - The new text to replace the content inside double quotes.
     * @return {string} The updated line with the text replaced within double quotes.
     */
    static updateTextInLine(line, text) {
        return line.replace(/"[^"]*"/, `"${text}"`);
    }

    /**
     * Updates the given line by replacing the window title in-line with the specified title.
     *
     * @param {string} line - The string containing the original line where the title needs to be updated.
     * @param {string} title - The new title to replace the existing title in the line.
     * @return {string} - The updated line with the new title incorporated.
     */
    static updateWindowTitleInLine(line, title) {
        return line.replace(/,\s*"[^"]*"/, `, "${title}"`);
    }
}