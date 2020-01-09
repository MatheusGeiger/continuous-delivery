import Request from 'axios';

export default class JiraApi {
  protected jiraEndpoint: string;
  protected jiraApiToken: string;
  protected commomProperties: object;
  protected transtitions = [
    {
      id: '221',
      name: 'To Do',
    },
    {
      id: '241',
      name: 'InProgressForReadyReviewPR',
    },
    {
      id: '251',
      name: 'ReadyToReviewToReadyToMerge',
    },
    {
      id: '261',
      name: 'ReadyToMergeToDeployedToStage',
    },
    {
      id: '271',
      name: 'DeployedToStageToTesting',
    },
    {
      id: '281',
      name: 'TestingToTested',
    },
    {
      id: '291',
      name: 'TestedToDone',
    },
  ];

  constructor() {
    if (process.env.JIRA_API_ENDPOINT === undefined || process.env.JIRA_API_TOKEN === undefined) {
      throw new Error('JIRA_API_ENDPOINT or JIRA_API_TOKEN cannot be undefined');
    }
    this.jiraEndpoint = process.env.JIRA_API_ENDPOINT;
    this.jiraApiToken = process.env.JIRA_API_TOKEN;

    this.commomProperties = {
      headers: {
        'Authorization': `Basic ${this.jiraApiToken}`,
        'Content-Type': 'application/json',
      },
    };
  }

  getKeyFromPrTitle({ titlePullRequest }: { titlePullRequest: string }): string {
    const regex = /(CUBO.*)(?:\d)/;
    const keyJitRegex = titlePullRequest.match(regex);
    if (keyJitRegex === null) { throw new Error('Key not finded in pull request title'); }
    return keyJitRegex[0];
  }

  makeTransitionCard({ key, transitionId }: { key: string, transitionId: string }): Promise<any> {
    const url = this.jiraEndpoint + `/issue/${key}/transitions`;
    const body = { transition: { id: transitionId } };
    return Request.post(url, body, this.commomProperties);
  }

  transitionReadyToMerge({ key }: { key: string }): Promise<any> {
    return this.makeTransitionCard( { key, transitionId: '251' });
  }

  transitionDeployedToStage({ key }: { key: string }): Promise<any> {
    return this.makeTransitionCard( { key, transitionId: '261' });
  }

  transitionTestedToDone({ key }: { key: string }): Promise<any> {
    return this.makeTransitionCard( { key, transitionId: '291' });
  }
}
