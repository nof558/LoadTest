// init-aws-accounts.js
import AWSAccountManager from './aws/AWSAccountManager.js';
import {awsConfig} from './aws/awsAccountConfigs.js';

export async function initAWSAccounts() {
	for (const config of awsConfig) {
		try {
			const accountIdentifier = new AWSAccountManager().initializeAccount(config.roleArn, config);
			console.log(`Initialized AWS account with identifier: ${accountIdentifier}`);
			// Store the accountIdentifier in your database or configuration for later reference
		} catch (error) {
			console.error(`Failed to initialize AWS account with roleArn ${config.roleArn}:`, error);
		}
	}
}
