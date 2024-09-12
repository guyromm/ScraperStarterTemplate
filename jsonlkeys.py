#!/usr/bin/env python
import sys
import json
import collections
from typing import Any, Dict, List, Union
import argparse
import re

def get_type(value: Any) -> str:
    return type(value).__name__

parser = argparse.ArgumentParser()
parser.add_argument("-s", "--sort", help="Sort by key, qty, dst, avg_len, total_len, pct_unique. Default is dst", default="dst")
parser.add_argument("-r", "--regex", help="Regular expression to filter keys")
parser.add_argument("-o", "--output", help="Output sections: all, top-level, summary, keyagg, jsonbq. Default is all", default=["all"], choices=['all', 'top-level', 'summary', 'keyagg', 'jsonbq'], nargs='*')
args = parser.parse_args()

def update_summary(item: Union[Dict[str, Any], List[Any]], path: str = "", include_arr_path=True):
    r = None
    if args.regex:
        r = re.compile(args.regex, re.I)
    
    if isinstance(item, dict):
        for key, value in item.items():
                
            key_path = f"{path}.{key}" if path else key
            if isinstance(value, (dict, list)):
                update_summary(value, key_path)
            else:
                value_str = str(value)
                if r and not r.search(value_str):
                    continue

                summary["keys"][key_path] += 1
                summary["total_length"][key_path] += len(value_str)
                summary["total_length_sum"] += len(value_str)
                kp = f"{key_path}:{get_type(value)}"
                summary["key_types"][kp] += 1
                if kp not in samples:
                    samples[kp]=collections.Counter()
                samples[kp][value]+=1

    elif isinstance(item, list):
        if include_arr_path:
            key_path = f"{path}.ARR" if path else "ARR"
            if not r:
                summary["keys"][key_path] += len(item)
            for value in item:
                if isinstance(value, (dict, list)):
                    update_summary(value, key_path, False)


def shorten_string_step(s):
    if '__' in s:
        s = s.replace('__','_')
        return s
    parts = s.split('_')
    idx=0
    chdone=False
    for p in parts:
        if len(p)>1:
            parts[idx]=p[0]
            chdone=True
            break
        idx+=1
    if chdone:
        return '_'.join(parts)
    
    idx=0
    nparts=[]
    for p in parts:
        if len(parts)<(idx+2):break
        if not chdone and len(p)==1  and len(parts[idx+1])==1:
            nparts.append(parts[idx]+parts[idx+1])
            idx+=1
            chdone=True
        else:
            #print('appending idx',idx,'of parts',parts,len(parts))
            nparts.append(parts[idx])
        idx+=1
    if chdone:
        return '_'.join(nparts)
    if len(s)==1:
        return s
    else:
        raise Exception('no change done',s,len(s))

def shorten_string(s,labels):
    rt = s
    tries=100
    while len(rt)>63 or rt in labels:
        rt=shorten_string_step(rt)
        tries-=1
        if not tries: raise Exception('tries exhausted on',s,'at',rt)
    return rt

def order_by_commonality(counter):
    return {k: v for k, v in sorted(counter.items(), key=lambda item: item[1])}

summary = {
    "key_types": collections.Counter(),
    "keys": collections.Counter(),
    "total_length": collections.Counter(),
    "total_length_sum": 0,
}
samples = {}

tlitems=0
data = [json.loads(line) for line in sys.stdin]
for item in data:
    update_summary(item)
    tlitems+=1

summary = {k: order_by_commonality(v) if isinstance(v, collections.Counter) else v for k, v in summary.items()}

eh=True
if 'all' not in args.output and len(args.output)==1:
    eh=False

if 'all' in args.output or 'top-level' in args.output:
    if eh: print('**',tlitems,'top-level items.')
if 'all' in args.output or 'samples' in args.output:
    if eh: print('** samples')
    print(json.dumps(samples, indent=4))
if 'all' in args.output or 'summary' in args.output:
    if eh: print('** summary including total length sum')
    print(json.dumps(summary, indent=4))

