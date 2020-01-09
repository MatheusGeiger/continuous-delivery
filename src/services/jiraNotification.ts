import { WebClient } from '@slack/web-api';

export default class JiraNotificationService {
  
  private issue!: any;

  public async notifyDeployToStage(issueChanged: any) {
    this.issue = issueChanged.issue;
    const slackApi = this.getSlackApiInstance();
    await slackApi.apiCall('chat.postMessage', {
      channel: process.env.SLACK_CHANNEL_DEPLOY,
      username: 'JIRA',
      icon_url: process.env.SLACK_ICON_URL,
      attachments: this.getAttachmentsByStatus({ isProdDeploy: false }),
    });
  }

  public async notifyDeployToProd(issueChanged: any) {
    this.issue = issueChanged.issue;
    const slackApi = this.getSlackApiInstance();
    await slackApi.apiCall('chat.postMessage', {
      channel: process.env.SLACK_CHANNEL_DEPLOY,
      username: 'JIRA',
      icon_url: process.env.SLACK_ICON_URL,
      attachments: this.getAttachmentsByStatus({ isProdDeploy: true }),
    });
  }

  private getAttachmentsByStatus({ isProdDeploy = false }: { isProdDeploy: boolean }) {
    return [{
      as_user: false,
      color: '#D0D3D4',
      ...this.getTitleProperties(isProdDeploy),
      text: this.getMessage({ isProdDeploy }),
      mrkdwn_in: [
        'text',
      ],
    }];
  }

  private getMessage({ isProdDeploy = false }: { isProdDeploy: boolean }) {
    let message = `\n\n*Task: ${this.issue.fields.summary}*`;
    if (!isProdDeploy) { message += `\nDev: ${this.issue.fields.assignee.displayName}`; }
    message += `\n<@U8M53SPJ5>`;
    message += `\n<@U26KVF360>`;

    return message;
  }

  private buildTitleLink() {
    return `https://cubonetwork.atlassian.net/secure/RapidBoard.jspa?rapidView=1&modal=detail&selectedIssue=${this.issue.key}`;
  }

  private getTitleProperties(isProdDeploy: boolean ) {
    const stage = isProdDeploy ? 'Prod' : 'Staging';
    const flag = isProdDeploy ? ':zap:' : ':checkered_flag:';
    return { title: `${ flag } ${this.issue.key} - Task Disponível para teste no ambiente de ${stage}`, title_link: this.buildTitleLink() };
  }

  private getSlackApiInstance(): WebClient {
    if (process.env.SLACK_API_TOKEN === undefined) {
      throw new Error('Undefined environment variable SLACK_API_TOKEN');
    }
    return new WebClient(process.env.SLACK_API_TOKEN);
  }
}
