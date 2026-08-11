import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../../auth/AuthContext";
import { AppRoles } from "../../../auth/roles";
import {
  cancelDeliveryRushRun,
  finishDeliveryRushRun,
  startDeliveryRushRun,
} from "../api/deliveryRushApi";
import { deliveryRushGameRules } from "../engine/deliveryRushRules";
import type {
  DeliveryRushRunResult,
  StartDeliveryRushRunResponse,
} from "../types/deliveryRush.types";
import DeliveryRushRankedGame from "./DeliveryRushRankedGame";

vi.mock("../../../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/deliveryRushApi", () => ({
  startDeliveryRushRun: vi.fn(),
  finishDeliveryRushRun: vi.fn(),
  cancelDeliveryRushRun: vi.fn(),
}));

vi.mock("./DeliveryRushGame", () => ({
  default: ({ onFinished }: { onFinished: (inputs: never[]) => void }) => (
    <button type="button" onClick={() => onFinished([])}>
      Zavrsi test partiju
    </button>
  ),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedStartDeliveryRushRun = vi.mocked(startDeliveryRushRun);
const mockedFinishDeliveryRushRun = vi.mocked(finishDeliveryRushRun);
const mockedCancelDeliveryRushRun = vi.mocked(cancelDeliveryRushRun);

const startedRun = {
  runId: 25,
  seed: 123456,
  gameVersion: deliveryRushGameRules.gameVersion,
  durationSeconds: deliveryRushGameRules.durationSeconds,
  tickRate: deliveryRushGameRules.tickRate,
} as StartDeliveryRushRunResponse;

const savedResult = {
  score: 2400,
  distance: 860,
  avoidedObstacles: 18,
  collisionCount: 2,
  maxCombo: 7,
  weeklyRank: 2,
  isPersonalBest: true,
} as DeliveryRushRunResult;

describe("DeliveryRushRankedGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasRole: (role: string) => role === AppRoles.Customer,
      hasAnyRole: () => false,
    } as unknown as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    cleanup();
  });

  it("starts a ranked run", async () => {
    const user = userEvent.setup();

    mockedStartDeliveryRushRun.mockResolvedValue(startedRun);

    render(<DeliveryRushRankedGame onRunCompleted={vi.fn()} />);

    await user.click(
      screen.getByRole("button", {
        name: "Pokreni rangiranu partiju",
      }),
    );

    expect(mockedStartDeliveryRushRun).toHaveBeenCalledTimes(1);

    expect(
      await screen.findByRole("button", {
        name: "Zavrsi test partiju",
      }),
    ).toBeInTheDocument();
  });

  it("finishes a run and displays the saved result", async () => {
    const user = userEvent.setup();
    const onRunCompleted = vi.fn();

    mockedStartDeliveryRushRun.mockResolvedValue(startedRun);
    mockedFinishDeliveryRushRun.mockResolvedValue(savedResult);

    render(<DeliveryRushRankedGame onRunCompleted={onRunCompleted} />);

    await user.click(
      screen.getByRole("button", {
        name: "Pokreni rangiranu partiju",
      }),
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Zavrsi test partiju",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Rezultat partije",
      }),
    ).toBeInTheDocument();

    expect(mockedFinishDeliveryRushRun).toHaveBeenCalledWith(
      startedRun.runId,
      [],
    );

    expect(screen.getByText("2400")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(onRunCompleted).toHaveBeenCalledTimes(1);
  });

  it("retries sending a result after the first request fails", async () => {
    const user = userEvent.setup();
    const onRunCompleted = vi.fn();

    mockedStartDeliveryRushRun.mockResolvedValue(startedRun);

    mockedFinishDeliveryRushRun
      .mockRejectedValueOnce(new Error("Test network error."))
      .mockResolvedValueOnce(savedResult);

    render(<DeliveryRushRankedGame onRunCompleted={onRunCompleted} />);

    await user.click(
      screen.getByRole("button", {
        name: "Pokreni rangiranu partiju",
      }),
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Zavrsi test partiju",
      }),
    );

    expect(
      await screen.findByText(/Rezultat trenutno nije/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Ponovo po/,
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Rezultat partije",
      }),
    ).toBeInTheDocument();

    expect(mockedFinishDeliveryRushRun).toHaveBeenCalledTimes(2);
    expect(onRunCompleted).toHaveBeenCalledTimes(1);
  });

  it("cancels the active run after result submission fails", async () => {
    const user = userEvent.setup();
    const onRunCompleted = vi.fn();

    mockedStartDeliveryRushRun.mockResolvedValue(startedRun);

    mockedFinishDeliveryRushRun.mockRejectedValueOnce(
      new Error("Test network error."),
    );

    mockedCancelDeliveryRushRun.mockResolvedValue(undefined);

    render(<DeliveryRushRankedGame onRunCompleted={onRunCompleted} />);

    await user.click(
      screen.getByRole("button", {
        name: "Pokreni rangiranu partiju",
      }),
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Zavrsi test partiju",
      }),
    );

    expect(
      await screen.findByText(/Rezultat trenutno nije/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Odustani i vrati se",
      }),
    );

    expect(mockedCancelDeliveryRushRun).toHaveBeenCalledWith(startedRun.runId);

    expect(
      await screen.findByRole("button", {
        name: "Pokreni rangiranu partiju",
      }),
    ).toBeInTheDocument();

    expect(onRunCompleted).not.toHaveBeenCalled();
  });
});
