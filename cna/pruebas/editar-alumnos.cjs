// Solo dentro de cna-arqui-backend-1; credenciales y token nunca se imprimen.
let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',async()=>{
 try {
  const p=JSON.parse(input);const base='http://127.0.0.1:3001/api';
  const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.LAB_EMAIL,password:process.env.LAB_PASSWORD}),signal:AbortSignal.timeout(10000)});
  if(!login.ok)throw Error();const {access_token}=await login.json();if(!access_token)throw Error();
  async function call(path,method,body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+access_token},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();return r.json();}
  const result=[];
  if(p.action==='create'){
   if(!/^Ensayo [A-Z]{8}$/.test(p.marker))throw Error();
   for(let i=0;i<20;i++){
    const firstName=p.marker+' '+String.fromCharCode(65+i);
    const row=await call('/students','POST',{firstName,lastName:'Inicial',ci:String(Date.now())+String(i).padStart(2,'0'),birthDate:'2000-01-01',biometricConsent:false});
    result.push({id:row.id,firstName,lastName:'Inicial'});
   }
  }else if(p.action==='edit'){
   for(const student of p.students){
    const before=await call('/students/'+student.id,'GET');if(before.firstName!==student.firstName||before.lastName!=='Inicial')throw Error();
    const row=await call('/students/'+student.id,'PATCH',{lastName:'Actualizado'});
    result.push({id:row.id,firstName:student.firstName,lastName:'Actualizado'});
   }
  }else throw Error();
  console.log(JSON.stringify(result));
 }catch{console.error('Falló la preparación o edición por API del laboratorio; no se imprimieron credenciales.');process.exitCode=1;}
});
