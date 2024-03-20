const path=require("path");
const fs=require("fs");
// Profile parser
const RFProfile = require("./lib/RFProfile.V1");


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

const main=async ()=>{
    let files=await getDirectoryFiles(path.join(__dirname,'./SampleSavedProfiles/'));

    let f=files[0];

    console.log('file:',f);

    let data=await readFileData(f);

    //console.log('data: ',data.constructor.name);

    let profile = new RFProfile(data);
    // Print info from profile
    console.log(`Profile: `,profile.getPoints());   // Use profile profile.hardwareParams.stepCounter to print encroder value

    console.log('get encoder:',profile.getMeasuringStep());

    profile.setMeasuringStep(1);
    console.log('get1.1 encoder:',profile.getMeasuringStep());

    let buff=profile.getBuffer();
    
    console.log('buff:',buff.length);

    let p2=new RFProfile(buff);

    console.log('get2 encoder:',p2.getMeasuringStep());
   // console.log(`Profile2: `,p2.getPoints());
}

main();


