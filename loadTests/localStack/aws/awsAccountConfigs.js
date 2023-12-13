import https from 'https';
import dotenv from 'dotenv';
import fs from 'fs';
import {generateUniqueId} from '../config/config.js';


dotenv.config();

const isDocker = fs.existsSync('/.dockerenv');
const endpoint = isDocker ? 'https://localstack:4566' : 'https://localhost:4566';

export const numberOfAccounts = 10;

// General AWS config that can be overridden by specific account configs
export const DEFAULT_AWS_CONFIG = {
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

// Parameters for creating an EC2 instance
export const ec2Params = (uniqueName = generateUniqueId('ec2_')) => ({
	ImageId: 'ami-4ae27e22',
    InstanceType: 't2.micro',
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


export const awsConfig = [
	{
		awsConfig: {
			region: 'us-east-1',
			entityConfig: {
				ec2Instances: 15,
				s3Buckets: 3,
				lambdaFunctions: 3,
				sqsQueues: 4
			}
		}
	},
	{
		awsConfig: {
			region: 'eu-west-2',
			entityConfig: {
				ec2Instances: 10,
				s3Buckets: 7,
				lambdaFunctions: 3,
				sqsQueues: 1
			}
		}
	},
	{
		awsConfig: {
			region: 'ap-southeast-1',
			entityConfig: {
				ec2Instances: 5,
				s3Buckets: 2,
				lambdaFunctions: 6,
				sqsQueues: 2
			}
		}
	},
	{
		awsConfig: {
			region: 'us-west-1',
			entityConfig: {
				ec2Instances: 20,
				s3Buckets: 5,
				lambdaFunctions: 2,
				sqsQueues: 3
			}
		}
	}
	// Add more configurations as needed
];
