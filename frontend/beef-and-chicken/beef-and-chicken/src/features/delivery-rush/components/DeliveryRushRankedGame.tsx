import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { AppRoles } from "../../../auth/roles";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import {
  cancelDeliveryRushRun,
  finishDeliveryRushRun,
  startDeliveryRushRun,
} from "../api/deliveryRushApi";
import { deliveryRushGameRules } from "../engine/deliveryRushRules";
import type {
  DeliveryRushInput,
  DeliveryRushRunResult,
  StartDeliveryRushRunResponse,
} from "../types/deliveryRush.types";
import DeliveryRushGame from "./DeliveryRushGame";
import "./DeliveryRushRankedGame.scss";
import { useDeliveryRushSound } from "../hooks/useDeliveryRushSound";

interface DeliveryRushRankedGameProps {
  onRunCompleted: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export default function DeliveryRushRankedGame({
  onRunCompleted,
  onPlayingChange,
}: DeliveryRushRankedGameProps) {
  const { isAuthenticated, hasRole, hasAnyRole } = useAuth();

  const { playSound, unlockAudio } = useDeliveryRushSound();

  const [activeRun, setActiveRun] =
    useState<StartDeliveryRushRunResponse | null>(null);

  const [result, setResult] = useState<DeliveryRushRunResult | null>(null);

  const [pendingInputs, setPendingInputs] = useState<
    DeliveryRushInput[] | null
  >(null);

  const [hasGameEnded, setHasGameEnded] = useState(false);

  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const isCustomer = hasRole(AppRoles.Customer);

  const hasStaffRole = hasAnyRole([
    AppRoles.Admin,
    AppRoles.Employee,
    AppRoles.Courier,
  ]);

  const canPlayRanked = isAuthenticated && isCustomer && !hasStaffRole;

  const isLobbyVisible = !activeRun && !result;

  const isResultVisible = result !== null;

  const isPlaying = activeRun !== null && !hasGameEnded;

  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  async function handleStart(): Promise<void> {
    unlockAudio();
    playSound("ui-click");

    setIsStarting(true);
    setError(null);
    setResult(null);
    setPendingInputs(null);
    setHasGameEnded(false);

    try {
      const startedRun = await startDeliveryRushRun();

      if (!isCompatibleRun(startedRun)) {
        throw new Error("Frontend i backend koriste različitu verziju igre.");
      }

      setActiveRun(startedRun);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsStarting(false);
    }
  }

  function handleGameFinished(inputs: DeliveryRushInput[]): void {
    setHasGameEnded(true);
    setPendingInputs(inputs);

    void submitResult(inputs);
  }

  async function submitResult(inputs: DeliveryRushInput[]): Promise<void> {
    if (!activeRun) {
      return;
    }

    setIsFinishing(true);
    setError(null);

    try {
      const savedResult = await finishDeliveryRushRun(activeRun.runId, inputs);

      setResult(savedResult);
      setActiveRun(null);
      setPendingInputs(null);
      setHasGameEnded(false);

      if (savedResult.isPersonalBest) {
        playSound("new-record");
      }

      onRunCompleted();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsFinishing(false);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!activeRun || isCancelling) {
      return;
    }

    playSound("ui-click");

    setIsCancelling(true);

    try {
      await cancelDeliveryRushRun(activeRun.runId);

      setActiveRun(null);
      setPendingInputs(null);
      setHasGameEnded(false);
      setResult(null);
      setError(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <section
      className={[
        "delivery-rush-ranked-game",
        isLobbyVisible ? "delivery-rush-ranked-game--lobby" : "",
        isResultVisible ? "delivery-rush-ranked-game--result" : "",
        isPlaying ? "delivery-rush-ranked-game--playing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isLobbyVisible && (
        <div className="delivery-rush-ranked-game__lobby">
          <img
            className="delivery-rush-ranked-game__hero-image"
            src={`${import.meta.env.BASE_URL}images/delivery-rush/delivery-rush-night-hero.webp`}
            alt=""
            aria-hidden="true"
          />

          <div className="delivery-rush-ranked-game__hero-overlay" />

          <div className="delivery-rush-ranked-game__hero-content">
            <span className="delivery-rush-ranked-game__eyebrow">
              Noćna smena je počela
            </span>

            <h2>
              <span>Delivery</span>
              <strong>Rush</strong>
            </h2>

            <p>
              Preuzmi volan, izbegni gradski haos i dostavi porudžbinu pre nego
              što vreme istekne.
            </p>

            <ul className="delivery-rush-ranked-game__features">
              <li>
                <strong>3</strong>
                <span>života</span>
              </li>

              <li>
                <strong>6</strong>
                <span>nivoa</span>
              </li>

              <li>
                <strong>TOP 10</strong>
                <span>rang-lista</span>
              </li>
            </ul>

            {!isAuthenticated && (
              <div className="delivery-rush-ranked-game__hero-action">
                <p>
                  Prijavi se kao kupac da bi tvoj rezultat bio sačuvan na
                  rang-listi.
                </p>

                <Link
                  to="/login"
                  className="btn btn--primary delivery-rush-ranked-game__start"
                  onClick={() => playSound("ui-click")}
                >
                  Prijavi se i igraj
                </Link>
              </div>
            )}

            {isAuthenticated && !canPlayRanked && (
              <p className="alert alert--info">
                Rangirane partije mogu igrati samo korisnici sa ulogom kupca.
              </p>
            )}

            {canPlayRanked && (
              <div className="delivery-rush-ranked-game__hero-action">
                <button
                  type="button"
                  className="btn btn--primary delivery-rush-ranked-game__start"
                  onClick={() => void handleStart()}
                  disabled={isStarting}
                >
                  <span aria-hidden="true">▶</span>

                  {isStarting ? "Pripremamo vozilo..." : "Započni dostavu"}
                </button>

                <small>Strelice ili A/D za trake · Space ili W za skok</small>
              </div>
            )}

            {error && (
              <p className="alert alert--error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      {isPlaying && (
        <button
          type="button"
          className="delivery-rush-ranked-game__cancel"
          onClick={() => void handleCancel()}
          disabled={isCancelling}
          aria-label="Prekini rangiranu partiju"
        >
          {isCancelling ? "Prekidanje..." : "Prekini"}
        </button>
      )}

      {activeRun && !hasGameEnded && (
        <DeliveryRushGame
          key={activeRun.runId}
          seed={activeRun.seed}
          onFinished={handleGameFinished}
        />
      )}

      {activeRun && hasGameEnded && isFinishing && (
        <div
          className="delivery-rush-submit-status"
          role="status"
          aria-live="polite"
        >
          <span
            className="delivery-rush-submit-status__spinner"
            aria-hidden="true"
          />

          <div>
            <strong>Partija je završena!</strong>
            <p>Proveravamo i čuvamo tvoj rezultat...</p>
          </div>
        </div>
      )}

      {activeRun && hasGameEnded && !isFinishing && error && pendingInputs && (
        <div className="delivery-rush-submit-error" role="alert">
          <strong>Rezultat trenutno nije sačuvan</strong>
          <p>{error}</p>

          <div className="delivery-rush-submit-error__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void submitResult(pendingInputs)}
              disabled={isCancelling}
            >
              Ponovo pošalji rezultat
            </button>

            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void handleCancel()}
              disabled={isCancelling}
            >
              {isCancelling ? "Odustajanje..." : "Odustani i vrati se"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="delivery-rush-result">
          <header className="delivery-rush-result__header">
            <span className="delivery-rush-result__trophy" aria-hidden="true">
              🏆
            </span>

            <div>
              <span className="delivery-rush-result__eyebrow">
                Partija završena
              </span>

              <h3>Rezultat partije</h3>

              <p>Rezultat je sačuvan i dodat na nedeljnu rang-listu.</p>
            </div>
          </header>

          <div className="delivery-rush-result__highlights">
            <div className="delivery-rush-result__highlight delivery-rush-result__highlight--score">
              <span>Poeni</span>
              <strong>{result.score.toLocaleString("sr-RS")}</strong>
              <small>Ukupan rezultat</small>
            </div>

            <div className="delivery-rush-result__highlight delivery-rush-result__highlight--rank">
              <span>Nedeljna pozicija</span>

              <strong>
                {result.weeklyRank ? `#${result.weeklyRank}` : "—"}
              </strong>

              <small>Na aktuelnoj rang-listi</small>
            </div>
          </div>

          <dl>
            <div>
              <dt>Distanca</dt>
              <dd>{result.distance.toLocaleString("sr-RS")}</dd>
            </div>

            <div>
              <dt>Izbegnute prepreke</dt>
              <dd>{result.avoidedObstacles}</dd>
            </div>

            <div>
              <dt>Sudari</dt>
              <dd>{result.collisionCount}</dd>
            </div>

            <div>
              <dt>Najveći combo</dt>
              <dd>{result.maxCombo}</dd>
            </div>
          </dl>

          {result.isPersonalBest && (
            <p className="alert alert--success delivery-rush-result__record">
              Novi lični rekord!
            </p>
          )}

          <div className="delivery-rush-result__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleStart()}
              disabled={isStarting}
            >
              {isStarting ? "Pokretanje..." : "Igraj ponovo"}
            </button>
          </div>
        </div>
      )}

      {error &&
        !isLobbyVisible &&
        !(activeRun && hasGameEnded && pendingInputs) && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
    </section>
  );
}

function isCompatibleRun(run: StartDeliveryRushRunResponse): boolean {
  return (
    run.gameVersion === deliveryRushGameRules.gameVersion &&
    run.durationSeconds === deliveryRushGameRules.durationSeconds &&
    run.tickRate === deliveryRushGameRules.tickRate
  );
}
