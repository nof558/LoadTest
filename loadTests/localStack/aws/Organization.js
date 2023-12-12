import AWS from 'aws-sdk';
import {DEFAULT_AWS_CONFIG} from './awsAccountConfigs.js';

export default class Organization {
	constructor() {
		this.accounts = [];
		AWS.config.update(DEFAULT_AWS_CONFIG);
		this.organizations = new AWS.Organizations();
	}

	async createOrganization() {
		try {
			const response = await this.organizations.createOrganization({FeatureSet: 'ALL'}).promise();
			console.log('Organization created:', response.Organization);
			return response.Organization;
		} catch (error) {
			console.error('Error creating organization:', error);
			throw error;
		}
	}

	async removeAccount(accountId) {
		try {
			await this.organizations.removeAccountFromOrganization({ AccountId: accountId }).promise();
			console.log(`Account ${accountId} removed from organization.`);
		} catch (error) {
			console.error('Error removing account:', error);
			throw error;
		}
	}

	async addAccount(accountConfig) {
		try {
			const createAccountResponse = await this.organizations.createAccount({
				Email: `account+${accountConfig.accountId}@loadTest.com`,
				AccountName: `Account-${accountConfig.accountId}`
			}).promise();

			this.accounts.push(createAccountResponse.CreateAccountStatus);
			console.log('Account added & initated to organization:', createAccountResponse.CreateAccountStatus);
		} catch (error) {
			console.error('Error adding account to organization:', error);
			throw error;
		}
	}

	async listAccounts() {
		try {
			const response = await this.organizations.listAccounts().promise();
			return response.Accounts;
		} catch (error) {
			console.error('Error listing accounts:', error);
			throw error;
		}
	}

	async getAccountDetails(accountId) {
		try {
			const response = await this.organizations.describeAccount({ AccountId: accountId }).promise();
			return response.Account;
		} catch (error) {
			console.error('Error getting account details:', error);
			throw error;
		}
	}


	
}
