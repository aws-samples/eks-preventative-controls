## EKS Preventative Controls

This is a project of TypeScript development with CDK for setting up a CodePipeline with EKS preventative control checks via Conftest.

![High Level Architecture](./Solution_Overview.png?raw=true)

### Deployment Steps


At the high level, to deploy the solution, we need to conduct the following steps: 

1. create a new empty AWS CodeCommit repo and git clone that empty repo to your development terminal. Please record the repo name which will be used in later step. In our example, we named the repo as “cdk_auto_k8s_controls”.

* `$ git clone codecommit::ap-southeast-2://cdk_auto_k8s_controls`

2. On your development terminal, git clone the source code of this blog post from the repo.

* `$ git clone https://github.com/aws-samples/eks-preventative-controls.git`
* `$ cd eks-preventative-controls/`

3. Copy the source code of the blog post cloned in step 2 to the other local directory linked to the empty CodeCommit repo created in step 1, and commit & push all the code files to the CodeCommit repo.

* `$ cp -r ./* ../cdk_auto_k8s_controls`
* `$ cd ../cdk_auto_k8s_controls`
* `$ git add .`
* `$ git commit -m "push blog post source code to codecommit repo"`
* `$ git push`

4. Configure the CDK context parameters which will be used to provision the EKS cluster in your AWS account later by the pipeline.

* `$ cd cdk-eks`
* `$ vi cdk.json`
* `(Set the cluster name as you like)`
* `"cluster-name": "cdk-auto-k8s-controls",`
* `(Replace the following example with real VPC ID value)`
* `"vpc-id": "vpc-0xx12345x1230x123",`

5. Configure the CDK context parameters which will be used to provision the pipeline in your AWS account via “cdk deploy”.  

* `$ cd ../cdk-pipeline`
* `$ vi cdk.json`
* `(Set the pipelie name as you like)`
* `"pipeline-name": "EksDeployPipeline",`
* `(Verify the conftest-download-url as below)`
* `"conftest-download-url": "https://github.com/open-policy-agent/conftest/releases/download/v0.24.0/conftest_0.24.0_Linux_x86_64.tar.gz",`
* `(Set the repo name as the one you used in Step 1 described above)`
* `"codecommit-repo-name": "cdk_auto_k8s_controls"`

6. Now provision the CodePipeline instance in your AWS account via “cdk deploy”. It takes around 5-6 minutes.

* `$ npm install`
* `$ npm run build`
* `$ npx cdk ls`
* `CdkPipelineStack`
* `$ npx cdk deploy`
* `...`
* `Do you wish to deploy these changes (y/n)?y`

7. Finish. 

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

