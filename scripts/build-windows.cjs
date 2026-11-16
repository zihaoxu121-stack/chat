const fs=require('node:fs');const path=require('node:path');const cp=require('node:child_process');const {build,Platform,Arch}=require('electron-builder');
(async()=>{
 const root=path.resolve(__dirname,'..');process.chdir(root);
 if(!process.argv.includes('--existing'))await build({targets:Platform.WINDOWS.createTarget(['dir'],Arch.x64)});
 const PE=require('pe-library'),R=require('resedit');const file=path.join(root,'release/win-unpacked/聊天话术助手.exe');const exe=PE.NtExecutable.from(fs.readFileSync(file),{ignoreCert:true});const res=PE.NtExecutableResource.from(exe);
 const integrityBefore=res.entries.filter(e=>String(e.type)==='INTEGRITY'||String(e.type)==='ElectronAsar').map(e=>Buffer.from(e.bin).toString('hex'));
 const icons=R.Data.IconFile.from(fs.readFileSync(path.join(root,'build/icon.ico'))).icons.map(i=>i.data);const groups=R.Resource.IconGroupEntry.fromEntries(res.entries);for(const g of groups)R.Resource.IconGroupEntry.replaceIconsForResource(res.entries,g.id,g.lang,icons);
 for(const vi of R.Resource.VersionInfo.fromEntries(res.entries)){vi.setFileVersion(1,0,0,0,1033);vi.setProductVersion(1,0,0,0,1033);vi.setStringValues({lang:1033,codepage:1200},{ProductName:'聊天话术助手',FileDescription:'聊天话术助手',CompanyName:'Chat Draft',OriginalFilename:'聊天话术助手.exe',InternalName:'ChatDraftAssistant'});vi.outputToResourceEntries(res.entries)}
 res.outputResource(exe);const buffer=Buffer.from(exe.generate());const check=PE.NtExecutableResource.from(PE.NtExecutable.from(buffer));for(const data of integrityBefore)if(!check.entries.some(e=>Buffer.from(e.bin).toString('hex')===data))throw Error('ASAR integrity resource lost');fs.writeFileSync(file,buffer);
 const tool=await require('app-builder-lib/out/toolsets/windows').getMakeNsisPath(null);const args=process.platform==='win32'?['/V3','windows.nsi']:['-V3','windows.nsi'];const result=cp.spawnSync(tool.path,args,{cwd:path.join(root,'build'),env:{...process.env,...tool.env},stdio:'inherit'});if(result.status!==0)throw Error('NSIS failed: '+result.status);
 console.log('Windows installer built. No Wine required.');
})().catch(e=>{console.error(e);process.exitCode=1});
