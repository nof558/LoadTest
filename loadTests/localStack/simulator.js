import AWSAccountManager from './aws/AWSAccountManager.js';
import {performance} from 'perf_hooks';
import {generateUniqueId, createZipBuffer, simulateDelay} from './config/config.js';
import {ec2Params} from './aws/awsAccountConfigs.js';
import accountManager from './aws/AWSAccountManager.js';

let cleanupInProgress = false;
// TODO: Fix and adjust the metrics measures after the recent changes & add new metrics
// Metrics counters
const metrics = {
	ec2InstancesCreated: 0,
	iamRolesCreated: 0,
	s3BucketsCreated: 0,
	lambdaFunctionsCreated: 0,
	sqsQueuesCreated: 0,
	harvestRequestsSent: 0,
	harvestRequestsSuccessful: 0,
	timings: {},
};

const createEc2Instance = async (ec2, params) => {
	try {
		const start = performance.now();
		const instanceData = await ec2.runInstances(params).promise();
		metrics.ec2InstancesCreated++;
		metrics.timings.ec2Creation = performance.now() - start;
		console.log(`EC2 Instance with ID: ${instanceData.Instances[0].InstanceId} created.`);
		return instanceData.Instances[0].InstanceId;
	} catch (error) {
		console.error('Error during EC2 instance creation:', error.message);
	}
};

const createIamRole = async (iam) => {
	const start = performance.now();
	const roleName = `mockLambdaExecutionRole_${generateUniqueId()}`;
	const params = {
		RoleName: roleName,
		AssumeRolePolicyDocument: JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Principal: {Service: 'lambda.amazonaws.com'},
					Action: 'sts:AssumeRole',
				},
			],
		}),
	};
	try {
		const newRole = await iam.createRole(params).promise();
		console.log(`IAM Role with ARN: ${newRole.Role.Arn} created.`);
		metrics.iamRolesCreated++;
		metrics.timings.iamCreation = performance.now() - start;
		return {roleArn: newRole.Role.Arn, roleName};
	} catch (error) {
		console.error('Error during IAM role creation:', error.message);
		if (error.code === 'EntityAlreadyExists') {
			const role = await iam.getRole({RoleName: roleName}).promise();
			console.log(`IAM Role with ARN: ${role.Role.Arn} already exists.`);
			return {roleArn: role.Role.Arn, roleName};
		} else {
			throw error;
		}
	}
};

const createS3Bucket = async (s3) => {
	const start = performance.now();
	const bucketName = `test-bucket-${generateUniqueId().toLowerCase()}`;
	const params = {
		Bucket: bucketName,
	};
	try {
		await s3.createBucket(params).promise();
		console.log(`S3 Bucket with name: ${bucketName} created.`);
		metrics.s3BucketsCreated++;
		metrics.timings.s3Creation = performance.now() - start;
		return bucketName;
	} catch (error) {
		console.error('Error during S3 bucket creation:', error.message);
		throw error;
	}
};

const createLambdaFunction = async (lambda, roleArn) => {
	const start = performance.now();
	const lambdaFunctionName = `testFunction${generateUniqueId()}`;
	const zipBuffer = await createZipBuffer();
	const params = {
		FunctionName: lambdaFunctionName,
		Role: roleArn,
		Code: {ZipFile: zipBuffer},
		Handler: 'index.handler',
		Runtime: 'nodejs14.x',
	};
	try {
		await lambda.createFunction(params).promise();
		console.log(`Lambda function with name: ${lambdaFunctionName} created.`);
		metrics.lambdaFunctionsCreated++;
		metrics.timings.lambdaCreation = performance.now() - start;
		return lambdaFunctionName;
	} catch (error) {
		console.error('Error during Lambda function creation:', error.message);
		throw error;
	}
};

const createSqsQueue = async (sqs) => {
	const start = performance.now();
	const sqsQueueName = `test-queue-${generateUniqueId()}`;
	const params = {
		QueueName: sqsQueueName,
	};
	try {
		const data = await sqs.createQueue(params).promise();
		console.log(`SQS Queue with URL: ${data.QueueUrl} created.`);
		metrics.sqsQueuesCreated++;
		metrics.timings.sqsCreation = performance.now() - start;
		return data.QueueUrl;
	} catch (error) {
		console.error('Error during SQS queue creation:', error.message);
		throw error;
	}
};

