import {selectOne} from '../../../common/postgrest-cli.js';
const l = console.log;

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export const DEBUGGER_ATTACH=true;

export async function whatsNext(rt=false) {
    let url;
    l('implement the next up for collection logic here');
    if (!rt && url)
	location.href=url;
    else
	return url;

    }
    

