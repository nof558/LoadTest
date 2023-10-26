import dotenv from 'dotenv';
import fs from 'fs';
import {v4 as uuidv4} from 'uuid';
import JSZip from 'jszip';

dotenv.config();

export const config = {
	region: process.env.AWS_REGION || 'us-east-1',
	endpoint: fs.existsSync('/.dockerenv') ? 'http://localstack:4566' : 'http://localhost:4566',
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY || 'TEST1',
		secretAccessKey: process.env.AWS_SECRET_KEY || 'TEST1',
	},
};

console.log(`AWS Access Key: ${process.env.AWS_ACCESS_KEY_ID}`);
console.log(`AWS Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY}`);
console.log(`Config Endpoint: ${config.endpoint}`);

export const generateUniqueId = () => {
	return `${Date.now()}-${uuidv4()}`;
};

export const createZipBuffer = async () => {
	const zip = new JSZip();
	zip.file('index.js', 'exports.handler = function(event, ctx, callback) { callback(null, "Hello from Lambda"); }');
	return await zip.generateAsync({type: 'nodebuffer'});
};

// Define the parameters for the EC2 instance creation
export const params = (uniqueName) => ({
	ImageId: 'ami-mock',
	MinCount: 1,
	MaxCount: 1,
	TagSpecifications: [
		{
			ResourceType: 'instance',
			Tags: [
				{
					Key: 'Name',
					Value: uniqueName,
				},
			],
		},
	],
});
