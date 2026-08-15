import { useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../utils/apiErrors";
import { getDeliveryRushLeaderboard } from "../features/delivery-rush/api/deliveryRushApi";
import type { DeliveryRushLeaderboard } from "../features/delivery-rush/types/deliveryRush.types";
import DeliveryRushRankedGame from "../features/delivery-rush/components/DeliveryRushRankedGame";
import { deliveryRushGameRules } from "../features/delivery-rush/engine/deliveryRushRules";
import "../styles/DeliveryRushPage.scss";

export default function DeliveryRushPage() {
  const [leaderboard, setLeaderboard] =
    useState<DeliveryRushLeaderboard | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const [isGameFocused, setIsGameFocused] = useState(false);

  const arenaRef = useRef<HTMLElement | null>(null);
  const wasGameFocusedRef = useRef(false);

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

  useEffect(() => {
    const wasGameFocused = wasGameFocusedRef.current;

    wasGameFocusedRef.current = isGameFocused;

    if (typeof window.matchMedia !== "function") {
      return;
    }

    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    if (!isMobile) {
      return;
    }

    const focusModeStarted = isGameFocused;
    const focusModeEnded = wasGameFocused && !isGameFocused;

    if (!focusModeStarted && !focusModeEnded) {
      return;
    }

    const navigationHeight = 72;
    let secondFrameId: number | null = null;

    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        const arena = arenaRef.current;

        if (!arena) {
          return;
        }

        const arenaTop =
          arena.getBoundingClientRect().top + window.scrollY - navigationHeight;

        window.scrollTo({
          top: Math.max(0, arenaTop),
          behavior: focusModeStarted ? "smooth" : "auto",
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);

      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
    };
  }, [isGameFocused]);

  return (
    <main
      className={[
        "delivery-rush-page",
        isGameFocused ? "delivery-rush-page--focus" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="container">
        <header className="delivery-rush-page__header">
          <span className="badge">
            <span
              className="delivery-rush-page__badge-dot"
              aria-hidden="true"
            />
            Igra veštine
          </span>

          <h1>Delivery Rush</h1>

          <p>
            Menjaj trake, preskači prepreke i osvoji što više poena tokom
            partije od {deliveryRushGameRules.durationSeconds} sekundi. Težina
            postepeno raste, a partija se završava nakon{" "}
            {deliveryRushGameRules.maximumCollisions} sudara.
          </p>

          <div
            className="delivery-rush-page__quick-info"
            aria-label="Osnovna pravila igre"
          >
            <div>
              <span>Trajanje</span>
              <strong>{deliveryRushGameRules.durationSeconds} sekundi</strong>
            </div>

            <div>
              <span>Dozvoljeno</span>
              <strong>{deliveryRushGameRules.maximumCollisions} sudara</strong>
            </div>

            <div>
              <span>Takmičenje</span>
              <strong>Nedeljni ranking</strong>
            </div>
          </div>
        </header>

        <section
          ref={arenaRef}
          className="delivery-rush-page__arena"
          aria-label="Delivery Rush rangirana partija"
        >
          <DeliveryRushRankedGame
            onRunCompleted={() => setReloadKey((current) => current + 1)}
            onPlayingChange={setIsGameFocused}
          />
        </section>

        <section
          className="card delivery-rush-page__leaderboard"
          aria-busy={isLoading}
        >
          <div className="delivery-rush-page__leaderboard-header">
            <div>
              <span className="delivery-rush-page__leaderboard-eyebrow">
                Nova nedelja, novi rekord
              </span>

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

          {isLoading && (
            <div
              className="delivery-rush-page__state"
              role="status"
              aria-live="polite"
            >
              <span
                className="delivery-rush-page__spinner"
                aria-hidden="true"
              />

              <p>Učitavanje rang-liste...</p>
            </div>
          )}

          {!isLoading && error && (
            <div
              className="alert alert--error delivery-rush-page__error"
              role="alert"
            >
              <div>
                <strong>Rang-lista nije učitana</strong>
                <p>{error}</p>
              </div>

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
            <div className="delivery-rush-page__state">
              <strong>Rang-lista je još prazna</strong>
              <p>Završi partiju i postavi prvi rezultat ove nedelje.</p>
            </div>
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
                    {leaderboard.entries.map((entry) => {
                      const rowClassName = [
                        entry.rank <= 3
                          ? `delivery-rush-page__podium delivery-rush-page__podium--${entry.rank}`
                          : "",
                        entry.isCurrentUser
                          ? "delivery-rush-page__current-player"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      const rankClassName =
                        entry.rank <= 3
                          ? `delivery-rush-page__rank delivery-rush-page__rank--${entry.rank}`
                          : "delivery-rush-page__rank";

                      return (
                        <tr
                          key={`${entry.rank}-${entry.playerName}`}
                          className={rowClassName || undefined}
                        >
                          <td data-label="Pozicija">
                            <span className={rankClassName}>#{entry.rank}</span>
                          </td>

                          <td data-label="Igrač">
                            <span className="delivery-rush-page__player">
                              {entry.playerName}
                            </span>

                            {entry.isCurrentUser && (
                              <span className="delivery-rush-page__you">
                                Ti
                              </span>
                            )}
                          </td>

                          <td data-label="Poeni">
                            <strong>
                              {entry.score.toLocaleString("sr-RS")}
                            </strong>
                          </td>

                          <td data-label="Distanca">{entry.distance}</td>
                          <td data-label="Izbegnuto">
                            {entry.avoidedObstacles}
                          </td>
                          <td data-label="Sudari">{entry.collisionCount}</td>
                          <td data-label="Combo">{entry.maxCombo}</td>
                        </tr>
                      );
                    })}
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
