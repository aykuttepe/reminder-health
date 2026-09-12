import { RutinDatabase } from './db.js';
import { AuthService } from './auth.js';
const db=new RutinDatabase();await db.initAsync();
try{
  const auth=new AuthService(db),[command,...args]=process.argv.slice(2);
  if(command==='list')console.log(JSON.stringify(db.sql.prepare('SELECT id,name,email,is_legacy_owner,created_at FROM users').all(),null,2));
  else if(command==='create'&&args.length){
    const email=args.length>1&&args[args.length-1].includes('@')?args.pop():undefined;
    console.log(JSON.stringify(auth.createUser(args.join(' '),email),null,2));
  }
  else if(command==='set-email'&&args[0]&&args[1])console.log(JSON.stringify(auth.updateEmail(args[0],args[1]),null,2));
  else if(command==='reset-code'&&args[0])console.log(JSON.stringify(auth.rotateCode(args[0]),null,2));
  else if(command==='owner-code'){
    const owner=db.sql.prepare('SELECT id FROM users WHERE is_legacy_owner=1').get() as any;
    console.log(JSON.stringify(auth.rotateCode(owner.id),null,2));
  }else{console.error('Kullanım: admin list | create <ad> [email] | set-email <user-id> <email> | reset-code <user-id> | owner-code');process.exitCode=1;}
}finally{db.close();}
