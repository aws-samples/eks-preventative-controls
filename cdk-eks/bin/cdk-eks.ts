#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkEksStack } from '../lib/cdk-eks-stack';

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();
new CdkEksStack(app, 'CdkEksStack-AutoK8sControls', {
    env: env,
    // clusterName: 'your-cluster-name',  // if you don't specify the EKS cluster name, CDK will create the name for you.
    clusterName: 'cdk-auto-k8s-controls',
    //vpcId: 'your-vpc-id',
    vpcId: 'vpc-0cc19710c1260b111',
    // If you speficy an existing vpc-id, then CDK will use this existing VPC to create EKS cluster instead of 
    // creating a new VPC. Please note when using an existing VPC, please make sure its private subnets have been tagged with 
    // "kubernetes.io/role/internal-elb: 1" as described in https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html
});
