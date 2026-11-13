const fs=require('fs');
const src=fs.readFileSync(__dirname+'/src.html','utf8');
const data=fs.readFileSync(__dirname+'/data.json','utf8');
fs.writeFileSync(__dirname+'/index.html',src.replace('/*__DATA__*/',()=>data));
