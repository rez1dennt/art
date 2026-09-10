import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const payload={name:'Тест',email:'test@example.com',company:'',message:'Тестовая заявка',consent:true};
async function api(){assert.ok(existsSync('dist/assets/contact.mjs'),'Contact submission module missing');return import('../dist/assets/contact.mjs');}
test('Contact form sends JSON by POST and requires explicit confirmation',async()=>{
  const {submitContact}=await api();let request;
  const result=await submitContact(payload,{endpoint:'/api/contact',fetchImpl:async(url,options)=>{request={url,...options};return new Response(JSON.stringify({success:true}),{status:200,headers:{'Content-Type':'application/json'}});}});
  assert.equal(request.url,'/api/contact');assert.equal(request.method,'POST');assert.deepEqual(JSON.parse(request.body),payload);assert.equal(result.success,true);
});
test('HTTP errors and HTML fallback cannot become successful submissions',async()=>{
  const {submitContact}=await api();
  for(const response of [new Response('Not found',{status:404}),new Response('<html>fallback</html>',{status:200}),new Response('{"success":false}',{status:200})]){
    await assert.rejects(submitContact(payload,{endpoint:'/api/contact',fetchImpl:async()=>response}));
  }
});
test('A stalled submission times out instead of staying pending',async()=>{
  const {submitContact}=await api();
  await assert.rejects(submitContact(payload,{endpoint:'/api/contact',timeoutMs:10,fetchImpl:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))}));
});
test('Public form is ready for sending and favicon stays green in every theme',()=>{
  const html=readFileSync('dist/index.html','utf8');
  assert.ok(html.includes('Отправить заявку'),'Missing send button');
  assert.ok(html.includes('name="consent"'),'Missing explicit consent control');
  assert.ok(!html.includes('Скопировать обращение'),'Copy workflow must be removed');
  assert.ok(!html.includes('отправка ещё не подключена'),'No setup notices in form');
  assert.ok(!html.includes('favicon-light.png'),'No white favicon for dark theme');
});
