const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
class Store {
 constructor(dir){this.dir=dir;fs.mkdirSync(dir,{recursive:true});this.file=path.join(dir,'data.json');this.data={schema:1,contacts:[],sessions:[],settings:{baseURL:'https://api.openai.com/v1',model:'',customPrompt:'',userProfile:''}};
 if(fs.existsSync(this.file)){try{this.data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(this.data.schema!==1||!Array.isArray(this.data.contacts)||!Array.isArray(this.data.sessions)||!this.data.settings)throw Error();}catch{throw new Error('本地数据文件损坏。原文件已保留，请从备份恢复；软件不会覆盖它。')}}}
 save(){const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(this.data),{mode:0o600});fs.renameSync(tmp,this.file);}
 contact(id){const c=this.data.contacts.find(c=>c.id===id);if(!c)throw Error('联系人不存在，请重新选择');return c;}
 saveContact(input){const c={id:input.id||crypto.randomUUID(),platform:String(input.platform||'').trim().slice(0,30),nickname:String(input.nickname||'').trim().slice(0,80),avatar:String(input.avatar||'').slice(0,300),facts:Array.isArray(input.facts)?input.facts.map(f=>({text:String(f.text).trim().slice(0,500),date:String(f.date).slice(0,10)})).filter(f=>f.text):[],taboos:String(input.taboos||'').slice(0,3000),stage:String(input.stage||'刚认识').slice(0,60),style:String(input.style||'').slice(0,2000)};
 if(!c.platform||!c.nickname)throw Error('请填写平台和昵称');if(this.data.contacts.some(x=>x.id!==c.id&&x.platform===c.platform&&x.nickname===c.nickname&&x.avatar===c.avatar))throw Error('相同平台、昵称、头像备注的联系人已存在，请补充区别');
 const i=this.data.contacts.findIndex(x=>x.id===c.id);if(i<0)this.data.contacts.push(c);else this.data.contacts[i]=c;this.save();return c;}
 session(id){const s=this.data.sessions.find(s=>s.id===id);if(!s)throw Error('历史不存在');return s;}
 addSession(contactId,source,recognition){const c=this.contact(contactId);const s={id:crypto.randomUUID(),created:new Date().toISOString(),contactId:c.id,contactSnapshot:structuredClone(c),source:structuredClone(source),recognition:structuredClone(recognition||{}),analysis:null,variants:[],attempts:0};this.data.sessions.unshift(s);this.save();return s;}
 publicState(){return {contacts:this.data.contacts,sessions:this.data.sessions.map(({source,...s})=>({...s,imageCount:source.images?.length||0,textPreview:source.text.slice(0,100)})),settings:{baseURL:this.data.settings.baseURL,model:this.data.settings.model,customPrompt:this.data.settings.customPrompt||'',userProfile:this.data.settings.userProfile||'',hasKey:!!this.data.settings.encryptedKey},dataDir:this.dir};}
}
module.exports={Store};
