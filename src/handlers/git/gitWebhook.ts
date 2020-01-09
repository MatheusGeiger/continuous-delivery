import { Lambda, Logger } from '@cubo.network/cubo-core-ts';
import { APIGatewayProxyHandler } from 'aws-lambda';
import GitGraphQl from '../../services/gitGraphQl';
import GitNotificationService from '../../services/gitNotification';
import JiraApi from '../../services/jiraApi';

export const handler: APIGatewayProxyHandler = async (event, context) => {
  try {
    Logger.logAPIGatewayEvent({
      service: 'continuous-delivery',
      handler: 'gitWebhook',
      event,
    });
    Logger.info('[continuous-delivery][gitWebhook][event]', event);
    Logger.info('[continuous-delivery][gitWebhook][context]', context);

    if (event.body === undefined || event.body === null) {
      return Lambda.Response.badRequest('Not To Do');
    }

    const body = JSON.parse(event.body);
    const review = body.review;
    const pullRequest = body.pull_request;
    const repository = body.repository;
    const keyTaskJira = new JiraApi().getKeyFromPrTitle({ titlePullRequest: pullRequest.title });
    // const sender = body.sender; 

    if (review.state === 'approved') {
      const mergeBranchResult = await new GitGraphQl().mergeBranch({
        baseBranch: 'staging',
        refBranch: pullRequest.head.ref,
        commitMessage: pullRequest.title,
        repositoryId: repository.node_id,
      });
      await new GitNotificationService().notifyMergeInStage(pullRequest, review);
      await new JiraApi().transitionReadyToMerge({ key: keyTaskJira });
      Logger.info('[continuous-delivery][gitWebhook][mergeBranchResult]', JSON.stringify(mergeBranchResult));
    }

    return Lambda.Response.success('SUCCESS');
  } catch (e) {
    // await new GitNotificationService().notifyError(e, 'Ocorreu algum problema ao mergear o Pull Request');
    Logger.error('[continuous-delivery][gitWebhook]', e);
    return Lambda.Response.failure(e);
  }
};
