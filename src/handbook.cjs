// Generic, local-only importer. Never bundle a user's actual handbook in source or releases.
const STATES={active:'活跃',pending:'待回复',parked:'停泊',dormant:'休眠',abandoned:'已放弃'};
const strip=s=>s.replace(/[\s\p{P}\p{S}]/gu,'');
function parseHandbook(raw){
 if(typeof raw!=='string'||raw.length>300000)throw Error('说明书应为30万字以内的文本');
 const text=raw.replace(/^\uFEFF/,'').replace(/\r/g,'');const sections={};let key='';
 for(const line of text.split('\n')){const match=line.match(/^([一二三四五六七八九十]+)、/u);if(match){key=match[1];sections[key]='';}if(key)sections[key]+=line+'\n';}
 if(!sections['三']||!sections['七']||!sections['九'])throw Error('未找到“第三节本人档案、第七节规范、第九节人物台账”，请导入完整任务说明书');
 const date=text.match(/20\d{2}-\d{2}-\d{2}/)?.[0]||new Date().toISOString().slice(0,10);
 const userProfile=sections['三'].split('\n').slice(1).join('\n').trim();
 const handbookRules=['一','二','四','五','六','七','八','十','十二'].map(k=>sections[k]||'').join('\n').replace(/^11\.\s*对已标记的人.*$/mu,'已停泊或已放弃的联系人不得主动拟追聊稿。').trim();
 const contacts=[];let platform='';
 for(const line of sections['九'].split('\n')){
  if(/^(Soul|牵手|微信)\s*$/i.test(line)){platform=line.trim();continue;}
  if(!platform||!line.startsWith('- '))continue;
  const body=line.slice(2).trim();let colon=-1,depth=0;for(let i=0;i<body.length;i++){if('（('.includes(body[i]))depth++;if('）)'.includes(body[i]))depth--;if(depth===0&&'：:'.includes(body[i])){colon=i;break;}}
  if(colon<1)continue;const heading=body.slice(0,colon),notes=body.slice(colon+1).trim();
  const plain=heading.replace(/[（(].*?[）)]/gu,'').replace(/^[「“]|[」”]$/gu,'').trim();
  const wx=heading.match(/微信名[：:]\s*([^）)]+)/u)?.[1];const nickname=wx||plain;
  const aliases=[...new Set([plain,heading,wx].filter(s=>s&&s!==nickname))];
  const sentences=notes.split(/[。；\n]+/u).map(s=>s.trim()).filter(Boolean);
  const factText=sentences.filter(s=>!/(?:未明|未知|未确认|推测|可能|证据弱|不猜|不编|禁止|不许|不要|别再|别拿|别问|雷区|纪律|拟稿方向|除非|永不|不聊了|不再主动)/u.test(s));
  const taboos=sentences.filter(s=>/(?:禁止|不许|不要|别再|别拿|别问|雷区|纪律|除非|永不|不聊了|不再主动|别催|不追问|拒绝查户口)/u.test(s)).join('。');
  let status='pending';if(/不聊了|永不主动提及|已放弃|决定放弃/u.test(notes))status='abandoned';else if(/决定不再主动|不再给她拟追聊|已无联系|没再联系/u.test(notes))status='parked';
  contacts.push({platform,nickname,aliases,avatar:'',facts:factText.map(text=>({text,date})),background:notes,taboos,stage:/认识已久|熟人|聊熟了|热络期/u.test(notes)?'聊熟了':/开局|刚认识|新联系人/u.test(notes)?'刚认识':'暂不判断',style:sentences.filter(s=>/回复|短回|慢热|语音|热络|熟人/u.test(s)).join('。'),status,currentTopic:notes.match(/未闭合话题[：:]([^。]+)/u)?.[1]||notes.match(/([^。]+)是最后的话题/u)?.[1]||notes.match(/最后的话题[：:]([^。]+)/u)?.[1]||'',importedAt:date});
 }
 if(!contacts.length)throw Error('未能解析任何联系人，请检查台账格式');
 const snapshot=sections['十四']||'';
 for(const [prefix,status] of [['最活跃','active'],['待回复池','pending'],['休眠','dormant']]){
  const line=snapshot.split('\n').find(s=>s.startsWith('- '+prefix+'：'));if(!line)continue;
  for(const c of contacts){if(['parked','abandoned'].includes(c.status))continue;const name=strip(c.nickname);if(name.length>=2&&strip(line).includes(name)&&contacts.filter(x=>strip(x.nickname)===name).length===1)c.status=status;}
 }
 return {date,userProfile,handbookRules,contacts,counts:Object.fromEntries(['Soul','牵手','微信'].map(p=>[p,contacts.filter(c=>c.platform===p).length]))};
}
module.exports={parseHandbook,STATES};
