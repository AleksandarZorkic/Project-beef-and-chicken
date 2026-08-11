import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppRoles } from "../auth/roles";
import { getApiErrorMessage } from "../utils/apiErrors";
import { getDeliveryRushLeaderboard } from "../features/delivery-rush/api/deliveryRushApi";
import type { DeliveryRushLeaderboard } from "../features/delivery-rush/types/deliveryRush.types";
import DeliveryRushRankedGame from "../features/delivery-rush/components/DeliveryRushRankedGame";

export default function DeliveryRushPage() {
  const [leaderboard, setLeaderboard] =
    useState<DeliveryRushLeaderboard | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLeaderboard() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getDeliveryRushLeaderboard(controller.signal);

        setLeaderboard(result);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadLeaderboard();

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  return (
    <main className="delivery-rush-page">
      <div className="container">
        <header className="delivery-rush-page__header">
          <span className="badge">Igra veštine</span>

          <h1>Delivery Rush</h1>

          <p>
            Menjaj trake, izbegavaj prepreke i osvoji što više poena za 60
            sekundi.
          </p>
        </header>

        <DeliveryRushRankedGame
          onRunCompleted={() => setReloadKey((current) => current + 1)}
        />

        <section className="card">
          <div className="delivery-rush-page__leaderboard-header">
            <div>
              <h2>Nedeljna rang-lista</h2>

              {leaderboard && (
                <p>
                  {formatDate(leaderboard.weekStartDate)}
                  {" – "}
                  {formatDate(leaderboard.weekEndDate)}
                </p>
              )}
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setReloadKey((current) => current + 1)}
              disabled={isLoading}
            >
              Osveži
            </button>
          </div>

          {isLoading && <p aria-live="polite">Učitavanje rang-liste...</p>}

          {error && (
            <div className="alert alert--error" role="alert">
              <p>{error}</p>

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setReloadKey((current) => current + 1)}
              >
                Pokušaj ponovo
              </button>
            </div>
          )}

          {!isLoading && !error && leaderboard?.entries.length === 0 && (
            <p>Ove nedelje još nema završenih partija.</p>
          )}

          {!isLoading &&
            !error &&
            leaderboard &&
            leaderboard.entries.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Pozicija</th>
                      <th scope="col">Igrač</th>
                      <th scope="col">Poeni</th>
                      <th scope="col">Distanca</th>
                      <th scope="col">Izbegnuto</th>
                      <th scope="col">Sudari</th>
                      <th scope="col">Combo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {leaderboard.entries.map((entry) => (
                      <tr
                        key={`${entry.rank}-${entry.playerName}`}
                        className={
                          entry.isCurrentUser
                            ? "delivery-rush-page__current-player"
                            : undefined
                        }
                      >
                        <td>#{entry.rank}</td>
                        <td>
                          {entry.playerName}
                          {entry.isCurrentUser && " (ti)"}
                        </td>
                        <td>
                          <strong>{entry.score}</strong>
                        </td>
                        <td>{entry.distance}</td>
                        <td>{entry.avoidedObstacles}</td>
                        <td>{entry.collisionCount}</td>
                        <td>{entry.maxCombo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}.`;
}
