import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../auth/AuthContext";
import { AppRoles } from "../auth/roles";
import { getDeliveryRushLeaderboard } from "../features/delivery-rush/api/deliveryRushApi";
import type { DeliveryRushLeaderboard } from "../features/delivery-rush/types/deliveryRush.types";
import { getApiErrorMessage } from "../utils/apiErrors";
import DeliveryRushPage from "./DeliveryRushPage";

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../features/delivery-rush/api/deliveryRushApi", () => ({
  getDeliveryRushLeaderboard: vi.fn(),
}));

vi.mock("../utils/apiErrors", () => ({
  getApiErrorMessage: vi.fn(),
}));

vi.mock("../features/delivery-rush/components/DeliveryRushRankedGame", () => ({
  default: ({ onRunCompleted }: { onRunCompleted: () => void }) => (
    <button type="button" onClick={onRunCompleted}>
      Završi test partiju
    </button>
  ),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedGetLeaderboard = vi.mocked(getDeliveryRushLeaderboard);
const mockedGetApiErrorMessage = vi.mocked(getApiErrorMessage);

const emptyLeaderboard: DeliveryRushLeaderboard = {
  weekStartDate: "2026-08-10",
  weekEndDate: "2026-08-16",
  entries: [],
};

const leaderboardWithPlayer: DeliveryRushLeaderboard = {
  weekStartDate: "2026-08-10",
  weekEndDate: "2026-08-16",
  entries: [
    {
      rank: 1,
      playerName: "Aleks",
      score: 2400,
      distance: 860,
      avoidedObstacles: 18,
      collisionCount: 2,
      maxCombo: 7,
      isCurrentUser: true,
      achievedAtUtc: "2026-08-11T10:00:00Z",
    },
  ],
};

const refreshedLeaderboard: DeliveryRushLeaderboard = {
  weekStartDate: "2026-08-10",
  weekEndDate: "2026-08-16",
  entries: [
    {
      rank: 1,
      playerName: "Mina",
      score: 3100,
      distance: 940,
      avoidedObstacles: 23,
      collisionCount: 1,
      maxCombo: 10,
      isCurrentUser: false,
      achievedAtUtc: "2026-08-11T11:00:00Z",
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DeliveryRushPage />
    </MemoryRouter>,
  );
}

describe("DeliveryRushPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasRole: (role: string) => role === AppRoles.Customer,
      hasAnyRole: () => false,
    } as unknown as ReturnType<typeof useAuth>);

    mockedGetApiErrorMessage.mockReturnValue(
      "Greška pri učitavanju rang-liste.",
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading and then the empty leaderboard state", async () => {
    mockedGetLeaderboard.mockResolvedValue(emptyLeaderboard);

    renderPage();

    expect(screen.getByText("Učitavanje rang-liste...")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Osveži" })).toBeDisabled();

    expect(
      await screen.findByText("Ove nedelje još nema završenih partija."),
    ).toBeInTheDocument();
  });

  it("displays leaderboard entries", async () => {
    mockedGetLeaderboard.mockResolvedValue(leaderboardWithPlayer);

    renderPage();

    expect(await screen.findByText("Aleks (ti)")).toBeInTheDocument();

    expect(screen.getByText("10.08.2026. – 16.08.2026.")).toBeInTheDocument();

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("2400")).toBeInTheDocument();
    expect(screen.getByText("860")).toBeInTheDocument();
  });

  it("retries loading after the first request fails", async () => {
    const user = userEvent.setup();

    mockedGetLeaderboard
      .mockRejectedValueOnce(new Error("Test network error."))
      .mockResolvedValueOnce(leaderboardWithPlayer);

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Greška pri učitavanju rang-liste.",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Pokušaj ponovo",
      }),
    );

    expect(await screen.findByText("Aleks (ti)")).toBeInTheDocument();

    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(2);
  });

  it("refreshes the leaderboard after a completed run", async () => {
    const user = userEvent.setup();

    mockedGetLeaderboard
      .mockResolvedValueOnce(leaderboardWithPlayer)
      .mockResolvedValueOnce(refreshedLeaderboard);

    renderPage();

    expect(await screen.findByText("Aleks (ti)")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Završi test partiju",
      }),
    );

    expect(await screen.findByText("Mina")).toBeInTheDocument();

    expect(mockedGetLeaderboard).toHaveBeenCalledTimes(2);
  });
});
