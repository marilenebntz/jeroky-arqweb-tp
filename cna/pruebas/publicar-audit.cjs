// Se ejecuta dentro del bridge aislado: usa sus credenciales sin imprimirlas.
const amqp = require('/app/node_modules/amqplib');
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  let connection;
  try {
    const { events = [] } = JSON.parse(input);
    connection = await amqp.connect({hostname:process.env.RABBITMQ_HOST,
      username:process.env.RABBITMQ_DEFAULT_USER,password:process.env.RABBITMQ_DEFAULT_PASS,heartbeat:30});
    const channel = await connection.createConfirmChannel();
    let returned = false;
    channel.on('return', () => { returned = true; });
    for (const event of events) {
      await new Promise((resolve,reject) => channel.publish('jeroky.events',event.type,Buffer.from(JSON.stringify(event)),
        {persistent:true,mandatory:true,contentType:'application/json',messageId:event.event_id,correlationId:event.request_id},
        error => error ? reject(error) : resolve()));
    }
    if (returned) throw Error('Mensaje sin ruta');
    const queue = await channel.checkQueue('jeroky.audit');
    console.log(JSON.stringify({confirmed:events.map(x=>x.event_id),queue}));
    await channel.close(); await connection.close();
  } catch {
    console.error('No se pudo publicar o consultar la cola de prueba.');
    if (connection) await connection.close().catch(()=>{});
    process.exitCode = 1;
  }
});
