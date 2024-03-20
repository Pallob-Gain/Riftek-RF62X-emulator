
const path=require("path");
const fs=require("fs");
const xCore = require('m10xcore');
const express = require('express');
const app = express();
const http = require('http').Server(app);
// Profile parser
const RFProfile = require("./lib/RFProfile.V1");

const {GPIO}=xCore;

const dgram = require('node:dgram');
const client = dgram.createSocket('udp4');

const encoderA=new GPIO(xCore.pins.D46);
const encoderB=new GPIO(xCore.pins.D36);


let DESTINATION_PORT = 50001; //receving port
let DESTINATION_IP='192.168.0.136';

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

const exiting=async() => {
    console.log('process id: '+process.pid);

    await encoderA.removeInterrupt(); //remove interrupt
    await encoderB.removeInterrupt(); //remove interrupt
    
    await encoderA.close(); //close pwm
    await encoderB.close(); //close pwm
    
    process.exit();
}

let client_is_connected=false;

client.on('error', (err) => {
    console.error(`UDP client error: ${err.stack}`);
    client.close();
});
  
client.on('close', () => {
    console.error(`UDP client disconnected`);
    client_is_connected=false;
});

const connectClientSys=()=>{
    console.log(`Connecting to server--> ${DESTINATION_IP}:${DESTINATION_PORT}`);

    client.connect(DESTINATION_PORT, DESTINATION_IP,(err) => {
        if(err){
            client_is_connected=false;
            console.log('client connection error');
            return;
        }
        client_is_connected=true;
        console.log('client got connected');
    });
}

const sendProfileData=(profile_buff)=>{
    if(client_is_connected)client.send(profile_buff);
}

const encoder_lookup_table = [0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0];

let encoder_read=0,last_encoder_read=0,measuring_counter=0;


const API_REQUEST_SUCCESS='RF_OK';

const req_data_handeler={
    user_trigger_counter_value:{
        get:()=>{
            return encoder_read;
        },
        put:(val)=>{
            encoder_read=Number(val);
            return encoder_read;
        }
    },
    user_trigger_sync_value:{
        get:()=>{
            return measuring_counter;
        },
        put:(val)=>{
            measuring_counter=Number(val);
            return measuring_counter;
        }
    },
    user_network_hostPort:{
        get:()=>{
            return DESTINATION_PORT;
        },
        put:(val)=>{
            DESTINATION_PORT=Number(val);
            return DESTINATION_PORT;
        }
    },
    user_network_hostIP:{
        get:()=>{
            return DESTINATION_IP.split('.').map(t=>Number(t));
        },
        put:(val)=>{
            DESTINATION_IP=JSON.parse(val).join('.');
            return DESTINATION_IP;
        },
        action:(val)=>{
            if(client_is_connected){
                client.disconnect();
            }
            
            connectClientSys();
            return API_REQUEST_SUCCESS;
        },
    },
};

app.get('/api/v1/config/params/values', (req, res) => {
    // __postdata:requset.body,
    let __getquery=req.query;
    // __getparams:requset.params,
    let payload={};

    //console.log({__getquery});

    if('name' in __getquery){
        if(Array.isArray(__getquery.name)){
            for(let name of __getquery.name){
                if ( name in req_data_handeler)payload[name]=req_data_handeler[name].get();
            }
        }
        else if ( __getquery.name in req_data_handeler)payload[__getquery.name]=req_data_handeler[__getquery.name].get();
    }

    res.json(payload);
});

app.put('/api/v1/config/params/values', (req, res) => {
    // __postdata:requset.body,
    let __getquery=req.query;
    // __getparams:requset.params,
    let payload={};

    for(let name in __getquery){
        if(name in req_data_handeler){
            req_data_handeler[name].put(__getquery[name]);
            payload[name]=API_REQUEST_SUCCESS;
        }
    }

    for(let name in __getquery){
        if(name in req_data_handeler && 'action' in  req_data_handeler[name]){
            payload[name]=req_data_handeler[name].action();
        }
    }

    res.json(payload);
});

const main = async () => {
    try{
        console.log('Server have started');
        connectClientSys();

        let files=await getDirectoryFiles(path.join(__dirname,'./SampleSavedProfiles/'));
        let profile_data=await readFileData(files[0]);
        let profile = new RFProfile(profile_data);

        await encoderA.mode(GPIO.INPUT_PULLUP);
        await encoderB.mode(GPIO.INPUT_PULLUP);

        
        let enc1_val=0;
        let encAstate=await encoderA.get(),encBstate=await encoderB.get();

        const updateToClients=(encoder)=>{
            if(last_encoder_read!=encoder){
                last_encoder_read=encoder;
                
                measuring_counter++;
                profile.setMeasureCounter(measuring_counter);
                profile.setMeasuringStep(encoder);
                sendProfileData(profile.getBuffer());
            }
        }

        await encoderA.attachInterrupt(GPIO.BOTH,async (event)=>{
            encAstate=!(event.id==GPIO.EVENT_FALLING);
            enc1_val = (enc1_val << 2) | (((encBstate?1:0)<<1) | (encAstate?1:0));
            enc1_val=enc1_val & 0x0F;

            encoder_read+=encoder_lookup_table[enc1_val];
            updateToClients(encoder_read);
        });

        await encoderB.attachInterrupt(GPIO.BOTH,async (event)=>{
            encBstate=!(event.id==GPIO.EVENT_FALLING);
            enc1_val = (enc1_val << 2) | (((encBstate?1:0)<<1) |(encAstate?1:0) );
            enc1_val=enc1_val & 0x0F;

            encoder_read+=encoder_lookup_table[enc1_val];
            updateToClients(encoder_read);
        });

        process.on('SIGINT', exiting);
    }
    catch(err){
        console.log('error-->',err);
    }
}


http.listen(80, main); //server create with port 80