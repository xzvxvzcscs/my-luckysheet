import { getObjType } from '../utils/util';
import { getSheetIndex } from '../methods/get';
import Store from '../store';

//动态数组计算
function dynamicArrayCompute(dynamicArray) {
    let dynamicArray_compute = {};

    if(getObjType(dynamicArray) == "array"){
        for(let i = 0; i < dynamicArray.length; i++){
            let d_row = dynamicArray[i].r;
            let d_col = dynamicArray[i].c;
            let d_f = dynamicArray[i].f;
            
            if(Store.flowdata[d_row][d_col] != null && Store.flowdata[d_row][d_col].f != null && Store.flowdata[d_row][d_col].f == d_f){
                if((d_row + "_" + d_col) in dynamicArray_compute){
                    dynamicArray_compute = dynamicArraySpillEditCompute(dynamicArray_compute, d_row , d_col);
                }

                let d_data = dynamicArray[i].data;
                let d_rowlen = d_data.length;
                let d_collen = 1;

                if(getObjType(d_data[0]) == "array"){
                    d_collen = d_data[0].length;
                }

                if(dynamicArrayRangeIsAllNull({ "row": [d_row, d_row + d_rowlen - 1], "column": [d_col, d_col + d_collen - 1] }, Store.flowdata)){
                    for(let x = 0; x < d_rowlen; x++){
                        for(let y = 0; y < d_collen; y++){
                            let rowIndex = d_row + x;
                            let colIndex = d_col + y;

                            if(getObjType(d_data[0]) == "array"){
                                dynamicArray_compute[rowIndex + "_" + colIndex] = {"v": d_data[x][y], "r": d_row, "c": d_col};
                            }
                            else{
                                dynamicArray_compute[rowIndex + "_" + colIndex] = {"v": d_data[x], "r": d_row, "c": d_col};
                            }
                        }
                    }
                }
                else{
                    dynamicArray_compute[d_row + "_" + d_col] = {"v": "#SPILL!", "r": d_row, "c": d_col};
                }
            }
        }
    }

    return dynamicArray_compute;       
}

function dynamicArraySpillEditCompute(computeObj, r, c) {
    let rowIndex = computeObj[r + "_" + c].r;
    let colIndex = computeObj[r + "_" + c].c;

    for(let x in computeObj){
        if(x == (rowIndex + "_" + colIndex)){
            computeObj[x].v = "#SPILL!";
        }
        else if(computeObj[x].r == rowIndex && computeObj[x].c == colIndex){
            delete computeObj[x];
        }
    }

    return computeObj;
}

//范围是否都是空单元格(除第一个单元格)
function dynamicArrayRangeIsAllNull(range, data) {
    let r1 = range["row"][0], r2 = range["row"][1];
    let c1 = range["column"][0], c2 = range["column"][1];

    for(let r = r1; r <= r2; r++){
        const row = data[r];
        // 结果越过当前网格时按溢出冲突处理，避免重绘访问不存在的行列。
        if(!Array.isArray(row) || c1 < 0 || c2 >= row.length) return false;
        for(let c = c1; c <= c2; c++){
            // 发现占用后立即结束整个检查，保留原有溢出冲突提示。
            if(!(r == r1 && c == c1) && row[c] != null && row[c].v != null && row[c].v.toString() != "") return false;
        }
    }

    return true;
}

//点击表格区域是否属于动态数组区域
function dynamicArrayHightShow(r, c) {
    let dynamicArray = Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)]["dynamicArray"] == null ? [] : Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)]["dynamicArray"];
    let dynamicArray_compute = dynamicArrayCompute(dynamicArray);

    if((r + "_" + c) in dynamicArray_compute && dynamicArray_compute[r + "_" + c].v != "#SPILL!"){
        let d_row = dynamicArray_compute[r + "_" + c].r;
        let d_col = dynamicArray_compute[r + "_" + c].c;

        let d_f = Store.flowdata[d_row][d_col].f;

        let rlen, clen;
        for(let i = 0; i < dynamicArray.length; i++){
            if(dynamicArray[i].f == d_f){
                rlen = dynamicArray[i].data.length;

                if(getObjType(dynamicArray[i].data[0]) == "array"){
                    clen = dynamicArray[i].data[0].length;
                }
                else{
                    clen = 1;
                }
            }
        }

        let d_row_end = d_row + rlen - 1;
        let d_col_end = d_col + clen - 1;

        let row = Store.visibledatarow[d_row_end], 
            row_pre = d_row - 1 == -1 ? 0 : Store.visibledatarow[d_row - 1];
        let col = Store.visibledatacolumn[d_col_end], 
            col_pre = d_col - 1 == -1 ? 0 : Store.visibledatacolumn[d_col - 1];

        $("#luckysheet-dynamicArray-hightShow").css({ 
            "left": col_pre, 
            "width": col - col_pre - 1, 
            "top": row_pre, 
            "height": row - row_pre - 1, 
            "display": "block" 
        });
    }
    else{
        $("#luckysheet-dynamicArray-hightShow").hide();
    }
}

export {
    dynamicArrayCompute,
    dynamicArraySpillEditCompute,
    dynamicArrayRangeIsAllNull,
    dynamicArrayHightShow,
}