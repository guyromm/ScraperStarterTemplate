#!/usr/bin/env python
import sys
import json
import collections
from typing import Any, Dict, List, Union
import re

def get_type(value: Any) -> str:
    return type(value).__name__

def update_summary(item: Union[Dict[str, Any], List[Any]], path: str = ""):
    r=None
    if len(sys.argv)>1:
        r = re.compile(sys.argv[1],re.I)
    
    if isinstance(item, dict):
        for key, value in item.items():
                
            key_path = f"{path}.{key}" if path else key
            if isinstance(value, (dict, list)):
                update_summary(value, key_path)
            else:
                if r and not r.search(str(value)):
                    continue

                summary["keys"][key_path] += 1
                kp = f"{key_path}:{get_type(value)}"
                summary["key_types"][kp] += 1
                if kp not in samples:
                    samples[kp]=collections.Counter()
                samples[kp][value]+=1

    elif isinstance(item, list):
        key_path = f"{path}.ARR" if path else "ARR"
        if not r:
            summary["keys"][key_path] += len(item)
        for value in item:
            if isinstance(value, (dict, list)):
                update_summary(value, key_path)

def order_by_commonality(counter):
    return {k: v for k, v in sorted(counter.items(), key=lambda item: item[1])}

summary = {
    "key_types": collections.Counter(),
    "keys": collections.Counter(),
}
samples = {}

tlitems=0
data = [json.loads(line) for line in sys.stdin]
for item in data:
    update_summary(item)
    tlitems+=1

summary = {k: order_by_commonality(v) for k, v in summary.items()}

print('**',tlitems,'top-level items.')
print('** samples')
print(json.dumps(samples, indent=4))
print('** summary')
print(json.dumps(summary, indent=4))

print('** key agg')
for k,v in reversed(summary['key_types'].items()):
    s = samples[k]
    litems = list(s.items())
    ex='' ; excnt=1 ; 
    while len(ex)<60 and excnt<=len(litems):
        ex = str(litems[0:excnt])
        excnt+=1
    print(k.ljust(70),str(v).rjust(10),str(len(s)).rjust(8),ex)

print('** jsonb-queries')
for k in reversed(summary['key_types'].keys()):
    path = k.split(':')[0]
    path_parts = path.split('.')
    jsonb_path = '->'.join([f"'{part}'" if part != 'ARR' else 'jsonb_array_elements' for part in path_parts])
    if 'ARR' in path_parts:
        jsonb_path = f"jsonb_array_elements({jsonb_path})"
    else:
        jsonb_path = f"v->{jsonb_path}"
    print(f"{jsonb_path} as {path_parts[-1]},")

