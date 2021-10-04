/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import * as codecommit from '@aws-cdk/aws-codecommit';

export class CdkPipelineStack extends cdk.Stack {

  private readonly pipelineName = this.fromContext(this, 'pipeline-name');
  private readonly codecommitRepoName = this.fromContext(this, 'codecommit-repo-name');

  //Use conftest download url as described in https://www.conftest.dev/install/
  private readonly conftestDownloadUrl = this.fromContext(this, 'conftest-download-url');


  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stack = cdk.Stack.of(this);

    // Create an empty AWS CodePipeline. 
    const pipeline = new codepipeline.Pipeline(this, 'EksDeployPipeline', {
      pipelineName: this.pipelineName,
      restartExecutionOnUpdate: true,
    });

    // import the existing CodeCommit repo.
    const repo = codecommit.Repository.fromRepositoryName(this, 'SourceRepo', this.codecommitRepoName);

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CodeCommit',
      repository: repo,
      branch: 'main',
      output: sourceOutput,
    });

    // Create the CodeBuild step of validating K8S manifest files via conftest
    const k8sValidationAction = this.k8sValidationAction(sourceOutput);

    // Create a manual approval step
    const manualApproval = new codepipeline_actions.ManualApprovalAction({
      actionName: 'ApproveDeployment',
      runOrder: 1
    });

    // Create the CodeBuild step to deploy the CDK app via cdk commands
    const cdkDeployAction = this.cdkDeployAction(sourceOutput, 2);

    // Add S3 source action to the pipline
    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    // Add CodeBuid step of validating K8S manifest files to the pipeline. 
    pipeline.addStage({
      stageName: 'ValidateK8sManifests',
      actions: [k8sValidationAction],
    })

    // Add the EKS workload deployment stage
    pipeline.addStage({
      stageName: 'DeployEksWordloads',
      actions: [manualApproval, cdkDeployAction],
    });
  }

  // Private function to create CodePipeline action and associated CodeBuild Project of validating K8S manifests
  private k8sValidationAction(pipelineInput: codepipeline.Artifact) : codepipeline_actions.CodeBuildAction {
    // Create build spec for the CodeBuild project for running conftest to validate K8S manifest files
    const conftestFileName = this.conftestDownloadUrl.split('/').slice(-1)[0];
    const k8sValidationBuildSpec = codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        pre_build: {
          commands: [
            "ls -rtla $CODEBUILD_SRC_DIR/",
            "cd conftest/bin",
            "ls -rtla",
            `wget ${this.conftestDownloadUrl} >/dev/null 2>&1`,
            `tar xzf ${conftestFileName}`,
            "ls -rtla"
          ],
        },
        build: {
          commands: [
            "./conftest test ../../k8s-manifests/ --combine"
          ]
        },
      }
    });

    // Create CodeBuild project for running conftest to validate K8S manifest files
    const k8sValidationCodeBuildProject = new codebuild.Project(this, 'K8sValidationCodeBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: k8sValidationBuildSpec,
    });

    // Create the CodePipeline action and associate it with the CodeBuild Project above
    const k8sValidationAction = new codepipeline_actions.CodeBuildAction({
      actionName: "ValidateK8sManifests",
      project: k8sValidationCodeBuildProject,
      input: pipelineInput,
    });

    return k8sValidationAction;
  }

  // Private function to create CodePipeline action and associated CodeBuild Project of deploying CDK app.
  private cdkDeployAction(pipelineInput: codepipeline.Artifact, runOrder: number) : codepipeline_actions.CodeBuildAction {
    // Create build spec for the CodeBuild project for deploying CDK app
    const cdkDeployActionSpec = codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        pre_build: {
          commands: [
            "ls -rtla $CODEBUILD_SRC_DIR/",
            "cd cdk-eks",
            "ls -rtla",
            "npm install",
            "npm run build",
          ],
        },
        build: {
          commands: [
            "npx cdk deploy --require-approval never"
          ]
        },
      }
    });

    // Create CodeBuild project for running conftest to validate K8S manifest files
    const cdkDeployCodeBuildProject = new codebuild.Project(this, 'cdkDeployCodeBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: cdkDeployActionSpec,
    });

    cdkDeployCodeBuildProject.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    
    // Create the CodePipeline action and associate it with the CodeBuild Project above
    const cdkDeployAction = new codepipeline_actions.CodeBuildAction({
      actionName: "DeployCDKApp",
      project: cdkDeployCodeBuildProject,
      input: pipelineInput,
      runOrder
    });

    return cdkDeployAction;
  }

  // Private function to retrieve values from context with error handling. 
  private fromContext(scope: cdk.Construct, key: string): string {

    const result = scope.node.tryGetContext(key);

    if (result) {
      return result.toString();
    } else {
      throw new Error('Unalbe to retrieve context varialbe of ' + key)
    }
  }

}
