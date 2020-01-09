import { Logger } from '@cubo.network/cubo-core-ts';
import { WebClient } from '@slack/web-api';
import { CodePipelineCloudWatchPipelineEvent, CodePipelineState } from 'aws-lambda';
import { AWSError, CodePipeline } from 'aws-sdk';
import { GetPipelineExecutionOutput, PipelineExecution } from 'aws-sdk/clients/codepipeline';
import JiraApi from './jiraApi';

export default class DeployNotificationService {

  private codePipelineExecution: PipelineExecution | undefined;
  private codePipelineEvent!: CodePipelineCloudWatchPipelineEvent;

  private colorMessage = {
    STARTED: '#D0D3D4',
    SUCCEEDED: '#36a64f',
    RESUMED: '#D0D3D4',
    FAILED: '#E74C3C',
    CANCELED: '#D0D3D4',
    SUPERSEDED: '#D0D3D4',
  };

  public async notifyDeploy(codePipelineEventSnS: CodePipelineCloudWatchPipelineEvent) {
    this.codePipelineEvent = codePipelineEventSnS;
    const execution = this.codePipelineEvent.detail['execution-id'];
    const name = this.codePipelineEvent.detail.pipeline;

    const codePipelineApi = new CodePipeline();
    await codePipelineApi.getPipelineExecution({ pipelineName: name, pipelineExecutionId: execution }, (err, data) => this.callbackPipelineExecution(err, data));
  }

  private isProdDeploy(): boolean {
    return this.codePipelineEvent.detail.pipeline.includes('prod');
  }

  private async moveCardJira() {
    const jiraApi = new JiraApi();

    if (this.codePipelineExecution !== undefined && this.codePipelineExecution.artifactRevisions !== undefined) {
      let commitMessage: string | undefined;
      this.codePipelineExecution.artifactRevisions.forEach((ce) =>  commitMessage = ce.revisionSummary );
      if (commitMessage !== undefined) {
        const keyJitRegex = jiraApi.getKeyFromPrTitle({ titlePullRequest: commitMessage });
        return this.isProdDeploy() ? await jiraApi.transitionTestedToDone({ key : keyJitRegex }) : await jiraApi.transitionDeployedToStage({ key : keyJitRegex });
      }
    }
  }

  private async callbackPipelineExecution(err: AWSError, data: GetPipelineExecutionOutput) {
    if (err) throw new Error(err.stack);
    this.codePipelineExecution = data.pipelineExecution;
    
    const statusCodePipeline = this.codePipelineEvent.detail.state;
    if (statusCodePipeline === 'SUCCEEDED') { this.moveCardJira(); }

    const slackApi = this.getSlackApiInstance();
    await slackApi.apiCall('chat.postMessage', {
      channel: process.env.SLACK_CHANNEL_PIPELINE,
      username: 'Continuous Delivery',
      icon_url: process.env.SLACK_ICON_URL,
      attachments: this.getAttachmentsByStatus(),
    });
  }

  private getAttachmentsByStatus() {
    const statusCodePipeline = this.codePipelineEvent.detail.state;
    const pipeline = this.codePipelineEvent.detail.pipeline;
    const execution = this.codePipelineEvent.detail['execution-id'];

    return [{
      as_user: false,
      color: this.colorMessage[statusCodePipeline],
      ...this.getTitlePropertiesNotificationByStatus(statusCodePipeline, pipeline, execution),
      text: this.getMessage(),
      mrkdwn_in: [
        'text',
      ],
    }];
  }

  private getMessage() {
    let message = `\n\n*Pipeline ${this.codePipelineEvent.detail.pipeline}*`;
    message += `\nStatus: ${this.codePipelineEvent.detail.state}`;
    message += `\nExecution Id: ${this.codePipelineEvent.detail['execution-id']}`;

    if (this.codePipelineExecution !== undefined && this.codePipelineExecution.artifactRevisions !== undefined) {
      Logger.info('[continuous-delivery][slackNotification][pipelineDetails]', JSON.stringify(this.codePipelineExecution));
      
      message += (this.codePipelineExecution.artifactRevisions.length > 0) ? '\n\n*Git*' : '';
      this.codePipelineExecution.artifactRevisions.forEach((ce) => {
        message += `\nCommit: ${ce.revisionSummary}`;
        message += `\nUrl: ${ce.revisionUrl}`;
      });
    }

    return message;
  }

  private buildTitleLink(pipeline: string, execution: string) {
    return `https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline}/executions/${execution}/timeline`;

  }

  private getTitlePropertiesNotificationByStatus(statusCodePipeline: CodePipelineState, pipeline: string, execution: string) {
    switch (statusCodePipeline) {
      case 'STARTED':
        return { title: `:gear: ${pipeline}`, title_link: this.buildTitleLink(pipeline, execution) };
      case 'FAILED':
        return { title: `:rotating_light: ${pipeline}`, title_link: this.buildTitleLink(pipeline, execution) };
      case 'SUCCEEDED':
        return { title: `:xhamps: ${pipeline}`, title_link: this.buildTitleLink(pipeline, execution) };
      default:
        return { title: `:warning: ${pipeline}`, title_link: this.buildTitleLink(pipeline, execution) };
    }
  }

  private getSlackApiInstance(): WebClient {
    if (process.env.SLACK_API_TOKEN === undefined) {
      throw new Error('Undefined environment variable SLACK_API_TOKEN');
    }
    return new WebClient(process.env.SLACK_API_TOKEN);
  }
}
