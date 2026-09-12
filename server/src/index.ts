import { RutinDatabase } from './db.js';
import { createServer } from './app.js';
const db=new RutinDatabase();await db.initAsync();
const server=createServer(db);
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('Reminder Sync v2 hazır; tüm kayıtlar kullanıcı oturumu gerektirir.'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
