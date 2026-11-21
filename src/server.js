import http from 'node:http';
import handler from './handler.js';
const port=Number(process.env.PORT??3000);
http.createServer(handler).listen(port,()=>console.log(`API listening on ${port}`));
