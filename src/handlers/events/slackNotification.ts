import { Logger } from '@cubo.network/cubo-core-ts';
import { CodePipelineCloudWatchPipelineHandler } from 'aws-lambda';
import DeployNotificationService from '../../services/deployNotification';

export const handler: CodePipelineCloudWatchPipelineHandler = async (event, context, callback) => {
  try {
    Logger.info('[continuous-delivery][slackNotification][event]', event);
    Logger.info('[continuous-delivery][slackNotification][context]', context);

    await new DeployNotificationService().notifyDeploy(event);
    callback(null);
  } catch (e) {
    Logger.error('[continuous-delivery][slackNotification]', e);
    callback(e);
  }
};
