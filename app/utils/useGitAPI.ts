import axios from 'axios';

interface ContributionDay {
  contributionCount: number;
  date: string;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface ContributionData {
  totalContributions: number;
  weeks: ContributionWeek[];
}

interface RepoLanguage {
  name: string;
  size: number;
}

interface RepoDetail {
  name: string;
  stars: number;
  languages: string[];
}

interface GitHubRepo {
  name: string;
  languages: {
    edges: {
      size: number;
      node: {
        name: string;
        color: string;
      };
    }[];
  };
  stargazers: {
    totalCount: number;
  };
}

export async function fetchGitHubContributions(username: string, year: number = 2025): Promise<ContributionData> {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  username = username.replaceAll(' ', '');

  const query = `
    query ContributionGraph($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://api.github.com/graphql',
      {
        query,
        variables: {
          username,
          from: `${year}-01-01T00:00:00Z`,
          to: `${year}-12-31T23:59:59Z`,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.user.contributionsCollection.contributionCalendar;
  } catch (error) {
    console.error('Error fetching GitHub contributions:', error);
    throw error;
  }
}

export function processContributionData(data: ContributionData): { totalContributions: number; contributionMap: Record<string, number> } {
  const contributionMap: Record<string, number> = {};

  data.weeks.forEach((week) => {
    week.contributionDays.forEach((day) => {
      contributionMap[day.date] = day.contributionCount;
    });
  });

  return {
    totalContributions: data.totalContributions,
    contributionMap,
  };
}

export async function fetchRepoLanguages(username: string): Promise<GitHubRepo[]> {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  const query = `
    query Repositories($username: String!) {
      user(login: $username) {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          nodes {
            name
            languages(first: 10) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
            stargazers {
              totalCount
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://api.github.com/graphql',
      {
        query,
        variables: { username },
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.user.repositories.nodes;
  } catch (error) {
    console.error('Error fetching repository languages:', error);
    throw error;
  }
}

export function processRepoLanguages(repositories: GitHubRepo[]): { topLanguages: RepoLanguage[]; repoDetails: RepoDetail[] } {
  const languageMap: Record<string, number> = {};
  const repoDetails: RepoDetail[] = [];

  repositories.forEach((repo) => {
    const languages: RepoLanguage[] = repo.languages.edges.map((lang) => ({
      name: lang.node.name,
      size: lang.size,
    }));

    repoDetails.push({
      name: repo.name,
      stars: repo.stargazers.totalCount,
      languages: languages.map((lang) => lang.name),
    });

    languages.forEach((lang) => {
      languageMap[lang.name] = (languageMap[lang.name] || 0) + lang.size;
    });
  });

  const sortedLanguages = Object.entries(languageMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, size]) => ({ name, size }));

  return {
    topLanguages: sortedLanguages,
    repoDetails,
  };
}


export const fetchTopLanguages = async (username: string) => {
  const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
  if (!response.ok) {
    throw new Error("Failed to fetch repositories");
  }
  
  const repos = await response.json();
  const languageCount: Record<string, number> = {};
  
  repos.forEach((repo: { language: string }) => {
    if (repo.language) {
      languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
    }
  });

  // Sort the languages by count (most used languages first)
  const sortedLanguages = Object.entries(languageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 languages
  
  return sortedLanguages;
};