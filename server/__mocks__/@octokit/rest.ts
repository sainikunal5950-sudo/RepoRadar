export const mockOctokitInstance = {
  rest: {
    repos: {
      listForAuthenticatedUser: jest.fn(),
      get: jest.fn(),
      listLanguages: jest.fn(),
      listCommits: jest.fn(),
      getContent: jest.fn(),
    },
    search: {
      issuesAndPullRequests: jest.fn(),
    },
    git: {
      getTree: jest.fn(),
    },
    pulls: {
      list: jest.fn(),
    },
  },
};

export const Octokit = jest.fn().mockImplementation(() => mockOctokitInstance);

export default { Octokit };
