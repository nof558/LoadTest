import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
import {v4 as uuidv4} from 'uuid';
import JSZip from 'jszip';

dotenv.config();

const isDocker = fs.existsSync('/.dockerenv');
const endpoint = isDocker ? 'https://localstack:4566' : 'https://localhost:4566';

// General AWS config that can be overridden by specific account configs
const defaultAwsConfig = {
	region: process.env.AWS_REGION || 'us-east-1',
	endpoint,
	sslEnabled: false,
	s3ForcePathStyle: true,
	httpOptions: {
		agent: new https.Agent({
			rejectUnauthorized: false,
		}),
	},
};

// Cache for assumed role credentials to avoid unnecessary calls to STS
let cachedCredentials = {};

// Function to assume an AWS role
const assumeRole = async (roleArn, awsConfigOverrides) => {
	const awsConfig = {...defaultAwsConfig, ...awsConfigOverrides};
	const sts = new AWS.STS(awsConfig);

	try {
		console.log(`Attempting to assume role: ${roleArn}`);
		const assumedRole = await sts
			.assumeRole({
				RoleArn: roleArn,
				RoleSessionName: `session-${uuidv4()}`,
				DurationSeconds: 3600,
			})
			.promise();

		const credentials = new AWS.Credentials(assumedRole.Credentials.AccessKeyId, assumedRole.Credentials.SecretAccessKey, assumedRole.Credentials.SessionToken);

		// Store credentials in cache with expiration
		cachedCredentials[roleArn] = {
			credentials,
			expiration: assumedRole.Credentials.Expiration,
		};

		console.log(`Assumed role successfully for: ${roleArn}\nSTS Token: ${cachedCredentials[roleArn]}\n`);
		return credentials;
	} catch (error) {
		console.error(`Error assuming role for ${roleArn}:`, error.message);
		throw error;
	}
};

// Function to retrieve or assume credentials for a role
const getCredentials = async (roleArn, awsConfigOverrides) => {
	const cached = cachedCredentials[roleArn];
	if (!cached || new Date(cached.expiration) <= new Date()) {
		return await assumeRole(roleArn, awsConfigOverrides);
	}
	return cached.credentials;
};

// Utility function to generate a unique identifier
const generateUniqueId = (prefix = 'id_') => {
	return `${prefix}${Date.now()}-${uuidv4()}`;
};

// Function to create a zip buffer for Lambda deployment packages
const createZipBuffer = async () => {
	const zip = new JSZip();
	zip.file('index.js', 'exports.handler = async (event) => { return "Hello from Lambda"; };');
	return await zip.generateAsync({type: 'nodebuffer'});
};

// Parameters for creating an EC2 instance
const ec2Params = (uniqueName) => ({
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

export {getCredentials, defaultAwsConfig, generateUniqueId, createZipBuffer, ec2Params};
