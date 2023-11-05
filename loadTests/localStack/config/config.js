import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
import {v4 as uuidv4} from 'uuid';
import JSZip from 'jszip';

dotenv.config();

const isDocker = fs.existsSync('/.dockerenv');
const endpoint = isDocker ? 'https://localstack:4566' : 'https://localhost:4566';

const awsConfig = {
	region: process.env.AWS_REGION || 'us-east-1',
	endpoint,
	sslEnabled: true,
	s3ForcePathStyle: true,
	httpOptions: {
		agent: new https.Agent({
			rejectUnauthorized: false,
		}),
	},
};

const sts = new AWS.STS(awsConfig);

let cachedCredentials = {};

const assumeRole = async (roleArn, awsConfig) => {
	try {
		console.log('Attempting to assume role...');
		const sts = new AWS.STS(awsConfig);
		const assumedRole = await sts
			.assumeRole({
				RoleArn: roleArn, // use the passed roleArn
				RoleSessionName: 'XMLoadTest', // replace with your session name
				DurationSeconds: 3600, // adjust the duration as per your requirement
			})
			.promise();

		cachedCredentials[roleArn] = new AWS.Credentials(
			assumedRole.Credentials.AccessKeyId,
			assumedRole.Credentials.SecretAccessKey,
			assumedRole.Credentials.SessionToken,
		);

		console.log('Assumed role successfully');
		console.log('Temporary AccessKeyId:', assumedRole.Credentials.AccessKeyId);
		console.log('Temporary SecurityToken:', assumedRole.Credentials.SessionToken);

		return cachedCredentials[roleArn];
	} catch (error) {
		console.error('Error assuming role:', error.message);
		throw error; // propagate the error up the call stack
	}
};

const getCredentials = async (roleArn, awsConfig) => {
	if (!cachedCredentials[roleArn] || new Date(cachedCredentials[roleArn].expiration) <= new Date()) {
		return await assumeRole(roleArn, awsConfig);
	}
	return cachedCredentials[roleArn];
};

const generateUniqueId = () => {
	return `${Date.now()}-${uuidv4()}`;
};

const createZipBuffer = async () => {
	const zip = new JSZip();
	zip.file('index.js', 'exports.handler = function(event, ctx, callback) { callback(null, "Hello from Lambda"); }');
	return await zip.generateAsync({type: 'nodebuffer'});
};

// Define the parameters for the EC2 instance creation
const params = (uniqueName) => ({
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

export {getCredentials, awsConfig, generateUniqueId, createZipBuffer, params};
