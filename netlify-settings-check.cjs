const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {createHash,randomBytes}=require('node:crypto');
const state={employees:[{id:1,name:'موظف اختبار'}],favorites:[],categories:['الموظفون'],logs:[{date:'2026-10-08',msg:'تحديث',username:'admin',userName:'مسؤول'}],users:[{id:1,name:'مسؤول',username:'admin',role:'sysadmin',password:'synthetic-test-password'},{id:2,name:'مشرف',username:'supervisor',role:'supervisor',password:'synthetic-supervisor-password'}]};
const stores=new Map([['wamy-directory-data',new Map([['directory-state',state]])],['wamy-directory-sessions',new Map()]]);
const getStore=({name})=>({get:async key=>stores.get(name).get(key),setJSON:async(key,value)=>stores.get(name).set(key,value),delete:async key=>stores.get(name).delete(key)});
let source=fs.readFileSync('netlify/functions/directory-api.mjs','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^const require = .*;\r?\n/m,'').replace(/^const bundledSeed = .*;\r?\n/m,'const bundledSeed={};\n').replace('export default async function handler','async function handler').replace('export const config','const config');
const context=vm.createContext({console,getStore,createHash,randomBytes,Response,Request,URL,process:{env:{}}});vm.runInContext(source,context);
const request=(path,token)=>new Request('https://directory.example.test'+path,{headers:token?{cookie:'wamy_session='+token}:{}});
(async()=>{
 const handler=vm.runInContext('handler',context);
 assert.equal((await handler(request('/api/backup'))).status,403);
 for(const [token,userId,username] of [['admin-session',1,'admin'],['supervisor-session',2,'supervisor']])stores.get('wamy-directory-sessions').set(createHash('sha256').update(token).digest('hex'),{userId,username,expiresAt:Date.now()+60000});
 assert.equal((await handler(request('/api/backup','supervisor-session'))).status,403);
 const exported=await handler(request('/api/backup','admin-session'));assert.equal(exported.status,200);assert.equal(exported.headers.get('cache-control'),'no-store');const backup=await exported.json();assert.equal(backup.data.users[0].password,'synthetic-test-password');assert.equal(backup.data.logs[0].username,'admin');
 const publicData=await (await handler(request('/api/data'))).json();assert.equal(Object.hasOwn(publicData.data.users[0],'password'),false);
 console.log('PASS: full backup restricted to system administrator; public data excludes account passwords');
})().catch(error=>{console.error(error);process.exitCode=1});
