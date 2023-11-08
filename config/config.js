import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';

dotenv.config();

const isDocker = fs.existsSync('/.dockerenv');
const endpoint = isDocker ? 'https://localstack:4566' : 'https://localhost:4566';

// awsConfig now is a function that accepts overrides to allow different configurations per account
const getAWSConfig = (overrides = {}) => ({
  region: overrides.region || process.env.AWS_REGION || 'us-east-1',
  endpoint,
  sslEnabled: true,
  s3ForcePathStyle: true,
  httpOptions: {
    agent: new https.Agent({
      rejectUnauthorized: false,
    }),
  },
  ...overrides, // Apply any config overrides
});

// Removed the global sts instance since we will create it per account as needed

let cachedCredentials = {};

const assumeRole = async (roleArn, configOverrides) => {
  try {
    console.log('Attempting to assume role...');
    const awsConfig = getAWSConfig(configOverrides);
    const sts = new AWS.STS(awsConfig);
    const assumedRole = await sts
      .assumeRole({
        RoleArn: roleArn,
        RoleSessionName: `session-${uuidv4()}`,
        DurationSeconds: 3600,
      })
      .promise();

    cachedCredentials[roleArn] = {
      accessKeyId: assumedRole.Credentials.AccessKeyId,
      secretAccessKey: assumedRole.Credentials.SecretAccessKey,
      sessionToken: assumedRole.Credentials.SessionToken,
      expiration: assumedRole.Credentials.Expiration, // Store expiration
    };

    console.log('Assumed role successfully');
    return cachedCredentials[roleArn];
  } catch (error) {
    console.error('Error assuming role:', error.message);
    throw error;
  }
};

const getCredentials = async (roleArn, configOverrides) => {
  if (!cachedCredentials[roleArn] || new Date(cachedCredentials[roleArn].expiration) <= new Date()) {
    return await assumeRole(roleArn, configOverrides);
  }
  return cachedCredentials[roleArn];
};

const generateUniqueId = () => {
  return `${Date.now()}-${uuidv4()}`;
};

const createZipBuffer = async () => {
  const zip = new JSZip();
  zip.file('index.js', 'exports.handler = function(event, ctx, callback) { callback(null, "Hello from Lambda"); }');
  return await zip.generateAsync({ type: 'nodebuffer' });
};

// The params function now accepts an object to allow different configurations per account
const params = ({ uniqueName, imageId = 'ami-mock' }) => ({
  ImageId: imageId,
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

export { getCredentials, getAWSConfig, generateUniqueId, createZipBuffer, params };
