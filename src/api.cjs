function endpoint(base){let u;try{u=new URL(base)}catch{throw Error('API Base URL 格式错误')};if(u.username||u.password||u.search||u.hash)throw Error('Base URL 不可包含账号、查询参数或片段');if(u.protocol!=='https:' && !(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw Error('API 必须使用 HTTPS，本机服务可用 HTTP');return u.href.replace(/\/$/,'')+'/chat/completions';}
async function callAPI(settings,key,messages,{fetchImpl=fetch}={}){
 if(!key)throw Error('请先在设置中填写 API Key');if(!settings.model)throw Error('请先填写支持图片输入的模型名');
 let response;try{response=await fetchImpl(endpoint(settings.baseURL),{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:settings.model,messages}),signal:AbortSignal.timeout(90000)})}catch(e){if(e.name==='TimeoutError'||e.name==='AbortError')throw Error('模型请求超时（90秒），请稍后重试');throw Error('无法连接模型 API，请检查网络、Base URL 和证书；不允许重定向。')}
 if(!response.ok){if([401,403].includes(response.status))throw Error('API 认证失败（'+response.status+'）：请检查 Key、模型权限和 Base URL');if(response.status===429)throw Error('API 请求受限或额度不足（429），请稍后重试');if(response.status===400)throw Error('API 拒绝请求（400）：请检查模型名、图片输入支持及接口路径');throw Error('模型 API 错误（HTTP '+response.status+'），请稍后重试');}
 const raw=await response.text();if(raw.length>2000000)throw Error('模型返回内容过大');let obj;try{const body=JSON.parse(raw);const value=body.choices?.[0]?.message?.content;obj=JSON.parse(value?.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw Error('模型未返回合法 JSON，请更换支持 JSON 输出的模型或重试')};return obj;
}
function sourceContent(text,images,payload){return [{type:'text',text:JSON.stringify({...payload,chatText:text})},...images.map(url=>({type:'image_url',image_url:{url}}))]}
module.exports={endpoint,callAPI,sourceContent};
