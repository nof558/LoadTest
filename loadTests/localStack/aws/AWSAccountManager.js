import AWS from 'aws-sdk';
import { generateUniqueId, getCredentials } from '../config/config.js';

class AWSAccountManager {
	constructor() {
		this.accounts = {}; // Stores account details and STS tokens
	}

	async initializeAccount(accountConfig) {
		// Assume the role and get credentials
		const {credentials, expiration} = await getCredentials(accountConfig.roleArn, accountConfig.awsConfig);
		const accountIdentifier = generateUniqueId('account_');

		// Store the credentials against the account identifier
		this.accounts[accountIdentifier] = {
			...accountConfig,
			credentials,
			expiration,
		};

		// Log the STS token details
		console.log(`Account initialized: ${accountIdentifier}, Role ARN: ${accountConfig.roleArn}`);
		console.log(`STS Token Access Key: ${credentials.accessKeyId}`);
		console.log(`STS Token Secret Access Key: ${credentials.secretAccessKey}`);
		console.log(`STS Token Session Token: ${credentials.sessionToken}`);
		console.log(`STS Token Expiration: ${expiration}`);

		return accountIdentifier;
	}

	async getAccount(accountIdentifier) {
		const account = this.accounts[accountIdentifier];
		if (!account) {
			throw new Error('Account not found');
		}
	
		// Check if credentials are expired or about to expire
		if (new Date(account.expiration) <= new Date()) {
			console.log(`Refreshing credentials for account: ${accountIdentifier}`);
			const { credentials, expiration } = await getCredentials(account.roleArn, account.awsConfig);
	
			// Update the stored credentials and expiration
			account.credentials = credentials;
			account.expiration = expiration;
	
			console.log(`Credentials refreshed for account: ${accountIdentifier}`);
		}
	
		// Return the AWS accounts configured with the credentials
		return {
			ec2: new AWS.EC2({...account.awsConfig, credentials: account.credentials}),
			iam: new AWS.IAM({...account.awsConfig, credentials: account.credentials}),
			s3: new AWS.S3({...account.awsConfig, credentials: account.credentials}),
			sqs: new AWS.SQS({...account.awsConfig, credentials: account.credentials}),
			lambda: new AWS.Lambda({...account.awsConfig, credentials: account.credentials}),
		};
	}
}

const accountManagerInstance = new AWSAccountManager();
export default accountManagerInstance;
