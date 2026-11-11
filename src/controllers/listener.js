/**
 * Monitor special variables
 */
import {createProxy} from '../utils/util';
import Store from '../store/index';
import method from '../global/method';
import { getluckysheetfile } from '../methods/get'
import { toJson } from '../global/api';

let undoTimer,redoTimer;
function undoAccessible(len) {
    const workbookVersion = Store.workbookVersion; // 记下这次撤销按钮更新属于哪张表，等待结束后还要核对一次。
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
        if (workbookVersion !== Store.workbookVersion) return; // 如果工作簿已换过，就不再用旧的撤销记录更新按钮。
        $('#luckysheet-icon-undo')[len ? 'removeClass' : 'addClass']('disabled');
    }, 10);
}
function redoAccessible(len) {
    const workbookVersion = Store.workbookVersion; // 记下这次重做按钮更新的归属，避免旧任务改变新表格的按钮状态。
    clearTimeout(redoTimer);
    redoTimer = setTimeout(() => {
        if (workbookVersion !== Store.workbookVersion) return; // 如果工作簿已换过，就不再用旧的重做记录更新按钮。
        $('#luckysheet-icon-redo')[len ? 'removeClass' : 'addClass']('disabled');
    }, 10);
}

const initListener = function(){
    const workbookVersion = Store.workbookVersion; // 这批数据监听都属于当前工作簿，后续重建时应整体失效。
    // createProxy(Store,['jfredo']);
    createProxy(Store, 'jfredo',(target, property, val, receiver)=>{
        if (workbookVersion !== Store.workbookVersion) return; // 旧表格的编辑通知到这里结束，避免把旧操作交给新表格的事件处理。
        if (property !== 'length') {
            //  钩子函数
            method.createHookFunction('updated',val)
        }
        undoAccessible(Store.jfredo.length);
    } );
    createProxy(Store, 'jfundo',(target, property, val, receiver)=>{
        if (workbookVersion !== Store.workbookVersion) return; // 旧撤销记录的变化不再读取全局数据，也不再触发按钮更新。
        redoAccessible(Store.jfundo.length);
    } );
    


    createProxy(Store, 'asyncLoad', (target, property, val, receiver)=>{
        if (workbookVersion !== Store.workbookVersion) return; // 旧加载完成通知不能继续序列化工作簿；这正是之前空数据上调用 forEach 的入口。
        if(property === 'length' && val === 0){
            method.createHookFunction('workbookCreateAfter', toJson())
        }
    })
}

export {
    initListener
}