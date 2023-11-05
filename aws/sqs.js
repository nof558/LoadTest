// import AWS from 'aws-sdk';
// import { config } from '../config/config.js';

// const sqs = new AWS.SQS(config);

// export const createSqsQueue = async () => {
// 	try {
// 		const {QueueUrl} = await sqs.createQueue({QueueName: sqsQueueName}).promise();
// 		return QueueUrl;
// 	} catch (error) {
// 		if (error.code !== 'QueueAlreadyExists') {
// 			throw error;
// 		}
// 	}
// };