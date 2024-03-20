/*
returnCode info-->

    "RF_OK": "Success",
	"RF_DISABLED_BY_FACTORY": "The operation/command is not allowed by the manufacturer",
	"RF_BUSY": "Module busy",
	"RF_SUSPENDED": "Module/device is suspended (possibly critical operation is performed)",
	"RF_NOT_FOUND": "Module/data not found",
	"RF_NOT_ENOUGH_MEMORY": "To perform the operation is not enough memory (reduce the volume of transmission data packet)",
	"RF_DUPLICATED": "The command or data was repeated.",
	"RF_NOT_VALIDATED": "Before performing this command, the data must be validated",
	"RF_WRITE_IMPOSSIBLE": "No parameter or data can be written",
	"RF_NOT_AUTHORIZED": "To execute an operation/command, authorization is required",
	"RF_NOT_IMPLEMENTED": "The function or parameter was not implemented. It is expected in future releases.",
	"RF_PARAM_NOT_FOUND": "This parameter is not found in the device configuration",
	"RF_WRONG_SIZE": "Incorrect size of data or parameters in command",
	"RF_WRONG_DATA_TYPE": "Incorrect type of data or parameters in the command",
	"RF_OUT_OF_BOUNDS": "The value of the parameter or data goes beyond the allowed limits",
	"RF_NOT_VALID": "Command, data or parameter is not correct",
	"RF_UNKN_TYPE": "Type of parameter, data or attribute not known",
	"RF_NOT_IN_STEP": "The value of the parameter or data does not match to the change step",
	"RF_COMMAND_HANDLED": "The command with these MID, CID and UID has already been processed",
	"RF_WRONG_CRC": "Wrong checksum for command or data",
	"RF_WRONG_DEVICE_TYPE": "Command or data does not match the type of this device (fact_general_deviceType parameter)",
	"RF_WRONG_ARGUMENT": "The command argument(s) do not match the expected",
	"RF_NO_DATA": "No data or they're not ready yet",
	"RF_NOT_SUPPORTED": "The command cannot be handled by the module",
	"RF_INIT_FAULT": "General error during module or hardware initialization process",
	"RF_WRITE_PROHIBITED": "Write prohibited by safety flag",
	"RF_NOT_CONNECTED": "No connection to the remote system, usually no connection via TCP protocol",
	"RF_GENERAL_FAULT": "A general error occurred for an unknown reason"
*/

const PROFILE_TYPE = {
    RAW: 0x10,
    RAW_EXTENDED: 0x12,
    CALIBRATED_BY_TABLE: 0x11,
    CALIBRATED_BY_TABLE_EXTENDED: 0x13,
    CALIBRATED_BY_POLY: 0x20,
}

class RFProfile {
    static PLAIN_MEASURE=0x10;
    static PLAIN_PROFILE_BY_POLY=0x20;

    isDataPlain(){
        return this.dataType & RFProfile.PLAIN_MEASURE;
    }

    getBrightNessData(){
        return this.flags.includedIntensity;
    }

    getInterpolationState(){
        return this.flags.data==1;
    }

    getDeviceId(){
        return this.deviceID;
    }

    getSerialNumber(){
        return this.serial;
    }

    getSerialTime(){
        return this.systemTime;
    }

    getProtocolVersionMajor(){
        return this.protocol.major;
    }

    getProtocolVersionMajor(){
        return this.protocol.minor;
    }

    getHardwareShift(){
        return this.hardwareParamsShift;
    }

    getDataShift(){
        return this.dataShift;
    }

    getEmitedPacketNumber(){
        return this.counters.softwarePackets;
    }
    

    getMeasureCounter(){
        return this.profileDataView.getUint32(24, true);
    }

    getMeasureRangeZ(){
        return this.ranges.ZMR;
    }

    getMeasureFarX(){
        return this.ranges.XEMR;
    }

    getScalingFactorZ(){
        switch (this.dataType) {
            // Raw profile
            case PROFILE_TYPE.RAW:
            // Raw profile (extended) (deprecated)
            case PROFILE_TYPE.RAW_EXTENDED:
                return 1/this.ranges.discreteValue;
                break;
            // Calibrated profile by table
            case PROFILE_TYPE.CALIBRATED_BY_TABLE:
            // Calibrated profile by table (extended) (deprecated)
            case PROFILE_TYPE.CALIBRATED_BY_TABLE_EXTENDED:
                return this.ranges.ZMR / this.ranges.discreteValue;
                break;

            // Calibrated profile by poly
            case PROFILE_TYPE.CALIBRATED_BY_POLY:	
                return this.ranges.scalingFactor;
                break;
            default:
                return null;
                break;
        }
    }

