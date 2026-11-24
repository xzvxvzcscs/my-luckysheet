import formula from "./formula";
import Store from "../store";
import server from "../controllers/server";

// Keep the original text as well: deleting a referenced cell produces #REF!,
// which cannot be reversed by simply shifting the resulting formula back.
export function collectStructuralFormulaChanges(targetSheetIndex, type, rc, orient, start, count) {
    const changes = [];
    for (const sheet of Store.luckysheetfile) {
        if (String(sheet.index) == String(targetSheetIndex)) continue;
        const visit = (cell, r, c) => {
            if (!cell || !cell.f) return;
            const after = "=" + formula.functionStrChange(cell.f, type, rc, orient, start, count, {
                formulaSheetIndex: sheet.index,
                targetSheetIndex,
            });
            if (after != cell.f) changes.push({ index: sheet.index, r, c, before: cell.f, after });
        };
        if (sheet.data) {
            // Scan formula cells as well as calcChain: imported workbooks may not
            // have registered every formula in the calculation chain yet.
            sheet.data.forEach((row, r) => row && row.forEach((cell, c) => visit(cell, r, c)));
        } else {
            (sheet.celldata || []).forEach(cell => visit(cell.v, cell.r, cell.c));
        }
    }
    return changes;
}

export function applyStructuralFormulaChanges(changes = [], undo = false) {
    for (const change of changes) {
        const sheet = Store.luckysheetfile.find(file => String(file.index) == String(change.index));
        if (!sheet) continue;
        const cell = sheet.data
            ? sheet.data[change.r] && sheet.data[change.r][change.c]
            : ((sheet.celldata || []).find(cell => cell.r == change.r && cell.c == change.c) || {}).v;
        if (!cell) continue;
        cell.f = undo ? change.before : change.after;
        if (String(sheet.index) == String(Store.currentSheetIndex) && sheet.data) {
            Store.flowdata = sheet.data;
        }
        server.saveParam("v", sheet.index, cell, { r: change.r, c: change.c });
    }
}

export function recalculateStructuralFormulas() {
    // A structural edit can also affect dependents whose formula text did not
    // change, so rebuild dependencies and calculate in dependency order.
    formula.execFunctionGlobalData = {};
    formula.cellTextToIndexList = {};
    formula.groupValuesRefreshData = [];
    formula.execFunctionGroupForce(true);
    formula.groupValuesRefresh();
    formula.execFunctionGlobalData = null;
}