// TODO: Replace params with accountID and add option to harvest from specific entity type only
const harvestResources = async (lambdaFunctionName, bucketName, sqsQueueName) => {
	try {
		const start = performance.now();
		metrics.harvestRequestsSent++;

		// EC2
		const ec2Data = await ec2.describeInstances({}).promise();
		ec2Data.Reservations.forEach((reservation) => {
			reservation.Instances.forEach((instance) => {
				console.log(`EC2 Instance ID: ${instance.InstanceId}, State: ${instance.State.Name}, Type: ${instance.InstanceType}`);
			});
		});

		// S3
		const s3Data = await s3.listBuckets({}).promise();
		s3Data.Buckets.forEach((bucket) => {
			console.log(`S3 Bucket Name: ${bucket.Name}`);
		});

		const bucketPolicy = await s3.getBucketPolicy({Bucket: bucketName}).promise();
		console.log(`S3 Bucket Policy: ${JSON.stringify(bucketPolicy.Policy)}`);

		// Lambda
		const lambdaData = await lambda.getFunction({FunctionName: lambdaFunctionName}).promise();
		const functionConfiguration = await lambda.getFunctionConfiguration({FunctionName: lambdaFunctionName}).promise();
		console.log(`Lambda Function Configuration: ${JSON.stringify(functionConfiguration)}`);
		console.log(`Lambda Function Name: ${lambdaData.Configuration.FunctionName}, Runtime: ${lambdaData.Configuration.Runtime}`);

		// SQS
		const sqsData = await sqs.listQueues({}).promise();
		sqsData.QueueUrls.forEach((queueUrl) => {
			if (queueUrl.includes(sqsQueueName)) {
				console.log(`SQS Queue URL: ${queueUrl}`);
			}
		});
		const queueAttributes = await sqs
			.getQueueAttributes({
				QueueUrl: (await sqs.getQueueUrl({QueueName: sqsQueueName}).promise()).QueueUrl,
				AttributeNames: ['All'],
			})
			.promise();
		console.log(`SQS Queue Attributes: ${JSON.stringify(queueAttributes.Attributes)}`);

		metrics.harvestRequestsSuccessful++;
		metrics.timings.harvestDuration = performance.now() - start;
	} catch (error) {
		console.error('Error during resource harvesting:', error.message);
	}
};

const cleanupResources = async (roleName, lambdaFunctionName, cleanupBucketName, sqsQueueName) => {
	if (cleanupInProgress) {
		console.log('Cleanup already in progress. Exiting...');
		return;
	}
	cleanupInProgress = true;
	const cleanupStartTime = Date.now();
	console.log('Starting cleanup process...');

	try {
		const ec2Data = await ec2.describeInstances({}).promise();
		const instanceIds = ec2Data.Reservations.flatMap((reservation) => reservation.Instances.map((instance) => instance.InstanceId));

		if (instanceIds.length) {
			await ec2.terminateInstances({InstanceIds: instanceIds}).promise();
			console.log('Cleaned up EC2 instances.');
		}

		await s3.deleteBucket({Bucket: cleanupBucketName}).promise();
		console.log(`Cleaned up S3 bucket: ${cleanupBucketName}`);

		await lambda.deleteFunction({FunctionName: lambdaFunctionName}).promise();
		console.log(`Cleaned up Lambda function: ${lambdaFunctionName}`);

		const {QueueUrl} = await sqs.getQueueUrl({QueueName: sqsQueueName}).promise();
		await sqs.deleteQueue({QueueUrl}).promise();
		console.log(`Cleaned up SQS queue: ${QueueUrl}`);

		await iam.deleteRole({RoleName: roleName}).promise();
		console.log(`Cleaned up IAM role: ${roleName}`);

		const cleanupDuration = Date.now() - cleanupStartTime;
		console.log(`Cleanup completed in ${cleanupDuration} ms.`);
		cleanupInProgress = false;

		const postCleanupEc2Data = await ec2.describeInstances({}).promise();
		if (postCleanupEc2Data.Reservations.length === 0) {
			console.log('All EC2 instances successfully terminated.');
		} else {
			console.log(`Warning: ${postCleanupEc2Data.Reservations.length} EC2 instances still exist post-cleanup.`);
		}
	} catch (error) {
		console.error('Error during resource cleanup:', error.message);
	}
};

const createResourcesForAccount = async (accountIdentifier) => {
	const accountConfig = accountManager.accounts[accountIdentifier];
	const {ec2, iam, s3, sqs, lambda} = await accountManager.getAccount(accountIdentifier);

	// Create EC2 Instances
	for (let i = 0; i < accountConfig.awsConfig.entityConfig.ec2Instances; i++) {
		let uniqueName = `mockEc2Instance_${generateUniqueId()}`;
		await createEc2Instance(ec2, ec2Params(uniqueName));
		await simulateDelay(1000);
	}

	// Create S3 Buckets
	for (let i = 0; i < accountConfig.awsConfig.entityConfig.s3Buckets; i++) {
		await createS3Bucket(s3);
		await simulateDelay(1000);
	}

	// Create Lambda Functions
	const { roleArn } = await createIamRole(iam); // Assuming one role for all lambda functions
	for (let i = 0; i < accountConfig.awsConfig.entityConfig.lambdaFunctions; i++) {
		await createLambdaFunction(lambda, roleArn);
		await simulateDelay(1000);
	}

	// Create SQS Queues
	for (let i = 0; i < accountConfig.awsConfig.entityConfig.sqsQueues; i++) {
		await createSqsQueue(sqs);
		await simulateDelay(1000);
	}

	console.log(`Resources created for account: ${accountIdentifier}`);
	await simulateDelay(3000);
};

// TODO: Add support for creating specific aws account instead creating all accounts from the configs file
const createResources = async () => {
	for (const accountIdentifier in accountManager.accounts) {
		try {
			await createResourcesForAccount(accountIdentifier);
			await simulateDelay(5000);
		} catch (error) {
			console.error(`Error creating resources for account ${accountIdentifier}:`, error);
		}
	}
	console.log('All resources created across accounts.');
};

export {createResources, harvestResources, cleanupResources};
