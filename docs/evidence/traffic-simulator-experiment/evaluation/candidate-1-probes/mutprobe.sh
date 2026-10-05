#!/bin/bash
# usage: mutprobe.sh name file find replace [find2 replace2]
cd "$(dirname "$0")/.."
f=src/components/TrafficSimulator/model/$2
node -e '
const fs=require("fs");const [f,...pairs]=process.argv.slice(1);let s=fs.readFileSync(f,"utf8");
for(let i=0;i<pairs.length;i+=2){const n=s.split(pairs[i]).length-1;if(n!==1){console.error("pattern count",n,pairs[i]);process.exit(1)}s=s.replace(pairs[i],pairs[i+1])}
fs.writeFileSync(f,s)' "$f" "${@:3}" || exit 1
echo "### $1"
FILTER="${FILTER:-.}" node --import ./scripts/traffic-test-loader.mjs scripts/probe-invariants.mjs ${SECS:-600} | sed -E 's/"(maxSamples|maxHistory|laneChangesPerExit|pastDropLane2|maxExits|maxCrossings|unsorted|nan|reverse)":[0-9]+,//g' | cut -c1-330
git checkout -- "$f"
