import AWS from 'aws-sdk';
import {v4 as uuidv4} from 'uuid';
import JSZip from 'jszip';
import {DEFAULT_AWS_CONFIG} from '../aws/awsAccountConfigs.js'

// Cache for assumed role credentials to avoid unnecessary calls to STS
let cachedCredentials = {};

// Function to assume an AWS role
const assumeRole = async (roleArn, awsConfigOverrides) => {
	const awsConfig = {...DEFAULT_AWS_CONFIG, ...awsConfigOverrides};
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

			if (!assumedRole.Credentials || !assumedRole.Credentials.Expiration) {
				throw new Error('Invalid STS token response');
			}

			const credentials = new AWS.Credentials(
				assumedRole.Credentials.AccessKeyId,
				assumedRole.Credentials.SecretAccessKey,
				assumedRole.Credentials.SessionToken
			);
		
		// Store credentials in cache with expiration
		cachedCredentials[roleArn] = {
			credentials,
			expiration: assumedRole.Credentials.Expiration,
		};

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
	return {
		credentials: cached.credentials,
		expiration: cached.expiration
	};
};

// Utility function to generate a unique identifier
const generateUniqueId = (prefix = 'id_') => {
	return `${prefix}${Date.now()}-${uuidv4()}`;
};

// Generate a pseudo-random number and pad it to ensure it's 12 digits for AWS account ID
const generateUniqueAccountId = (index) => {
	const randomNumber = Math.floor(Math.random() * 1e12) + index;
	return String(randomNumber).padStart(12, '0');
};

// Function to create a zip buffer for Lambda deployment packages
const createZipBuffer = async () => {
	const zip = new JSZip();
	zip.file('index.js', 'exports.handler = async (event) => { return "Hello from Lambda"; };');
	return await zip.generateAsync({type: 'nodebuffer'});
};

// Function to simulate delay
const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export {getCredentials, generateUniqueId, generateUniqueAccountId, createZipBuffer, simulateDelay};