    getScalingFactorX(){
        switch (this.dataType) {
            // Raw profile
            case PROFILE_TYPE.RAW:
            // Raw profile (extended) (deprecated)
            case PROFILE_TYPE.RAW_EXTENDED:
                return 1;
                break;
            // Calibrated profile by table
            case PROFILE_TYPE.CALIBRATED_BY_TABLE:
            // Calibrated profile by table (extended) (deprecated)
            case PROFILE_TYPE.CALIBRATED_BY_TABLE_EXTENDED:
                return this.ranges.XEMR / this.ranges.discreteValue;
                break;
            // Calibrated profile by poly
            case PROFILE_TYPE.CALIBRATED_BY_POLY:	
                return this.ranges.scalingFactor;
                break;
            default:
                return null;
                break;
        }
    }
    
    getLaserPower(){
        return this.hardwareParams.laserValue;
    }

    getMeasuringStep(){
        //encoder or step
        return this.hardwareParams.stepCounter;
    }

    getDirValue(){
        //encoder or step
        return this.hardwareParams.dir;
    }

    getLength(){
        return this.pointsCount;
    }

    getPointSize(){
        return this.hardwareParams.bytesPerPoint;
    }

    getDataSize(){
        //encoder or step
        return this.hardwareParams.dataSize;
    }

    getPoints(){
        return this.points;
    }

    getRawPoints(){
        return this.rawPoints;
    }

    getBuffer(){
        return Buffer.from(this.profileDataView.buffer);
    }

    setMeasuringStep(stepCounter){
        //encoder or step
        this.hardwareParams.stepCounter=stepCounter;
        this.profileDataView.setUint32(this.hardwareParamsShift + 8,stepCounter, true) ;
    }

    setMeasureCounter(measure_counter){
        this.counters.measures=measure_counter;
        this.profileDataView.setUint32(24,measure_counter, true);
    }

