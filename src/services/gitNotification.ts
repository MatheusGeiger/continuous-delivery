import { WebClient } from '@slack/web-api';
import { IPullRequestResponse } from '../interfaces/git';

export default class GitNotificationService {
  
  private pullRequest!: any;
  private review!: any;

  public async notifyNewPullRequest({ prResult, branch, body, repository }: { prResult: IPullRequestResponse, branch: string, body: any, repository: string }) {
    let message = `\n\n*Pull Request: ${branch}*`;
    message += `\nRepo: ${repository}`;
    message += `\nTask: ${body.issue.fields.summary}`;
    message += `\nNumero: #${body.issue.key}`;
    
    const slackApi = this.getSlackApiInstance();
    return await slackApi.apiCall('chat.postMessage', {
      channel: process.env.SLACK_CHANNEL_REVIEW,
      username: 'Github',
      icon_url: process.env.SLACK_ICON_URL,
      attachments: [{
        as_user: false,
        color: '#409aff',
        title: 'Novo Pull Request',
        title_link: prResult.createPullRequest.pullRequest.url,
        text: message,
        mrkdwn_in: [
          'text',
        ],
      }],
    });
  }

  public async notifyError(error: any, title: string) {
    const message = JSON.stringify(error, null, 2);

    const slackApi = this.getSlackApiInstance();
    return await slackApi.apiCall('chat.postMessage', {
      channel: process.env.SLACK_CHANNEL_REVIEW,
      username: 'Github',
      icon_url: process.env.SLACK_ICON_URL,
      attachments: [{
        as_user: false,
        color: '#D0D3D4',
        title,
        text: message,
        mrkdwn_in: [
          'text',
        ],
      }],
    });
  }

  public async notifyMergeInStage(pullRequest: any, review: any) {
    this.pullRequest = pullRequest;
    this.review = review;
    const slackApi = this.getSlackApiInstance();
    return await slackApi.apiCall('chat.postMessage', {
      channel: process.env.SLACK_CHANNEL_REVIEW,
      username: 'Github',
      icon_url: process.env.SLACK_ICON_URL,
      attachments: this.getAttachmentsByStatus(),
    });
  }

  private getAttachmentsByStatus() {
    return [{
      as_user: false,
      color: '#D0D3D4',
      ...this.getTitleProperties(),
      text: this.getMessage(),
      mrkdwn_in: [
        'text',
      ],
    }];
  }

  private getMessage() {
    let message = `\n\n*Pull Request: ${this.pullRequest.title}*`;
    message += `\nStatus: ${ this.review.state }`;
    message += `\nPR: ${ this.pullRequest.url }`;
    message += `\nApprovado por ${ this.review.user.login }`;

    return message;
  }

  private getTitleProperties() {
    return { title: `${this.review.state} - Pull Request approvado e mergeado em staging`, title_link: this.pullRequest.url };
  }

  private getSlackApiInstance(): WebClient {
    if (process.env.SLACK_API_TOKEN === undefined) {
      throw new Error('Undefined environment variable SLACK_API_TOKEN');
    }
    return new WebClient(process.env.SLACK_API_TOKEN);
  }
}
