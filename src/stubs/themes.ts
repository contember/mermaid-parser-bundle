// Replacement for `mermaid/src/themes/*`. Parsers may read a handful of theme
// values (e.g. xychart's `plotColorPalette` — a comma-separated string). We
// return a plain object with a few string fields, plus a proxy fallback for
// the rest so `.split`, `.replace`, etc. chains stay defined.

const emptyStr = '';
const theme: any = new Proxy({}, {
  get: (target, prop) => {
    if (prop === Symbol.toPrimitive) return () => '';
    if (prop === Symbol.iterator) return undefined;
    if (prop === 'xyChart') {
      return { plotColorPalette: '', titleColor: '', backgroundColor: '' };
    }
    return emptyStr;
  },
});

const getThemeVariables = () => theme;
const themeModule = { getThemeVariables };

export { getThemeVariables };
export default { default: themeModule, base: themeModule, forest: themeModule, dark: themeModule, neutral: themeModule, null: themeModule };
