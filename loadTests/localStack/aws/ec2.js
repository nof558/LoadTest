// import AWS from 'aws-sdk';
// import { config } from '../config/config.js';

// const ec2 = new AWS.EC2(config);

// export const createEc2Instance = async () => {
//     try {
//         const {Instances} = await ec2.runInstances({
//             ImageId: 'ami-mock',
//             MinCount: 1,
//             MaxCount: 1,
//         }).promise();
//         console.log(`Created EC2 instance with ID: ${Instances[0].InstanceId}`);
//         return Instances[0].InstanceId;
//     } catch (error) {
//         console.error('Error creating EC2 instance:', error.message);
//         throw error;
//     }
// };
