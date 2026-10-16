import { getObjType } from "../utils/util";
import { isRealNull, isRealNum, valueIsError } from "./validate";
import { genarate, update, bankerRound } from "./format";
import server from "../controllers/server";
import luckysheetConfigsetting from "../controllers/luckysheetConfigsetting";
import Store from "../store/index";

//Set cell value
function setcellvalue(r, c, d, v, sheetOrder) {
    if (d == null) {
        d = Store.flowdata;
    }
    // 若采用深拷贝，初始化时的单元格属性丢失
    let cell = d[r][c];
    let vupdate;

    // 新增：检测是否为超长数字字符串（整数部分 ≥ 16 位或总有效数字 ≥ 16
    // 日期输入先按序列处理，避免大数精度分支提前覆盖日期格式。
    const dateInput = typeof v === 'string' && luckysheetConfigsetting.hook && typeof luckysheetConfigsetting.hook.cellValueFormat === 'function'
        ? luckysheetConfigsetting.hook.cellValueFormat(v, cell, true, r, c, sheetOrder)
        : null;
    const isLongNum = dateInput == null && typeof v === 'string' && /^-?\d+\.?\d*$/.test(v) && v.replace('-', '').replace('.', '').length > 16;
    if (isLongNum) {
        // 获取保留小数位数（从配置读取，默认2）
        let precision = (luckysheetConfigsetting.accuracy !== undefined) 
                        ? parseInt(luckysheetConfigsetting.accuracy, 10) 
                        : 2;
        let fmt = "0." + "0".repeat(Math.max(0, precision));
        let rounded = bankerRound(v, precision);
        
        // 确保 cell 为对象
        if (cell == null || typeof cell !== 'object') {
            cell = {};
            d[r][c] = cell;
        }
        // 保存原始精确字符串
        cell.raw = v;
        // 存储近似数字作为 v（保持原有逻辑兼容性）
        // cell.v = parseFloat(v);
        cell.v = v;
        cell.m = rounded;
        cell.ct = { fa: fmt, t: "n" };
        d[r][c] = cell;
        return cell;
    }

    if (getObjType(v) == "object") {
        if (cell == null) {
            cell = v;
        } else {
            if (v.f != null) {
                cell.f = v.f;
            } else if (cell.hasOwnProperty("f")) {
                delete cell.f;
            }

            if (v.spl != null) {
                cell.spl = v.spl;
            }

            if (v.ct != null) {
                cell.ct = v.ct;
            }
        }

        if (getObjType(v.v) == "object") {
            vupdate = v.v.v;
        } else {
            vupdate = v.v;
        }
    } else {
        vupdate = v;
    }

    // fix #81， vupdate = ''
    if (vupdate == null) {
        if (getObjType(cell) == "object") {
            delete cell.m;
            delete cell.v;
        } else {
            cell = null;
        }

        d[r][c] = cell;

        return cell;
    }

    // 如果 cell 是对象且含有 ct，则标记保留格式
    let hasCt = cell && getObjType(cell) === "object" && cell.ct;
    if ((isRealNull(cell) || ((getObjType(cell) === "string" || getObjType(cell) === "number") && cell === v)) && !hasCt) {
        cell = {};
    }
    // 如果 cell 被重置为 {} 但原对象有 ct，则恢复
    if (hasCt && cell && !cell.ct) {
        cell.ct = hasCt;
    }

    // 日期格式的写值与显示分开处理，业务钩子未处理时继续使用原生逻辑。
    if (luckysheetConfigsetting.hook && typeof luckysheetConfigsetting.hook.cellValueFormat === 'function') {
        const dateValue = dateInput || luckysheetConfigsetting.hook.cellValueFormat(vupdate, cell, typeof v === 'string', r, c, sheetOrder);
        if (dateValue != null) {
            cell.v = dateValue.v;
            cell.m = dateValue.m;
            cell.ct = dateValue.ct;
            d[r][c] = cell;
            return cell;
        }
    }

    let vupdateStr = vupdate.toString();

    if (vupdateStr.substr(0, 1) == "'") {
        cell.m = vupdateStr.substr(1);
        cell.ct = { fa: "@", t: "s" };
        cell.v = vupdateStr.substr(1);
        cell.qp = 1;
    } else if (cell.qp == 1) {
        cell.m = vupdateStr;
        cell.ct = { fa: "@", t: "s" };
        cell.v = vupdateStr;
    } else if (vupdateStr.toUpperCase() === "TRUE") {
        cell.m = "TRUE";
        cell.ct = { fa: "General", t: "b" };
        cell.v = true;
    } else if (vupdateStr.toUpperCase() === "FALSE") {
        cell.m = "FALSE";
        cell.ct = { fa: "General", t: "b" };
        cell.v = false;
    } else if (vupdateStr.substr(-1) === "%" && isRealNum(vupdateStr.substring(0, vupdateStr.length - 1))) {
        cell.ct = { fa: "0%", t: "n" };
        cell.v = vupdateStr.substring(0, vupdateStr.length - 1) / 100;
        cell.m = vupdate;
    } else if (valueIsError(vupdate)) {
        cell.m = vupdateStr;
        if (cell.ct != null) {
            cell.ct.t = "e";
        } else {
            cell.ct = { fa: "General", t: "e" };
        }
        cell.v = vupdate;
    } else {
        if (
            cell.f != null &&
            isRealNum(vupdate) &&
            !/^\d{6}(18|19|20)?\d{2}(0[1-9]|1[12])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i.test(vupdate)
        ) {
            cell.v = parseFloat(vupdate);
            // 若当前无格式或格式为 General，则应用默认数字格式
            if (cell.ct == null || cell.ct.fa === "General") {
                // 从配置读取保留小数位数（默认 2）
                const accuracy = (luckysheetConfigsetting.accuracy !== undefined) 
                                ? parseInt(luckysheetConfigsetting.accuracy, 10) 
                                : 2;
                // 构造格式字符串，例如 "0.00"
                const fmt = "0." + "0".repeat(Math.max(0, accuracy));
                cell.ct = { fa: fmt, t: "n" };
            }
            
            // 使用当前格式生成显示值（若格式变化，会触发银行家舍入）
            let v_p = Math.round(cell.v * 1000000000) / 1000000000;
            if (cell.ct == null) {
                let mask = genarate(v_p);
                cell.m = mask[0].toString();
            } else {
                let mask = update(cell.ct.fa, v_p);
                cell.m = mask.toString();
            }

        } else if (cell.ct != null && cell.ct.fa == "@") {
            cell.m = vupdateStr;
            cell.v = vupdate;
        } else if (cell.ct != null && cell.ct.fa != null && cell.ct.fa != "General") {
            if (isRealNum(vupdate)) {
                vupdate = parseFloat(vupdate);
            }
            let mask = update(cell.ct.fa, vupdate);
            if (mask === vupdate) {
                //若原来单元格格式 应用不了 要更新的值，则获取更新值的 格式
                mask = genarate(vupdate);
                cell.m = mask[0].toString();
                cell.ct = mask[1];
                cell.v = mask[2];
            } else {
                cell.m = mask.toString();
                cell.v = vupdate;
            }
        } else {
            if (
                isRealNum(vupdate) &&
                !/^\d{6}(18|19|20)?\d{2}(0[1-9]|1[12])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i.test(vupdate)
            ) {
                if (typeof vupdate === "string") {
                    let flag = vupdate.split("").every((ele) => ele == "0" || ele == ".");
                    // 1.1111111111111111 as an example, numbers within 18 characters need to be converted to numbers
                    if (flag || vupdate.length < 18) {
                        vupdate = parseFloat(vupdate);
                    }
                }
                cell.v = vupdate; /* 备注：如果使用parseFloat，1.1111111111111111会转换为1.1111111111111112 ? */
                cell.ct = { fa: "General", t: "n" };
                if (cell.v == Infinity || cell.v == -Infinity) {
                    cell.m = cell.v.toString();
                } else {
                    let mask = genarate(cell.v);

                    cell.m = mask[0].toString();
                }
            } else {
                let mask = genarate(vupdate);

                cell.m = mask[0].toString();
                cell.ct = mask[1];
                cell.v = mask[2];
            }
        }
    }

    if (!server.allowUpdate && !luckysheetConfigsetting.pointEdit) {
        if (
            cell.ct != null &&
            /^(w|W)((0?)|(0\.0+))$/.test(cell.ct.fa) == false &&
            cell.ct.t == "n" &&
            cell.v != null &&
            parseInt(cell.v).toString().length > 4
        ) {
            let autoFormatw = luckysheetConfigsetting.autoFormatw.toString().toUpperCase();
            let accuracy = luckysheetConfigsetting.accuracy;

            let sfmt = setAccuracy(autoFormatw, accuracy);

            if (sfmt != "General") {
                cell.ct.fa = sfmt;
                cell.m = update(sfmt, cell.v);
            }
        }
    }

    d[r][c] = cell;
    return cell;
}

//new runze 根据亿万格式autoFormatw和精确度accuracy 转换成 w/w0/w0.00 or 0/0.0格式
function setAccuracy(autoFormatw, accuracy) {
    let acc = "0.";
    let fmt;

    if (autoFormatw == "TRUE") {
        if (accuracy == undefined) {
            return "w";
        } else {
            let alength = parseInt(accuracy);

            if (alength == 0) {
                return "w0";
            } else {
                acc = "w0.";

                for (let i = 0; i < alength; i++) {
                    acc += "0";
                }

                fmt = acc;
            }
        }
    } else {
        if (accuracy == undefined) {
            return "General";
        } else {
            let alength = parseInt(accuracy);

            if (alength == 0) {
                return "0";
            } else {
                for (let i = 0; i < alength; i++) {
                    acc += "0";
                }

                fmt = acc;
            }
        }
    }

    return fmt.toString();
}

export { setcellvalue, setAccuracy };
