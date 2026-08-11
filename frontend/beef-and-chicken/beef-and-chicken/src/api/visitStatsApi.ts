import api from "./https";

export type DailyVisitStatsDto = {
  date: string;
  visits: number;
  uniqueVisitors: number;
};

export type PathVisitStatsDto = {
  path: string;
  visits: number;
  uniqueVisitors: number;
};

export type VisitStatsDto = {
  totalVisitsToday: number;
  totalVisitsLast7Days: number;
  uniqueVisitorsLast7Days: number;
  anonymousVisitsLast7Days: number;
  customerVisitsLast7Days: number;
  dailyVisits: DailyVisitStatsDto[];
  topPaths: PathVisitStatsDto[];
};

export async function getVisitStats() {
  const response = await api.get<VisitStatsDto>("/visits/summary");

  return response.data;
}
