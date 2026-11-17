// Ejecutar dentro del backend aislado. stdin contiene únicamente el certificado público.
const https = require('node:https');
const { performance } = require('node:perf_hooks');
const { randomUUID } = require('node:crypto');
let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',async()=>{
 const result={scope:'Diez PATCH reales por gateway HTTPS y consulta de búsqueda por el mismo gateway; un alumno ficticio nuevo. No es garantía universal de latencia ni prueba de carga.',samples:[]};
 try{
  const {cert}=JSON.parse(input);const agent=new https.Agent({keepAlive:true,ca:cert,servername:'localhost'});
  async function call(path,method='GET',body,token,requestId){
   return new Promise((resolve,reject)=>{
    const headers={'X-Request-ID':requestId||randomUUID()};
    if(token)headers.Authorization='Bearer '+token;
    const data=body===undefined?null:JSON.stringify(body);
    if(data){headers['Content-Type']='application/json';headers['Content-Length']=Buffer.byteLength(data);}
    const req=https.request({hostname:'gateway',port:8443,servername:'localhost',path,method,agent,headers,timeout:10000},res=>{
     let text='';res.on('data',c=>text+=c);res.on('end',()=>{
      try{resolve({status:res.statusCode,body:JSON.parse(text),request_id:res.headers['x-request-id']});}catch{reject(Error('Respuesta inesperada'));}
     });
    });req.on('timeout',()=>req.destroy(Error('Timeout')));req.on('error',reject);req.end(data);
   });
  }
  const login=await call('/api/auth/login','POST',{email:process.env.LAB_EMAIL,password:process.env.LAB_PASSWORD});
  if(login.status!==201&&login.status!==200)throw Error('No se pudo autenticar');
  const token=login.body.access_token;
  const marker='Latencia '+randomUUID().replaceAll('-','').slice(0,8).toUpperCase().replace(/[0-9]/g,c=>String.fromCharCode(65+Number(c)));
  const created=await call('/api/students','POST',{firstName:marker,lastName:'Inicial',ci:String(Date.now())+'01',birthDate:'2000-01-01',biometricConsent:false},token);
  if(created.status!==201||!created.body.id)throw Error('No se pudo preparar alumno');
  const id=created.body.id;result.entity={entity_id:id,firstName:marker};
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  async function search(name){return call('/v2/search?'+new URLSearchParams({q:name,type:'student'}));}
  let initial=false;
  for(let i=0;i<60;i++){
   const r=await search(marker+' Inicial');
   if(r.status===200&&r.body.items.some(x=>x.entity_id===id)){initial=true;break;}
   await delay(500);
  }
  if(!initial)throw Error('El alumno inicial no apareció en búsqueda');
  for(let i=0;i<10;i++){
   await delay(200+(i*173)%850);
   const lastName='Cambio '+String.fromCharCode(65+i);const requestId='ca3-'+randomUUID();
   const at=new Date().toISOString();const start=performance.now();
   const changed=await call('/api/students/'+id,'PATCH',{lastName},token,requestId);const committed=performance.now();
   if(changed.status!==200)throw Error('PATCH fallido');
   let found=false,polls=0,limited=0;
   while(performance.now()-start<15000){
    const r=await search(marker+' '+lastName);polls++;
    if(r.status===429)limited++;
    else if(r.status!==200)throw Error('Consulta de búsqueda fallida');
    else if(r.body.items.some(x=>x.entity_id===id&&x.payload.name===marker+' '+lastName)){found=true;break;}
    await delay(300);
   }
   const observed=performance.now();
   result.samples.push({iteration:i+1,started_at:at,request_id:requestId,expected_name:marker+' '+lastName,patch_http:changed.status,found,search_http:found?200:null,polls,rate_limited_polls:limited,from_patch_start_ms:Number((observed-start).toFixed(2)),from_patch_response_ms:Number((observed-committed).toFixed(2))});
   if(!found)throw Error('El cambio no apareció antes del límite de prueba');
  }
  result.maximum_ms=Math.max(...result.samples.map(s=>s.from_patch_start_ms));
  result.all_under_5000_ms=result.samples.every(s=>s.found&&s.from_patch_start_ms<5000);
  result.result=result.all_under_5000_ms?'passed':'failed';
  agent.destroy();
 }catch(error){result.result='failed';result.error=error.message;}
 console.log(JSON.stringify(result));if(result.result!=='passed')process.exitCode=1;
});
