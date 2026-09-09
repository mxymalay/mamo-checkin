import {isClosedPageError,pageError} from './login-state.js';

export function userError(error,site='操作'){
 const raw=typeof error==='string'?error:error?.message||'';
 if(isClosedPageError(raw))return pageError(new Error(raw),site==='操作'?'网站':site).message;
 if(/Extension context invalidated|Receiving end does not exist|Could not establish connection|message (?:port|channel).*closed/i.test(raw))return '助手连接已失效。请关闭助手页面，从 Chrome 扩展图标重新打开后重试。';
 if(/Cannot access|Missing host permission|permission.*denied|not allowed to access/i.test(raw))return `${site} 读取权限不足。请在 Chrome 扩展管理中允许助手访问对应网站，然后重试。`;
 if(/No frame with id|Frame.*(?:removed|not found)|document.*unloaded|frame.*detached/i.test(raw))return `${site} 页面在读取期间发生跳转。请等待页面加载完成后重试。`;
 if(/Failed to fetch|NetworkError|net::ERR_|fetch failed/i.test(raw))return `${site} 网络连接失败。请检查网络及学校网站是否可以打开，然后重试。`;
 if(/QUOTA_BYTES|quota.*exceeded|disk.*full/i.test(raw))return '本机存储空间不足，未能保存数据。请释放空间后重试，不要卸载扩展或清空签到记录。';
 if(/timeout|timed out|AbortError/i.test(raw))return `${site} 响应超时，结果尚未确认。请检查网站或识别服务后重试；若已经提交签到，请先核对学校网站记录。`;
 if(!raw)return '操作失败，未返回错误详情。请重新打开助手后重试；若已提交签到，请先核对学校网站记录。';
 // Keep actionable application messages, including login markers, intact.
 if(/[\u3400-\u9fff]/.test(raw))return raw;
 return `${site} 未能完成。请重试；若已提交签到，请先核对学校网站记录。诊断信息：${raw}`;
}
