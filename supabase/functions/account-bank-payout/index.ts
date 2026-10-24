import {createWorker} from './worker.mjs';
Deno.serve(createWorker({env:(name:string)=>Deno.env.get(name)}));
