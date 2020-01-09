import { GraphQLClient } from 'graphql-request';

export default class GitGraphQl {
  protected gitGraphQlEndpoint: string;
  protected gitToken: string;
  private graphCli: GraphQLClient;

  constructor() {
    if (process.env.GITHUB_GRAPHQL_ENDPOINT === undefined || process.env.GITHUB_TOKEN === undefined) {
      throw new Error('GITHUB_GRAPHQL_ENDPOINT or GITHUB_TOKEN cannot be undefined');
    }
    this.gitGraphQlEndpoint = process.env.GITHUB_GRAPHQL_ENDPOINT;
    this.gitToken = process.env.GITHUB_TOKEN;

    this.graphCli = new GraphQLClient(this.gitGraphQlEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.gitToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  public async mergeBranch({ baseBranch, refBranch, commitMessage, repositoryId }: { baseBranch: string, refBranch: string, commitMessage: string, repositoryId: string }): Promise<any> {
    const mutation = `mutation MergeBranchStaging {
      mergeBranch(input: {
          repositoryId: "${repositoryId}",
          base: "${baseBranch}",
          head: "${refBranch}",
          commitMessage: "${commitMessage}",
          clientMutationId: "${commitMessage} - ${baseBranch} to ${refBranch}",
        }) {
          clientMutationId,
          mergeCommit {
            url
          }
        }
      }
    `;
    return await this.graphCli.request(mutation);
  }

  public async getRepositoryByName({ repoName }: { repoName: string }): Promise<any> {
    const query = `query GetRepositoryByName {
      repository(name: "${repoName}", owner: "cubonetwork") { id }
    }`;
    return await this.graphCli.request(query);
  }

  public async openPullRequest({ baseRefName, headRefName, title, repositoryId }: { baseRefName: string, headRefName: string, title: string, repositoryId: string }): Promise<any> {
    const mutation = `mutation OpenPullRequest {
      createPullRequest(input: {
          repositoryId: "${repositoryId}",
          baseRefName: "${baseRefName}",
          headRefName: "${headRefName}",
          title: "${title}",
          clientMutationId: "${title} - ${baseRefName} to ${headRefName}"
        }) {
          clientMutationId,
          pullRequest {
            url,
            id
          }
        }
      }
    `;
    return await this.graphCli.request(mutation);
  }

  public async assignPullRequestToUser({ assigneeIds, assignableId }: { assigneeIds: string, assignableId: string }): Promise<any> {
    const mutation = `mutation AddAssigneesToAssignableInput {
      addAssigneesToAssignable(input: {
        assignableId: "${assignableId}",
        assigneeIds: ["${assigneeIds}"]
      }) {
        clientMutationId
      }
    }
    `;
    return await this.graphCli.request(mutation);
  }

  public async getPullRequestList({ repoOwner, repoName, state, headRefName }: { repoOwner: string, repoName: string, state: 'OPEN' | 'CLOSED' | 'MERGED', headRefName: string }): Promise<any> {
    const query = `query pullRequestList {
      repository(owner: "${repoOwner}", name: "${repoName}") {
        id,
        pullRequests(states: ${state}, headRefName: "${headRefName}", first:1){
          nodes {
            id,
            title
            state,
            headRefName,
          }
        }
      }
    }
    `;
    return await this.graphCli.request(query);
  }

  public async mergePullRequest({ pullRequestId }: { pullRequestId: string }): Promise<any> {
    const mutation = `mutation MergePullRequest {
      mergePullRequest(input: {
        pullRequestId: "${pullRequestId}"
      }){
        clientMutationId
      }
    }
    `;
    return await this.graphCli.request(mutation);
  }
}
