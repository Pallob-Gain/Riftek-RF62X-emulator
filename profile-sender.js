//Center can has 18072.888888888889 pulses per rev


const path=require("path");
const fs=require("fs");
// Profile parser
const RFProfile = require("./lib/RFProfile.V1");

const dgram = require('node:dgram');

const client = dgram.createSocket('udp4');

const DESTINATION_PORT = 50001; //receving port
const DESTINATION_IP='127.0.0.1';

const PULSE_PER_REV=18072;

const RPM=20; 
const period=60000/RPM;
const sigle_tick_time=period/PULSE_PER_REV;

const getDirectoryFiles=(dir_link)=>{
    return new Promise((accept,reject)=>{
        fs.readdir(dir_link,(err,files)=>{
            if(err)return reject(err);
            accept(files.map((file)=>{
                return path.join(dir_link,file);
            }));
        });
    });
}

const readFileData=(link)=>{
    return new Promise((accept,reject)=>{
        fs.readFile(link,(err,data)=>{
            if(err)return reject(err);
            accept(data);
        });
    });
}

client.connect(DESTINATION_PORT, DESTINATION_IP,async (err) => {  
    if(err){
        console.log("UDP packet opening error.");
        return;
    }

    let files=await getDirectoryFiles(path.join(__dirname,'./SampleSavedProfiles/'));

    let f=files[0];

    console.log('file:',f);

    let data=await readFileData(f);

    console.log("Sending data");

    let profile = new RFProfile(data);

    console.log('window time:',sigle_tick_time,' ms');
    console.time("uploadingTime");

    for(let i=0;i<PULSE_PER_REV;i++){
        profile.setMeasuringStep(i);
        //sending data
        client.send(profile.getBuffer());
    
        if(i%10==0)await new Promise(a=>setTimeout(a));
    }   
    
    console.timeEnd("uploadingTime");
});