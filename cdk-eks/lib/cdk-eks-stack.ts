import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
import * as iam from '@aws-cdk/aws-iam';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface CdkEksStackProps extends cdk.StackProps {
  vpcId?: string;
  clusterName?: string;
}
export class CdkEksStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CdkEksStackProps) {
    super(scope, id, props);

    // cluster master role
    const masterRole = new iam.Role(this, 'cluster-master-role', {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    // Create a EKS cluster with a default managed worker node group.
    const cluster = new eks.Cluster(this, 'my-cluster', {
      version: eks.KubernetesVersion.V1_20,
      mastersRole: masterRole,
      clusterName: props.clusterName,
      outputClusterName: true,
      endpointAccess: eks.EndpointAccess.PUBLIC,
      vpc:
        props.vpcId == undefined
                  ? undefined
                  : ec2.Vpc.fromLookup(this, 'vpc', { vpcId: props?.vpcId! }),
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE }], 
    });
    
    // Apply K8S manifest files under the ../../k8s-manifests folder. 
    const k8sManifestFileDir = path.resolve(__dirname, '..', '..', './k8s-manifests/');

    // Get list of file names under the folder
    const fileList = fs.readdirSync(k8sManifestFileDir);
    console.log(fileList);
    console.log(k8sManifestFileDir);

    for (let fileName of fileList) {
      if (fileName.includes('yaml')) {
        let fileFullPath = `${k8sManifestFileDir}/${fileName}`;
        let k8sYaml = fs.readFileSync(fileFullPath);
        let k8sManifest = yaml.safeLoadAll(k8sYaml.toString());
        let componentName = fileName.split('.')[0];
        cluster.addManifest(`${componentName}`, ...k8sManifest);
      }
    };

  }
}
