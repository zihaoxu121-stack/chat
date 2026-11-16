const mockAPI=async messages=>{
 const system=messages[0].content;
 if(system.includes('你现在只做审稿'))return {ok:true,issues:[]};
 if(system.includes('聊天识别器'))return {platform:'微信',nickname:'小林',avatarClue:'树',evidence:'标题栏显示微信和小林',uncertain:false,messages:[{role:'self',text:'我刚下班，在地铁上'},{role:'them',text:'今天小朋友闹了一天，下班了'},{role:'self',text:'这一天挺费嗓子'},{role:'them',text:'对，有个小朋友一直追着问为什么，嗓子都哑了'}]};
 const context=JSON.parse(messages[1].content[0].text);
 const cold=context.metrics.restrained;
 const pairs=cold?[['嗯，今天话少点','我还在地铁上'],['嗯，知道了','地铁这会儿人还不少'],['今天也挺忙','我这边刚下班']]:[['今天这一班有点费劲','说说最让你头大的那个小场面'],['下班先缓口气','今天哪个小插曲让你记到现在'],['小朋友今天挺有精力','你一般怎么接住他们这些新花样']];
 const morePairs=[['这一天确实挺费嗓子','班里最近发生过什么小插曲'],['这会儿总算能歇口气','你们班今天哪句童言最有意思'],['下班路上还惦记着这一天','有哪件事让你到现在还想笑']];
 const selected=context.extra?morePairs.filter(b=>!context.previousDrafts.some(v=>v.bubbles.join('\n')===b.join('\n'))).slice(0,context.count):pairs.slice(0,context.count);
 return {analysis:{layer:'先聊她的日常，暂不跳到我们',signals:[{kind:'shares',level:'strong',evidence:'今天小朋友闹了一天，下班了'}],meaning:'对方刚下班',evidence:['提到下班与小朋友'],inference:['可能有些累，证据弱'],attitude:'本轮回复有细节',stage:'刚认识',strategy:'顺着工作日常聊'},memory:{topic:'下班与工作日常',progress:'本轮已分析，草稿不代表已发送',facts:[]},variants:selected.map((bubbles,i)=>({bubbles,angle:'角度'+(i+1)})),exhausted:false};
};module.exports={mockAPI};
