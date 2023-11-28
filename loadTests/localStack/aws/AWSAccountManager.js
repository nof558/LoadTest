import AWS from 'aws-sdk';
import {generateUniqueId, getCredentials} from '../config/config.js';

export default class AWSAccountManager {
	constructor() {
		this.accounts = {}; // Stores account details and STS tokens
	}

	async initializeAccount(roleArn, awsConfig) {
		// Assume the role and get credentials
		const credentials = await getCredentials(roleArn, awsConfig);
		const accountIdentifier = generateUniqueId('account_');
		// Store the credentials against the account identifier
		this.accounts[accountIdentifier] = {
			roleArn,
			awsConfig,
			credentials,
		};
		return accountIdentifier;
	}

	async getAWSClients(accountIdentifier) {
		const account = this.accounts[accountIdentifier];
		if (!account) {
			throw new Error('Account not found');
		}
		// Refresh credentials if they are expired or about to expire
		if (new Date(account.credentials.expiration) <= new Date()) {
			account.credentials = await getCredentials(account.roleArn, account.awsConfig);
		}
		// Return the AWS clients configured with the credentials
		return {
			ec2: new AWS.EC2({...account.awsConfig, credentials: account.credentials}),
			iam: new AWS.IAM({...account.awsConfig, credentials: account.credentials}),
			s3: new AWS.S3({...account.awsConfig, credentials: account.credentials}),
			sqs: new AWS.SQS({...account.awsConfig, credentials: account.credentials}),
			lambda: new AWS.Lambda({...account.awsConfig, credentials: account.credentials}),
		};
	}
}
