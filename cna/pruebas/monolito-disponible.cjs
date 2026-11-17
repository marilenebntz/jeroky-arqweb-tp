// Probe HTTPS dentro del backend aislado; nunca imprime token ni datos de alumnos.
const https = require('node:https');
let text='';process.stdin.on('data',c=>text+=c);process.stdin.on('end',async()=>{
 try{
  const {cert,service,requestId}=JSON.parse(text);
  const agent=new https.Agent({ca:cert,servername:'localhost',keepAlive:true});
  async function request(path,method='GET',body,token){
   return new Promise((resolve,reject)=>{
    const data=body?JSON.stringify(body):null;const headers={'X-Request-ID':requestId};
    if(data){headers['Content-Type']='application/json';headers['Content-Length']=Buffer.byteLength(data);}
    if(token)headers.Authorization='Bearer '+token;
    const req=https.request({hostname:'gateway',port:8443,servername:'localhost',agent,path,method,headers,timeout:20000},res=>{
     let payload='';res.on('data',c=>payload+=c);res.on('end',()=>resolve({status:res.statusCode,text:payload,headers:res.headers}));
    });req.on('timeout',()=>req.destroy(Error('Timeout HTTPS')));req.on('error',reject);req.end(data);
   });
  }
  const route=service==='search'?'/v2/search?q=Alumno&type=student':service==='audit'?'/v2/audit?limit=1':'/v2/exports';
  const failed=await request(route,service==='export'?'POST':'GET',service==='export'?{report:'students',format:'markdown'}:undefined);
  const error=JSON.parse(failed.text);
  if(failed.status!==503||error.request_id!==requestId||error.error!=='Servicio no disponible')throw Error('No se observó 503 controlado');
  let path='/';const chain=[];let final;
  for(let i=0;i<6;i++){
   const response=await request(path);chain.push({path,status:response.status});
   if([301,302,303,307,308].includes(response.status)){
    const next=new URL(response.headers.location,'https://localhost:3443'+path);
    if(next.origin!=='https://localhost:3443')throw Error('Redirección fuera del laboratorio');
    path=next.pathname+next.search;
   }else{final=response.status;break;}
  }
  if(final!==200)throw Error('La página final del monolito no devolvió 200');
  const login=await request('/api/auth/login','POST',{email:process.env.LAB_EMAIL,password:process.env.LAB_PASSWORD});
  if(![200,201].includes(login.status))throw Error('Falló login del monolito');
  const token=JSON.parse(login.text).access_token;if(!token)throw Error('Login sin token');
  const students=await request('/api/students','GET',undefined,token);
  if(students.status!==200||!Array.isArray(JSON.parse(students.text)))throw Error('Falló consulta autenticada de alumnos');
  console.log(JSON.stringify({service,request_id:requestId,microservice:{route,http:failed.status,body:error},frontend:{redirect_chain:chain,final_http:final},monolith:{login_http:login.status,students_http:students.status,students_count:JSON.parse(students.text).length}}));
  agent.destroy();
 }catch(error){console.error(error.message);process.exitCode=1;}
});
