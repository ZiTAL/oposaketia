import {cache} from 'react';
import {apiGet} from './client';
import {callDetailSchema} from './contracts';
// Explicit internal origin avoids trusting incoming Host headers (SSRF).
const origin=()=>process.env.INTERNAL_API_ORIGIN??`http://127.0.0.1:${process.env.PORT??3000}`;
export const getCallFromApi=cache((id:string)=>apiGet(`/calls/${encodeURIComponent(id)}`,callDetailSchema,undefined,origin()));
