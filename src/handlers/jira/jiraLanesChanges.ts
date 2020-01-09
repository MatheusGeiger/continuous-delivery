import { Lambda, Logger } from '@cubo.network/cubo-core-ts';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { IPullRequestList, IPullRequestListNode, IPullRequestResponse, IRepositoryByNameResponse } from '../../interfaces/git';
import { IRepository } from '../../interfaces/jira';
import GitGraphQl from '../../services/gitGraphQl';
import GitNotificationService from '../../services/gitNotification';
import GitRestApi from '../../services/gitRestApi';
import JiraNotificationService from '../../services/jiraNotification';

// JIRA ISSUE FIELDS
// customfield_10052 = repositórios
// customfield_10053 = branch

function openPullRequest(repos: Array<{ repository: IRepository }>, branch: string, body: any, userAssignePrId: string) {
  return repos.map(async (repository: any) => {
    const repositoryDetail: IRepositoryByNameResponse = await new GitGraphQl().getRepositoryByName({ repoName: repository.value });
    const prResult: IPullRequestResponse = await new GitGraphQl().openPullRequest({
      title: `${body.issue.fields.summary} #${body.issue.key}`,
      baseRefName: 'master',
      headRefName: branch,
      repositoryId: repositoryDetail.repository.id,
    });
    await new GitGraphQl().assignPullRequestToUser({
      assignableId: prResult.createPullRequest.pullRequest.id, assigneeIds: userAssignePrId,
    });
    await new GitNotificationService().notifyNewPullRequest({ prResult, branch, body, repository: repository.value });
  });
}

async function requestMergePullRequest({ pullRequestsNodes }: { pullRequestsNodes: IPullRequestListNode[] }) {
  return await Promise.all(pullRequestsNodes.map(async (pr: IPullRequestListNode) => {
    await new GitGraphQl().mergePullRequest({ pullRequestId: pr.id });
  }));
}

function mergePullRequest(repos: Array<{ repository: IRepository }>, branch: string) {
  return repos.map(async (repository: any) => {
    const pullRequestList: IPullRequestList = await new GitGraphQl().getPullRequestList({ 
      repoOwner: 'cubonetwork',
      state: 'OPEN',
      repoName: repository.value,
      headRefName: branch,
    });

    const pullRequestsNodes = pullRequestList.repository.pullRequests.nodes;
    if (pullRequestsNodes === undefined || pullRequestsNodes.length < 1) {
      return true;
    }

    await requestMergePullRequest({ pullRequestsNodes });
  });
}

function getUserAssignIdFromJira(jiraEmail: string): string {
  const userKeys = [
    {
      id: 'MDQ6VXNlcjIyOTg3MDc5',
      email: 'matheus.slgd@gmail.com',
      jiraEmail: 'matheus@cubo.network',
    },
    {
      id: 'MDQ6VXNlcjM2MDM3OTM=',
      email: 'hi@felipefialho.com',
      jiraEmail: 'felipe@cubo.network',
    },
    {
      id: 'MDQ6VXNlcjE5OTc4MzM2',
      email: 'vitorpiovezam@yandex.com',
      jiraEmail: 'vitor@cubo.network',
    },
    {
      id: 'MDQ6VXNlcjIyNjkwMQ==',
      email: 'muriloamendola@gmail.com',
      jiraEmail: 'murilo@cubo.network',
    }
  ];

  const user = userKeys.find((u) => (u.jiraEmail === jiraEmail));
  return user !== undefined ? user.id : 'MDQ6VXNlcjUzNjI4NjAx';
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  try {
    Logger.logAPIGatewayEvent({
      service: 'continuous-delivery',
      handler: 'jiraLanesChanges',
      event,
    });
    Logger.info('[continuous-delivery][jiraLanesChanges][event]', event);
    Logger.info('[continuous-delivery][jiraLanesChanges][context]', context);

    if (event.body === undefined || event.body === null) {
      return Lambda.Response.badRequest('Not To Do');
    }

    const body = JSON.parse(event.body);

    if (body.transition.to_status === 'Deployed to Stage') {
      await new JiraNotificationService().notifyDeployToStage(body);
      return Lambda.Response.success('SUCCESS');
    }

    if (body.transition.to_status === 'Done') {
      const repos: Array<{ repository: IRepository }> | null = body.issue.fields.customfield_10052;
      const branch: string = body.issue.fields.customfield_10053;

      try {
        if (repos === null || repos === undefined) { return Lambda.Response.success('SUCCESS'); }
        await Promise.all(
          repos.map(async (r: any) => {
            await new GitRestApi().deleteBranch({ branch, repository: r.value, repoOwner: 'cubonetwork' });
          }),
        );
        await new JiraNotificationService().notifyDeployToProd(body);
        return Lambda.Response.success('SUCCESS');
      } catch (e) {
        console.log('ERROR', e);
        // await new GitNotificationService().notifyError(e, 'Ocorreu algum problema ao deletar a branch');
        return Lambda.Response.failure(e);
      }
    }

    if (body.transition.to_status === 'Ready to Review') {
      const repos: Array<{ repository: IRepository }> | null = body.issue.fields.customfield_10052;
      const branch: string = body.issue.fields.customfield_10053;
      const userAssigneeJira = body.issue.fields.assignee.emailAddress;
      const userAssignePrId = getUserAssignIdFromJira(userAssigneeJira);

      try {
        if (repos === null) { return Lambda.Response.success('SUCCESS'); }
        await Promise.all(openPullRequest(repos, branch, body, userAssignePrId));
        return Lambda.Response.success('SUCCESS');
      } catch (e) {
        console.log('ERROR', e);
        // await new GitNotificationService().notifyError(e, 'Ocorreu algum problema ao abrir o Pull Request');
        return Lambda.Response.failure(e);
      }
    }

    if (body.transition.to_status === 'Tested') {
      const repos: Array<{ repository: IRepository }> | null = body.issue.fields.customfield_10052;
      const branch: string = body.issue.fields.customfield_10053;

      try {
        if (repos === null) { return Lambda.Response.success('SUCCESS'); }
        await Promise.all(mergePullRequest(repos, branch));
        return Lambda.Response.success('SUCCESS');
      } catch (e) {
        console.log('ERROR', e);
        // await new GitNotificationService().notifyError(e, 'Ocorreu algum problema ao abrir o Pull Request');
        return Lambda.Response.failure(e);
      }
    }

    return Lambda.Response.success('SUCCESS');
  } catch (e) {
    Logger.error('[continuous-delivery][jiraLanesChanges]', e);
    return Lambda.Response.failure(e);
  }
};
