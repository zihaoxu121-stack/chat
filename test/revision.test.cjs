const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {parseHandbook}=require('../src/handbook.cjs'),{Store}=require('../src/store.cjs'),{Service,classifyCommand}=require('../src/service.cjs'),{mockAPI}=require('./fixture.cjs');
const book=`聊天任务说明（2026-11-16）
一、任务
只拟稿。
二、边界
不要代发。
三、本人档案
- 仅测试的本人资料标记。
四、推进
正常聊熟。
五、流程
认不出先问。
六、判断
证据不足不定性。
七、拟稿
需要三版，主推时一版。
八、平台
按界面识别。
九、人物台账
Soul
- 测试甲（老师甲）：住在测试城。她说有心事——不要追问。租房是最后的话题。
- 测试乙：留了口，没放弃这条线。
- 测试丙：用户已说不聊了，永不主动提及。
微信
- 测试丁（微信名：另一个昵称）：回复短，决定不再主动。除非她主动来聊。
十、红线
11. 对已标记的人主动拟追聊稿（测试丙、测试丁）。
十一、维护
他纠正过的事实（测试甲住在测试城），要记清。
十二、自检
确认身份。
十三、示例
测试甲秘密，不得加入通用提示词。
十四、快照
- 最活跃：测试甲。
- 休眠：测试乙。`;
function setup(){const store=new Store(fs.mkdtempSync(path.join(os.tmpdir(),'draft-revision-'))),c=store.saveContact({platform:'微信',nickname:'测试联系人',facts:[]});let calls=0;const svc=new Service(store,async msgs=>{calls++;return mockAPI(msgs)});return {store,c,svc,calls:()=>calls}}
const source={text:'我：今天下班了\n对方：今天小朋友闹了一天，下班了',images:[]};
test('说明书导入：平台严格分隔、别名、五种状态、否定“没放弃”不误归档',()=>{const b=parseHandbook(book);assert.equal(b.contacts.length,4);assert.equal(b.contacts[0].status,'active');assert.equal(b.contacts[1].status,'dormant');assert.equal(b.contacts[2].status,'abandoned');assert.equal(b.contacts[3].status,'parked');assert.equal(b.contacts[3].nickname,'另一个昵称');assert(b.contacts[3].aliases.includes('测试丁'));assert.equal(b.contacts[0].platform,'Soul');assert.equal(b.contacts[3].platform,'微信');assert(b.userProfile.includes('本人资料标记'));assert(!b.handbookRules.includes('测试甲'));assert(!b.handbookRules.includes('测试丙'));assert(!b.handbookRules.includes('秘密'));assert(b.contacts[0].background.includes('不要追问'));assert(b.contacts[0].facts.every(f=>f.date==='2026-11-16'))});
test('说明书重复导入合并本机档案，不重复建人、不覆盖API Key',()=>{const {store}=setup();store.data.settings.encryptedKey='encrypted-local-only';const b=parseHandbook(book);assert.equal(store.importHandbook(b).added,4);assert.equal(store.importHandbook(b).merged,4);assert.equal(store.data.contacts.length,5);assert.equal(store.data.settings.encryptedKey,'encrypted-local-only');assert(!store.publicState().settings.encryptedKey);assert(fs.readdirSync(store.dir).some(p=>p.startsWith('before-import-')))});
test('怎么回只给一版；补齐追加两版保留原稿；还有吗只追加一版',async()=>{const {svc,c,calls}=setup();const s=await svc.create({source,contactId:c.id,confirmed:true,mode:'recommend'});await svc.generate(s.id);assert.equal(s.variants.length,1);const first=structuredClone(s.variants[0]);await svc.generate(s.id,'complete');assert.equal(s.variants.length,3);assert.deepEqual(s.variants[0],first);await svc.generate(s.id,'extra');assert.equal(s.variants.length,4);assert.equal(calls(),6)});
test('完全相同的输入只打开已有草稿，不重复调用模型；不同联系人不复用',async()=>{const {svc,c,calls,store}=setup();const s=await svc.create({source,contactId:c.id,confirmed:true});await svc.generate(s.id);const before=calls();const duplicate=await svc.create({source,contactId:c.id,confirmed:true});assert.equal(duplicate.id,s.id);assert.equal(duplicate.duplicate,true);assert.equal(calls(),before);const other=store.saveContact({platform:'Soul',nickname:'测试联系人'});const fresh=await svc.create({source,contactId:other.id,confirmed:true});assert.notEqual(fresh.id,s.id);assert(!fresh.duplicate)});
test('换话题创建独立历史，保留原稿和已确认消息；不重新问人',async()=>{const {svc,c,store}=setup();const old=await svc.create({source,contactId:c.id,confirmed:true});await svc.generate(old.id);const text=JSON.stringify(old.variants);const changed=await svc.rewrite(old.id,'换个话题');assert.equal(changed.parentSessionId,old.id);assert.equal(changed.variants.length,3);assert.equal(changed.contactId,old.contactId);assert.deepEqual(changed.source,old.source);assert.equal(JSON.stringify(old.variants),text);assert.equal(store.data.sessions.length,2)});
test('停泊/放弃阻止主动追聊，只有明确对方主动时允许停泊回复',async()=>{const {svc,c,store}=setup();store.saveContact({...c,status:'parked'});await assert.rejects(()=>svc.create({source,contactId:c.id,confirmed:true}),/停泊/);const s=await svc.create({source,contactId:c.id,confirmed:true,theyInitiated:true});assert(s.id);store.saveContact({...store.contact(c.id),status:'abandoned'});await assert.rejects(()=>svc.create({source,contactId:c.id,confirmed:true,theyInitiated:true}),/已放弃/);const r=await svc.recognize(source);assert(!r.suggestedId)});
test('台账新事实必须引用真实对方原文，确认前不进模型事实；纠正后下一稿读取新事实',async()=>{const {svc,c,store}=setup();const s=await svc.create({source,contactId:c.id,confirmed:true});await svc.generate(s.id);store.recordMemory(s,{topic:'工作',facts:[{text:'有明确来源的待核对信息',evidence:'今天小朋友闹了一天，下班了'},{text:'无中生有的资料',evidence:'她没有说过'}]});assert.equal(store.contact(c.id).pendingFacts.length,1);assert.equal(store.contact(c.id).facts.length,0);let sent='';svc.api=async msgs=>{sent+=JSON.stringify(msgs);return mockAPI(msgs)};await svc.generate(s.id,'extra');assert(!sent.includes('有明确来源的待核对信息'));const fact=store.contact(c.id).pendingFacts[0];store.resolveFact(c.id,fact.id,true);assert.equal(store.contact(c.id).facts.length,1);assert.equal(store.contact(c.id).pendingFacts.length,0);sent='';await svc.rewrite(s.id,'幽默一点');assert(sent.includes('有明确来源的待核对信息'));assert.equal(s.contactSnapshot.facts.length,0)});
test('修改档案平台后，旧轮次不能继续生成；四信号不接受不存在的证据',async()=>{const {svc,c,store}=setup();const s=await svc.create({source,contactId:c.id,confirmed:true});await svc.generate(s.id);assert.equal(s.analysis.signals.length,4);assert.equal(s.analysis.signals.find(x=>x.kind==='shares').level,'strong');assert(s.analysis.signals.filter(x=>x.kind!=='shares').every(x=>x.level==='unknown'));store.saveContact({...store.contact(c.id),platform:'Soul'});await assert.rejects(()=>svc.generate(s.id,'extra'),/身份已修改/)});
test('简短指令按意思路由，不纠错原输入',()=>{assert.equal(classifyCommand('再来一碗'),'extra');assert.equal(classifyCommand('再来一般'),'extra');assert.equal(classifyCommand('一般'),'extra');assert.equal(classifyCommand('发薪的'),'extra');assert.equal(classifyCommand('怎么回'),'recommend');assert.equal(classifyCommand('补齐三版'),'complete');assert.equal(classifyCommand('换个话题'),'rewrite')});
test('明确事实更正经用户确认后替换旧事实，重复截图不能复用旧档案的草稿',async()=>{const {svc,c,store}=setup();store.saveContact({...c,facts:[{text:'原有错误记录',date:'2026-11-15'}]});const s=await svc.create({source,contactId:c.id,confirmed:true});await svc.generate(s.id);store.recordMemory(s,{facts:[{text:'已更正的新记录',replaces:'原有错误记录',evidence:'今天小朋友闹了一天，下班了'}]});const candidate=store.contact(c.id).pendingFacts[0];assert.equal(candidate.replaces,'原有错误记录');store.resolveFact(c.id,candidate.id,true);assert(!store.contact(c.id).facts.some(x=>x.text==='原有错误记录'));assert(store.contact(c.id).facts.some(x=>x.text==='已更正的新记录'));const next=await svc.create({source,contactId:c.id,confirmed:true});assert.notEqual(next.id,s.id);assert(!next.duplicate);assert(s.contactSnapshot.facts.some(x=>x.text==='原有错误记录'))});
test('重导旧说明书不会恢复已停泊/放弃的人，也不把已更正的旧事实重新加回来',()=>{const {store}=setup();const b=parseHandbook(book);store.importHandbook(b);let c=store.data.contacts.find(c=>c.nickname==='测试甲');const old=c.facts[0].text;store.saveContact({...c,status:'parked',facts:[{text:'用户确认的新资料',date:'2026-11-16',replaces:old}]});store.importHandbook(b);c=store.contact(c.id);assert.equal(c.status,'parked');assert(!c.facts.some(f=>f.text===old));assert(c.facts.some(f=>f.text==='用户确认的新资料'))});
