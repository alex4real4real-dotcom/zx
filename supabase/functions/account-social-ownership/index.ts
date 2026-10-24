import {createHandler} from './verifier.mjs';
Deno.serve(createHandler({env:(key:string)=>Deno.env.get(key)}));
