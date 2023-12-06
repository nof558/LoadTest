import AWS from 'aws-sdk';
import { defaultAwsConfig } from '../config/config.js';

export default class Organization {
	constructor() {
		this.accounts = [];
		AWS.config.update(defaultAwsConfig);
		this.organizations = new AWS.Organizations();
	}

	async createOrganization() {
		try {
			const response = await this.organizations.createOrganization({
				FeatureSet: 'ALL' // LocalStack supports 'ALL' feature set
			}).promise();
			console.log('Organization created:', response.Organization);
			return response.Organization;
		} catch (error) {
			console.error('Error creating organization:', error);
			throw error;
		}
	}

	async addAccount(accountConfig) {
		try {
			const createAccountResponse = await this.organizations.createAccount({
				Email: `account+${accountConfig.accountId}@example.com`,
				AccountName: `Account-${accountConfig.accountId}`
			}).promise();

			console.log('Account creation initiated:', createAccountResponse.CreateAccountStatus);

			// Since LocalStack mocks AWS, the account creation is instantaneous
			// In a real AWS environment, you would need to poll for account creation status

			this.accounts.push(createAccountResponse.CreateAccountStatus);
			console.log('Account added to organization:', createAccountResponse.CreateAccountStatus);
		} catch (error) {
			console.error('Error adding account to organization:', error);
			throw error;
		}
	}

	// Additional methods as required for managing the organization
}
