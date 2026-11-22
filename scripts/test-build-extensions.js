'use strict';
// Exercise the real builder in an isolated synthetic repository; no game files or key.
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert');
const {writePak,openPak,readEntry}=require('./lib/pak');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fs-builder-test-'));
function put(p,b){const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b)}
function json(p,v){put(p,JSON.stringify(v))}
function run(ok,pattern){const r=cp.spawnSync(process.execPath,['scripts/build-patches.js','--testing'],{cwd:root,encoding:'utf8'});assert.strictEqual(r.status===0,ok,r.stdout+r.stderr);if(pattern)assert.match(r.stdout+r.stderr,pattern)}
try{
 fs.cpSync(__dirname,path.join(root,'scripts'),{recursive:true});
 put('views/js/patch_manifest.js','module.exports={dataMapping:[{src:"test.exe",dest:"test.exe"}]}');
 const original=Buffer.from([1,2,3,4]),tail=Buffer.from([5,6]);put('vanilla/test.exe',original);
 json('patches/bases.json',{'test.exe':{sha256:sha(original)}});
 const recipe={id:'test',status:'testing',target:'test.exe',edits:[{offset:0,original:'01',patched:'07'}],append:{baseSize:4,file:'files/tail.bin',sha256:sha(tail)}};
 put('patches/test/files/tail.bin',tail);json('patches/test/patch.json',recipe);run(true);
 assert.deepStrictEqual(fs.readFileSync(path.join(root,'data/test.exe')),Buffer.from([7,2,3,4,5,6]));
 for(const [mutate,pattern] of [
  [p=>p.append.baseSize=3,/baseSize mismatch/],
  [p=>p.append.sha256='0'.repeat(64),/payload hash mismatch/],
  [p=>p.append.file='../escape.bin',/escapes patch directory/],
  [p=>p.edits.push({offset:4,original:'05',patched:'09'}),/overlaps bytes/],
  [p=>p.edits[0].original='ff',/original bytes do not match/]
 ]){const p=structuredClone(recipe);mutate(p);json('patches/test/patch.json',p);run(false,pattern);assert.deepStrictEqual(fs.readFileSync(path.join(root,'data/test.exe')),Buffer.from([7,2,3,4,5,6]));}
 const noAppend=structuredClone(recipe);delete noAppend.append;json('patches/test/patch.json',noAppend);run(true);
 assert.deepStrictEqual(fs.readFileSync(path.join(root,'data/test.exe')),Buffer.from([7,2,3,4]));
 // Verify empty additive archives are generated without consulting a key.
 const empty=path.join(root,'empty.pak');writePak(empty,{mountPoint:'../../../spacegame/Content/',items:[]});
 json('patches/bases.json',{'test.pak':{sha256:sha(fs.readFileSync(empty)),emptyPak:{mountPoint:'../../../spacegame/Content/'},encrypted:false}});
 put('views/js/patch_manifest.js','module.exports={dataMapping:[{src:"test.pak",dest:"test.pak"}]}');
 put('patches/test/files/asset.bin',tail);
 json('patches/test/patch.json',{id:'test',status:'testing',target:'test.pak',assets:[{path:'Test.bin',replace:'files/asset.bin',baseSha256:null,sha256:sha(tail)}]});run(true);
 const pak=openPak(path.join(root,'data/test.pak'));assert.strictEqual(pak.entries.length,1);assert.strictEqual(!!pak.entries[0].encrypted,false);assert.deepStrictEqual(readEntry(pak,pak.entries[0]),tail);
 console.log('PASS: append, failure atomicity, wrong bytes/size/hash/path, overlap, legacy raw build and generated unencrypted overlay.');
}finally{fs.rmSync(root,{recursive:true,force:true})}
