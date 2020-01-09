import Request from 'axios';

export default class GitRestApi {
  protected gitRestEndpoint: string;
  protected gitToken: string;
  protected commomProperties: any;

  constructor() {
    if (process.env.GITHUB_REST_ENDPOINT === undefined || process.env.GITHUB_TOKEN === undefined) {
      throw new Error('GITHUB_GRAPHQL_ENDPOINT or GITHUB_TOKEN cannot be undefined');
    }
    this.gitRestEndpoint = process.env.GITHUB_REST_ENDPOINT;
    this.gitToken = process.env.GITHUB_TOKEN;

    this.commomProperties = {
      headers: {
        Authorization: `Bearer ${this.gitToken}`,
      },
    };
  }

  async deleteBranch({ repoOwner, repository, branch }: { repoOwner: string, repository: string, branch: string }) {
    const url = this.gitRestEndpoint + `/repos/${repoOwner}/${repository}/git/refs/heads/${branch}`;
    return Request.delete(url, this.commomProperties);
  }
}
