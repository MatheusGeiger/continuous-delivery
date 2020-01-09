export interface IPullRequestResponse {
  createPullRequest: {
    clientMutationId: string;
    pullRequest: {
      url: string;
      id: string;
    }
  };
}

export interface IRepositoryByNameResponse {
  repository: {
    id: string;
    name: string;
    description: string;
  };
}

export interface IPullRequestListNode {
  id: string;
  title: string;
  state: string;
  headRefName: string;
}

export interface IPullRequestList {
  repository: {
    id: string;
    name: string;
    pullRequests: {
      nodes: IPullRequestListNode[] | [];
    }
  };
}
