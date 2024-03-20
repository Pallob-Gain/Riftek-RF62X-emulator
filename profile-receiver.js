
// UDP
const dgram = require('node:dgram');

// Profile parser
const RFProfile = require("./lib/RFProfile.V1");



// Destination port from webinterface -> Network 
const DESTINATION_PORT = 50001; //receving port


// Creat UDP socket
const server = dgram.createSocket('udp4');


/**
 * Error processing.
 */
server.on('error', (err) => {
  console.error(`server error:\n${err.stack}`);
  server.close();
});


/**
 * Process incoming UDP packets.
 */
server.on('message', (msg, rinfo) => {
    // Parse binary data to structured profile object
    let profile = new RFProfile(msg);
    // Print info from profile
    //console.log(`Profile: ${profile.counters.measures}`);   // Use profile profile.hardwareParams.stepCounter to print encroder value
    //console.log(`Profile: ${profile.counters.measures}`);
    let encoder=profile.getMeasuringStep() | 0;
    let measure_count=profile.getMeasureCounter() | 0;

    console.log({encoder,measure_count});
});



/**
 * Show listening addr after start.
 */
server.on('listening', () => {
  const address = server.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});


// Run server
server.bind(DESTINATION_PORT);