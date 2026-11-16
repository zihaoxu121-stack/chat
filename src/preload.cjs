const {contextBridge,ipcRenderer}=require('electron');
const methods=['state','saveContact','settings','recognize','create','generate','session','copy','openData','backup','restore','rewrite','resolveFact','command','importPreview','importApply'];
if(process.argv.includes('--chatdraft-e2e'))methods.push('testSeed','testClipboard');
contextBridge.exposeInMainWorld('desktop',Object.fromEntries(methods.map(name=>[name,(...args)=>ipcRenderer.invoke(name,...args)])));
