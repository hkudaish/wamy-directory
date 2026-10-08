const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replace(/init\(\);\s*$/,'');
const stored=new Map();
function createContext(){
 const elements=new Map(),events={};
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',style:{},classList:{contains:()=>false,add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){}});return elements.get(id)};
 const storage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)};
 const context=vm.createContext({console,localStorage:storage,sessionStorage:{...storage,getItem:()=>null},document:{getElementById:get,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener:(name,fn)=>events[name]=fn},location:{origin:'http://localhost',hostname:'localhost'},setTimeout,alert:msg=>{throw Error(msg)},fetch:()=>{throw Error('Unexpected network write')}});
 vm.runInContext(source,context);return {run:code=>vm.runInContext(code,context),get,context,events};
}
(async()=>{
 let app=createContext();
 const count=app.run('employees.length');
 app.run('renderHome()');const stats=app.get('stats').innerHTML;
 app.get('search').value='no-match-previous-query';assert.equal(app.run('filtered().length'),0);
 app.run("setCategory('الكل')");assert.equal(app.get('search').value,'');assert.equal(app.run('filtered().length'),count);
 app.get('search').value='old';app.get('adminSearch').value='old-admin';app.run("showPanel('favorites')");assert.equal(app.get('search').value,'');assert.equal(app.get('adminSearch').value,'');
 app.run('toggleFav(employees[0].id)');assert.equal(app.run('favorites.length'),1);assert.equal(app.run('employees.length'),count);assert.equal(app.get('stats').innerHTML,stats);assert.match(app.get('favResults').innerHTML,/aria-pressed="true"/);
 app.run("setCategory('المفضلة ★')");assert.equal(app.run('filtered().length'),1);
 app=createContext();assert.equal(app.run('favorites.length'),1);
 // Remote reads must preserve personal favorites; central saves keep legacy shared favorites.
 app.context.fetch=async()=>({ok:true,json:async()=>({success:true,data:{favorites:[]}})});
 assert.equal(await app.run('hydrateFromServerIfAvailable()'),true);assert.equal(app.run('favorites.length'),1);assert.equal(app.run('sharedFavorites.length'),0);
 let payload;app.context.capture=value=>payload=value;app.run('syncToServerIfAvailable=async payload=>{capture(payload);return true}');await app.run('save()');assert.equal(payload.favorites.length,0);
 app.run('toggleFav(employees[0].id)');assert.equal(app.run('favorites.length'),0);assert.match(app.get('favResults').innerHTML,/class="empty"/);
 app.get('search').value='restored';app.events.pageshow();assert.equal(app.get('search').value,'');
 for(const [label,tone] of [['الإدارة العليا','leadership'],['مديرو الإدارات','department'],['رؤساء الأقسام','section'],['رؤساء اللجان','committee'],['مديرو مكاتب الندوة','office'],['حراس الأمن','security']])assert.equal(app.run(`categoryTone(${JSON.stringify(label)})`),tone);
 console.log('PASS: search reset, favorites add/remove/reload/remote persistence, independent totals, semantic colors');
})().catch(error=>{console.error(error);process.exitCode=1});
