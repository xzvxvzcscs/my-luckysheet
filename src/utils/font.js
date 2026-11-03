import locale from "../locale/locale";
import Store from "../store";

const FontAliases = [
    ["Microsoft YaHei", "微软雅黑", "微軟雅黑"],
    ["SimSun", "宋体", "宋體"],
    ["SimHei", "黑体", "黑體"],
    ["KaiTi", "楷体", "楷體"],
    ["FangSong", "仿宋", "倣宋"],
    ["NSimSun", "新宋体", "新宋體"],
    ["STXinwei", "华文新魏", "華文新魏"],
    ["STXingkai", "华文行楷", "華文行楷"],
    ["STLiti", "华文隶书", "華文隸書"],
    ["PMingLiU", "新細明體", "新细明体"],
    ["MingLiU", "細明體", "细明体"],
];

export function getFontName(font) {
    const names = locale().fontarray;
    const name = String(font == null ? "" : font).replace(/["']/g, "").trim();
    if (!name) return names[0];
    if (/^\d+$/.test(name)) {
        const defaults = ["Times New Roman", "Arial", "Tahoma", "Verdana", ...FontAliases.slice(0, 9).map(group => group[1])];
        return names[Number(name)] || defaults[Number(name)] || names[0];
    }
    return name;
}

// 别名只用于比较和渲染，保留工作簿中原有的字体名称。
export function getFontKey(font) {
    const name = getFontName(font).toLowerCase();
    const aliases = FontAliases.find(group => group.some(item => item.toLowerCase() === name));
    return aliases ? aliases[0].toLowerCase() : name;
}

export function getFontFamily(font) {
    const name = getFontName(font);
    const key = getFontKey(name);
    const aliases = FontAliases.find(group => group[0].toLowerCase() === key) || [];
    const serif = /times new roman|simsun|mingliu|fangsong|songti/.test(key);
    const fallbacks = serif
        ? ["PMingLiU", "新細明體", "SimSun", "宋体", "Songti SC"]
        : ["Microsoft YaHei", "微软雅黑", "PingFang SC", "SimHei", "黑体"];
    const names = [...new Set([name, ...aliases, ...fallbacks, "Arial"])];
    return names.map(item => JSON.stringify(item)).join(", ") + (serif ? ", serif" : ", sans-serif");
}

export function getCellFont(cell, run) {
    cell = cell || {};
    run = run || cell;
    const font = {};
    const defaults = { ff: 0, fs: Store.defaultFontSize, fc: "#000000", bl: 0, it: 0, cl: 0, un: 0 };
    Object.keys(defaults).forEach(attr => {
        const value = run[attr] == null ? (cell[attr] == null ? defaults[attr] : cell[attr]) : run[attr];
        font[attr] = ["bl", "it", "cl", "un"].includes(attr) ? (value === true || Number(value) > 0 ? 1 : 0) : value;
    });
    font.ff = getFontName(font.ff);
    font.fs = Number(font.fs) > 0 ? Number(font.fs) : Store.defaultFontSize;
    font.v = run.v;
    return font;
}

// CSS 颜色与工作簿颜色可能分别使用 RGB、短十六进制和完整十六进制。
function getColorKey(color) {
    const value = String(color).replace(/\s/g, "").toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(value)) return "#" + value.slice(1).split("").map(item => item + item).join("");
    const rgb = /^rgba?\((\d+),(\d+),(\d+)(?:,1)?\)$/.exec(value);
    return rgb ? "#" + rgb.slice(1, 4).map(item => Number(item).toString(16).padStart(2, "0")).join("") : value;
}

export function getFontState(fonts) {
    if (!fonts.length) fonts = [getCellFont(null)];
    const state = {};
    const names = new Map();
    fonts.forEach(font => names.set(getFontKey(font.ff), names.get(getFontKey(font.ff)) || font.ff));
    state.ff = [...names.values()];
    ["fs", "fc", "bl", "it", "cl", "un"].forEach(attr => {
        const values = fonts.map(font => attr === "fc" ? getColorKey(font[attr]) : String(font[attr]).toLowerCase());
        state[attr] = values.every(value => value === values[0])
            ? fonts[0][attr] : null;
    });
    return state;
}