sort_key = {
    "qty": lambda x: summary['key_types'][x[0]],
    "dst": lambda x: len(samples[x[0]]),
    "avg_len": lambda x: summary["total_length"][x[0].split(':')[0]] / summary['key_types'][x[0]],
    "total_len": lambda x: summary["total_length"][x[0].split(':')[0]],
    "pct_unique": lambda x: len(samples[x[0]]) / summary['key_types'][x[0]] * 100,
    "key": lambda x: x,
}[args.sort]
    
if 'all' in args.output or 'keyagg' in args.output:
    if eh: print('** key agg')

    print("| Quantity | Distinct | Avg Len | Total Len | Pct Unique | Path    | Smpl.|")
    print("|----------|----------|---------|-----------|------------|---------|------|")
    for k,v in sorted(summary['key_types'].items(), key=sort_key, reverse=True):
        kn = ':'.join(k.split(':')[0:-1])
        s = samples[k]
        litems = list(s.items())
        ex='' ; excnt=1 ; 
        while len(ex)<60 and excnt<=len(litems):
            ex = str(litems[0:excnt])
            excnt+=1
        avg_len = summary["total_length"][kn] / v
        total_len = summary["total_length"][kn]
        pct_unique = len(s) / v * 100
        print(f"| {v} | {len(s)} | {avg_len:.2f} | {total_len} | {pct_unique:.2f}% | {k} | {ex} |")

sort_key = {
    "qty": lambda x: summary['key_types'][x],
    "dst": lambda x: len(samples[x]),
    "avg_len": lambda x: summary["total_length"][x.split(':')[0]] / summary['key_types'][x],
    "total_len": lambda x: summary["total_length"][x.split(':')[0]],
    "pct_unique": lambda x: len(samples[x]) / summary['key_types'][x] * 100,
    "key": lambda x: x,
}[args.sort]

if 'all' in args.output or 'jsonbq' in args.output:
    if eh: print('** jsonb-queries')

    donepaths=[] ;
    donelabels=[] ;
    toprint=[]
    comments=[]
    sarr = sorted(summary['key_types'].keys(), key=lambda x: sort_key(x))
    idx=-1
    idxpr=0
    prevprinted=False
    for k in sarr:
        idx+=1
        path = ':'.join(k.split(':')[0:-1])
        spl=False
        orig_path = path
        if 'ARR' in path:
            psplit = path.split('.ARR')[0]
            path = psplit
            spl=True
            #raise Exception(orig_path,path,spl)
        path_parts = path.split('.')


        quantity = summary['key_types'][k]
        distinctiveness = len(samples[k])
        example = str(list(samples[k].items())[0])
        cmnt = '-- '+orig_path

        if len(path_parts)==1:
            last_connector=''
            root_connector='->>'
        else:
            last_connector='->>'
            root_connector='->'

        if spl:
            cmnt='-- ARRAY'
            jsonb_path = '->'.join([f"'{part}'" for part in path_parts])        
        else:
            jsonb_path = '->'.join([f"'{part}'" for part in path_parts[:-1]]) + last_connector + "'"+path_parts[-1] + "'"

            total_len = summary["total_length"][path]
            cmnt =f"-- qty: {quantity}, dst: {distinctiveness}, total_len: {total_len}, smpl: {example}"

            avg_len = summary["total_length"][path] / summary["keys"][path]
            value = samples[k] # f"{path}:{get_type(value)}"]
            pct_unique = len(value) / summary["keys"][path] * 100
            cmnt += f", avg_len: {avg_len:.2f}, pct_unique: {pct_unique:.2f}%"


        if jsonb_path in donepaths:
            pass
        else:
            #print('PATH',path)


            lbl = shorten_string('_'.join(path_parts),donelabels)
            #print(f"v{root_connector}{jsonb_path} as {lbl}",cmnt,end='')
            toprint.append(f"v{root_connector}{jsonb_path} as {lbl}")
            comments.append(cmnt)
            donepaths.append(jsonb_path)
            donelabels.append(lbl)
            idxpr+=1
    idx=-1
    for line in toprint:
        idx+=1
        print(toprint[idx],end='')
        if idx<=len(toprint)-2:
            print(',')
        #print(' ',comments[idx],end='')




