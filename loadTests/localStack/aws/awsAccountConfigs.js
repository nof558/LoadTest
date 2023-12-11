export const numberOfAccounts = 10;

export const awsConfig = [
	{
		accountId: '123456789012',
		roleArn: 'arn:aws:iam::123456789012:role/Test',
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
		accountId: '210987654321',
		roleArn: 'arn:aws:iam::210987654321:role/Test2',
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
	// Example of additional account configurations
	{
		accountId: '345678901234',
		roleArn: 'arn:aws:iam::345678901234:role/Test3',
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
		accountId: '456789012345',
		roleArn: 'arn:aws:iam::456789012345:role/Test4',
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
