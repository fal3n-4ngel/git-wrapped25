"use client"
import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import AsciiGraph from "./AsciiGraph";

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  followers: number;
  following: number;
  public_repos: number;
}

interface ContributionsData {
  totalContributions: number;
  contributionMap: Record<string, number>;
}

interface UserData {
  user: GitHubUser;
  contributions: ContributionsData;
}

interface ContributionData {
  contributions: Record<string, number>;
  totalContributions: number;
  username?: string;
  userData: UserData;
  topLanguages: [string, number][];
}

const ContributionDashboard: React.FC<ContributionData> = ({
  contributions,
  totalContributions,
  username = "user",
  userData,
  topLanguages,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>("");

  useEffect(() => {
    const convertImageToDataUrl = async () => {
      try {
        const response = await fetch(userData.user.avatar_url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error converting avatar to data URL:", error);
      }
    };

    convertImageToDataUrl();
  }, [userData.user.avatar_url]);

  const handleShareToPNG = async () => {
    setIsDownloading(true);
    const dashboardElement = document.getElementById("contribution-dashboard");
    const shareElement = document.getElementById("share-layout");
    if (!dashboardElement || !shareElement){
      console.log("no layout found");
      return;
    }

    try {
      
      const canvas = await html2canvas(shareElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        allowTaint: true,
        useCORS: true,
        logging: true,
        onclone: (clonedDoc) => {
          const avatarImg = clonedDoc.querySelector("#share-avatar") as HTMLImageElement;
          if (avatarImg && avatarDataUrl) {
            avatarImg.src = avatarDataUrl;
          }
        }
      });
     
      const link = document.createElement("a");
      link.download = `${username}-github-wrapped-2025.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error generating PNG:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const processedContributions = useMemo(() => {
    return Object.entries(contributions)
      .map(([date, contributions]) => ({
        date,
        contributions,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [contributions]);

  const stats = useMemo(() => {
    const contributionValues = Object.values(contributions);
    return {
      totalContributions,
      averageDaily: Number(
        (totalContributions / contributionValues.length).toFixed(1)
      ),
      daysWithContributions: contributionValues.filter((c) => c > 0).length,
      maxDaily: Math.max(...contributionValues),
    };
  }, [contributions, totalContributions]);

  return (
    <>
      {/* Main Dashboard */}
      <div
        id="contribution-dashboard"
        className="max-w-6xl mx-auto bg-white p-6 space-y-8"
      >
        {/* Header */}
        <div className="flex justify-between items-center relative">
          <div className="bg-gray-50 rounded p-6 w-full mx-auto">
            <div className="flex items-start space-x-6">
              <img
                id="user-avatar"
                src={avatarDataUrl || userData.user.avatar_url}
                alt={`${username}'s avatar`}
                className="w-16 h-16 rounded-full z-0"
                crossOrigin="anonymous"
              />
              <div>
                <h2 className="text-lg text-gray-700">{userData.user.name}</h2>
                <p className="text-gray-400 text-sm">@{userData.user.login}</p>
                <p className="mt-2 text-gray-500 text-sm">{userData.user.bio}</p>
                <div className="flex md:space-x-6 gap-2 mt-4 text-sm flex-wrap justify-start items-center">
                  <div>
                    <span className="text-gray-700">
                      {userData.user.followers}
                    </span>
                    <span className="text-gray-400 ml-1">followers</span>
                  </div>
                  <div>
                    <span className="text-gray-700">
                      {userData.user.following}
                    </span>
                    <span className="text-gray-400 ml-1">following</span>
                  </div>
                  <div className="w-fit">
                    <span className="text-gray-700">
                      {userData.user.public_repos}
                    </span>
                    <span className="text-gray-400 ml-1">repos</span>
                  </div>
                </div>
              </div>
              {!isDownloading && (
                <button
                  onClick={handleShareToPNG}
                  className="text-gray-400 hover:text-gray-600 transition-colors absolute right-5"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Commits", value: stats.totalContributions },
            { label: "Daily Avg", value: stats.averageDaily },
            { label: "Active Days", value: stats.daysWithContributions },
            { label: "Max Daily", value: stats.maxDaily },
          ].map((stat, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="text-lg text-gray-700">{stat.value}</p>
            </div>
          ))}
        </div>

        <AsciiGraph contributions={processedContributions} />

        {/* Top Languages */}
        {topLanguages.length > 0 && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm text-gray-500 mb-4">Top Languages</h3>
            <div className="space-y-2">
              {topLanguages.map(([language, count], index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-700">{language}</span>
                  <span className="text-gray-500">{count} repos</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm text-gray-500 mb-4">Daily Activity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={processedContributions}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #f3f4f6",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="contributions" fill="#9ca3af" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm text-gray-500 mb-4">Cumulative Growth</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={processedContributions.map((item, index) => ({
                  ...item,
                  cumulative: processedContributions
                    .slice(0, index + 1)
                    .reduce((sum, curr) => sum + curr.contributions, 0),
                }))}
              >
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="cumulative" stroke="#9ca3af" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
          
      </div>

      <div
        id="share-layout"
        className="fixed  top-0 z-[-1] mx-auto bg-white p-6 space-y-8 md:max-w-2xl w-[720px]" 
      >
        {/* Header */}
        <div className="flex justify-between items-center relative">
          <div className="bg-gray-50 rounded p-6 w-full mx-auto">
            <div className="flex items-start space-x-6">
              <img
                id="user-avatar"
                src={avatarDataUrl || userData.user.avatar_url}
                alt={`${username}'s avatar`}
                className="w-16 h-16 rounded-full z-0"
                crossOrigin="anonymous"
              />
              <div>
                <h2 className="text-lg text-gray-700">{userData.user.name}</h2>
                <p className="text-gray-400 text-sm">@{userData.user.login}</p>
                <p className="mt-2 text-gray-500 text-sm">{userData.user.bio}</p>
                <div className="flex md:space-x-6 gap-2 mt-4 text-sm flex-wrap justify-start items-center">
                  <div>
                    <span className="text-gray-700">
                      {userData.user.followers}
                    </span>
                    <span className="text-gray-400 ml-1">followers</span>
                  </div>
                  <div>
                    <span className="text-gray-700">
                      {userData.user.following}
                    </span>
                    <span className="text-gray-400 ml-1">following</span>
                  </div>
                  <div className="w-fit">
                    <span className="text-gray-700">
                      {userData.user.public_repos}
                    </span>
                    <span className="text-gray-400 ml-1">repos</span>
                  </div>
                </div>
              </div>
            
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Commits", value: stats.totalContributions },
            { label: "Daily Avg", value: stats.averageDaily },
            { label: "Active Days", value: stats.daysWithContributions },
            { label: "Max Daily", value: stats.maxDaily },
          ].map((stat, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="text-lg text-gray-700">{stat.value}</p>
            </div>
          ))}
        </div>

        <AsciiGraph contributions={processedContributions} />

        {/* Top Languages */}
        {topLanguages.length > 0 && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm text-gray-500 mb-4">Top Languages</h3>
            <div className="space-y-2">
              {topLanguages.map(([language, count], index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-700">{language}</span>
                  <span className="text-gray-500">{count} repos</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm text-gray-500 mb-4">Daily Activity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={processedContributions}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #f3f4f6",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="contributions" fill="#9ca3af" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm text-gray-500 mb-4">Cumulative Growth</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={processedContributions.map((item, index) => ({
                  ...item,
                  cumulative: processedContributions
                    .slice(0, index + 1)
                    .reduce((sum, curr) => sum + curr.contributions, 0),
                }))}
              >
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="cumulative" stroke="#9ca3af" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Watermark */}
        <div className="mt-8 text-center">
          <p className="text-lg text-gray-500">Get your GitHub Wrapped at</p>
          <p className="text-xl font-semibold text-gray-700 mt-1">git-wrapped24.vercel.app</p>
        </div>
      
      </div>
    </>
  );
};

export default ContributionDashboard;