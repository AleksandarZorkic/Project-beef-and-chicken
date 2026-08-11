import api from "../../../api/https";
import type {
  DeliveryRushInput,
  DeliveryRushLeaderboard,
  DeliveryRushRunResult,
  FinishDeliveryRushRunRequest,
  StartDeliveryRushRunResponse,
} from "../types/deliveryRush.types";

const deliveryRushEndpoint = "/games/delivery-rush";

export async function startDeliveryRushRun(
  signal?: AbortSignal,
): Promise<StartDeliveryRushRunResponse> {
  const response = await api.post<StartDeliveryRushRunResponse>(
    `${deliveryRushEndpoint}/runs`,
    undefined,
    {
      signal,
    },
  );

  return response.data;
}

export async function finishDeliveryRushRun(
  runId: number,
  inputs: DeliveryRushInput[],
  signal?: AbortSignal,
): Promise<DeliveryRushRunResult> {
  if (!Number.isInteger(runId) || runId <= 0) {
    throw new RangeError("Run ID must be a positive integer.");
  }

  const request: FinishDeliveryRushRunRequest = {
    inputs,
  };

  const response = await api.post<DeliveryRushRunResult>(
    `${deliveryRushEndpoint}/runs/${runId}/finish`,
    request,
    {
      signal,
    },
  );

  return response.data;
}

export async function getDeliveryRushLeaderboard(
  signal?: AbortSignal,
): Promise<DeliveryRushLeaderboard> {
  const response = await api.get<DeliveryRushLeaderboard>(
    `${deliveryRushEndpoint}/leaderboard`,
    {
      signal,
    },
  );

  return response.data;
}

export async function cancelDeliveryRushRun(
  runId: number,
  signal?: AbortSignal,
): Promise<void> {
  if (!Number.isInteger(runId) || runId <= 0) {
    throw new RangeError("Run ID must be a positive integer.");
  }

  await api.post(`${deliveryRushEndpoint}/runs/${runId}/cancel`, undefined, {
    signal,
  });
}
