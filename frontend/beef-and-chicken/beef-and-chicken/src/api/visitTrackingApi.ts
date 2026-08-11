import api from "./https";

export type TrackVisitRequest = {
  path: string;
  visitorId: string;
};

export async function trackVisit(data: TrackVisitRequest) {
  await api.post("/visits", data);
}
