import AWS from 'aws-sdk';
import { generateUniqueId, getCredentials } from '../config/config.js';

export default class AWSAccountManager {
	constructor() {
		this.accounts = {}; // Stores account details and STS tokens
	}

	async initializeAccount(accountConfig) {
		// Assume the role and get credentials
		const credentials = await getCredentials(accountConfig.roleArn, accountConfig.awsConfig);
		const accountIdentifier = generateUniqueId('account_');
		// Store the credentials against the account identifier
		this.accounts[accountIdentifier] = {
			...accountConfig,
			credentials,
		};
		console.log(`Account initialized: ${accountIdentifier}, Role ARN: ${roleArn}`);
		return accountIdentifier;
	}

	async getAccount(accountIdentifier) {
		const account = this.accounts[accountIdentifier];
		if (!account) {
			throw new Error('Account not found');
		}
		// Refresh credentials if they are expired or about to expire
		if (new Date(account.credentials.expiration) <= new Date()) {
			console.log(`Refreshing credentials for account: ${accountIdentifier}`);
			account.credentials = await getCredentials(account.roleArn, account.awsConfig);
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