    /**
     * Profile parser.
     * @param {arraybuffer|Uint8Array} profileBinData - Binary profile data.
     */
    constructor(profileBinData) {
        // Flag indicating whether the profile is valid
        this.valid = true;
        
        // Profile processing
        // Binary data type checking
        let profileDataView = null;
        switch (profileBinData.constructor.name) {
            case "Uint8Array":
            case "Buffer":
                let arrayBufferProfile = profileBinData.buffer.slice(profileBinData.byteOffset, profileBinData.byteLength + profileBinData.byteOffset);
                profileDataView = new DataView(arrayBufferProfile);
                break;
            case "ArrayBuffer":
                profileDataView = new DataView(profileBinData);
                break;

            default:
                this.valid = false;
                throw `Incorrect type of data in profile parser: ${profileBinData.constructor.name}`;
        }

        this.profileDataView=profileDataView;

        // Data type
        this.dataType = profileDataView.getUint8(0);
        
        // Flags
        this.flags = {};
        this.flags.data = profileDataView.getUint8(1);
        // Split flags
        this.flags.includedIntensity = this.flags.data & 0b00000001;

        // Device ID
        this.deviceID = profileDataView.getUint16(2, true);

        // Serial number
        this.serial = profileDataView.getUint32(4, true);

        // Scanner system time
        this.systemTime = profileDataView.getBigUint64(8, true);

        // Protocol version
        this.protocol = {};
        this.protocol.major = profileDataView.getUint8(16);
        this.protocol.minor = profileDataView.getUint8(17);

        // Offset of the beginning of parameters in binary data
        this.hardwareParamsShift = profileDataView.getUint8(18);

        // Offset start of points data in binary data
        this.dataShift = profileDataView.getUint8(19);

        // Counters
        this.counters = {};
        this.counters.softwarePackets = profileDataView.getUint32(20, true);
        this.counters.measures = profileDataView.getUint32(24, true);

        // Ranges
        this.ranges = {};
        this.ranges.ZMR = profileDataView.getUint16(28, true);
        this.ranges.XEMR = profileDataView.getUint16(30, true);

        // Depending on the data format, a different set of data is parsed
		switch (this.dataType) {
			// Raw profile
			case PROFILE_TYPE.RAW:
			// Raw profile (extended) (deprecated)
			case PROFILE_TYPE.RAW_EXTENDED:
			// Calibrated profile by table
			case PROFILE_TYPE.CALIBRATED_BY_TABLE:
			// Calibrated profile by table (extended) (deprecated)
			case PROFILE_TYPE.CALIBRATED_BY_TABLE_EXTENDED:
				this.ranges.discreteValue = profileDataView.getUint16(32, true);
				break;

			// Calibrated profile by poly
			case PROFILE_TYPE.CALIBRATED_BY_POLY:
				this.ranges.scalingFactor = profileDataView.getFloat32(32, true);
				break;

			default:
                this.valid = false;
				break;
		}

        // Hardware parameters
        this.hardwareParams = {};
        this.hardwareParams.exposureTime = profileDataView.getUint32(this.hardwareParamsShift, true);
        this.hardwareParams.laserValue = profileDataView.getUint32(this.hardwareParamsShift + 4, true);
        this.hardwareParams.stepCounter = profileDataView.getUint32(this.hardwareParamsShift + 8, true);
        this.hardwareParams.dir = profileDataView.getUint8(this.hardwareParamsShift + 12);
        this.hardwareParams.dataSize = profileDataView.getUint16(this.hardwareParamsShift + 13, true);
        this.hardwareParams.bytesPerPoint = profileDataView.getUint8(this.hardwareParamsShift + 15);

        // Determining the number of points
        this.pointsCount = 0;
        let pointSize = 0;
        switch (this.dataType) {
            // Raw profile
			case PROFILE_TYPE.RAW:
			// Raw profile (extended) (deprecated)
			case PROFILE_TYPE.RAW_EXTENDED:
				pointSize = 2;
				break;

			// Calibrated profile by table
			case PROFILE_TYPE.CALIBRATED_BY_TABLE:
			// Calibrated profile by table (extended) (deprecated)
			case PROFILE_TYPE.CALIBRATED_BY_TABLE_EXTENDED:
				pointSize = 4;
				break;

			// Calibrated profile by poly
			case PROFILE_TYPE.CALIBRATED_BY_POLY:
				pointSize = 4;
				break;

            default:
                this.valid = false;
                console.log(`Incorrect profile data type: ${this.dataType}`);
        }

        let allPointSize = pointSize;
        if (this.flags.includedIntensity) {
            allPointSize = allPointSize + 1;
        }
        this.pointsCount = this.hardwareParams.dataSize / pointSize;

        if (this.pointsCount === Infinity){
            this.valid = false;
        }
        
        // Formation of an array of points
        this.points = [];
        this.rawPoints=[];

        if (this.valid){
            switch (this.dataType) {
                // Raw profile
                case PROFILE_TYPE.RAW:
                // Raw profile (extended) (deprecated)
                case PROFILE_TYPE.RAW_EXTENDED:
                    for (let i = 0; i < this.pointsCount; i++) {
                        let x = 0;
                        let y = 0;
                        let z = 0;
                        let intensity = 0;

                        x = i;
                        y = 0;
                        z = profileDataView.getUint16(this.dataShift + i * pointSize, true);

                        this.rawPoints.push({x,y:this.hardwareParams.stepCounter,z});
                        
                        if (this.flags.includedIntensity) {
                            intensity = profileDataView.getUint8(this.dataShift + this.pointsCount * pointSize + i);
                        }
                        this.points.push(new RFPoint(x, y, z / this.ranges.discreteValue, intensity));
                    }
                    break;

                // Calibrated profile by table
                case PROFILE_TYPE.CALIBRATED_BY_TABLE:
                // Calibrated profile by table (extended) (deprecated)
                case PROFILE_TYPE.CALIBRATED_BY_TABLE_EXTENDED:
                    for (let i = 0; i < this.pointsCount; i++) {
                        let x = 0;
                        let y = 0;
                        let z = 0;
                        let intensity = 0;

                        x = profileDataView.getInt16(this.dataShift + i * pointSize, true);
                        y = 0;
                        z = profileDataView.getUint16(this.dataShift + i * pointSize + 2, true) ;
                        
                        this.rawPoints.push({x,y:this.hardwareParams.stepCounter,z});

                        if (this.flags.includedIntensity) {
                            intensity = profileDataView.getUint8(this.dataShift + this.pointsCount * pointSize + i);
                        }
                        this.points.push(new RFPoint(x* this.ranges.XEMR / this.ranges.discreteValue, y, z* this.ranges.ZMR / this.ranges.discreteValue, intensity));
                    }
                    break;

                // Calibrated profile by poly
                case PROFILE_TYPE.CALIBRATED_BY_POLY:	
                    for (let i = 0; i < this.pointsCount; i++) {
                        let x = 0;
                        let y = 0;
                        let z = 0;
                        let intensity = 0;

                        x = profileDataView.getInt16(this.dataShift + i * pointSize, true) ;
                        y = 0;
                        z = profileDataView.getUint16(this.dataShift + i * pointSize + 2, true) ;
                        
                        this.rawPoints.push({x,y:this.hardwareParams.stepCounter,z});

                        if (this.flags.includedIntensity) {
                            intensity = profileDataView.getUint8(this.dataShift + this.pointsCount * pointSize + i);
                        }
                        this.points.push(new RFPoint(x* this.ranges.scalingFactor, y, z* this.ranges.scalingFactor, intensity));
                    }
                    break;

                default:
                    break;
            }

        }
        
    }
}



class RFPoint {
    constructor(x, y, z, i) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.i = i;
    }
}



module.exports = RFProfile;