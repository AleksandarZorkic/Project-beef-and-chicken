import { useState } from "react";
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

interface DeliveryRushRankedGameProps {
  onRunCompleted: () => void;
}

export default function DeliveryRushRankedGame({
  onRunCompleted,
}: DeliveryRushRankedGameProps) {
  const { isAuthenticated, hasRole, hasAnyRole } = useAuth();

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

  async function handleStart(): Promise<void> {
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
    <section className="delivery-rush-ranked-game">
      <h2>Rangirana partija</h2>

      {!isAuthenticated && (
        <>
          <p>
            Prijavi se kao Customer da bi tvoj rezultat mogao da se nađe na
            rang-listi.
          </p>

          <Link to="/login" className="btn btn--primary">
            Prijavi se
          </Link>
        </>
      )}

      {isAuthenticated && !canPlayRanked && (
        <p className="alert alert--info">
          Rangirane partije mogu igrati samo Customer korisnici bez staff uloge.
        </p>
      )}

      {canPlayRanked && !activeRun && !result && (
        <>
          <p>
            Vozi najduže 120 sekundi i izbegni što više prepreka. Težina
            postepeno raste, a treći sudar završava partiju.
          </p>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleStart()}
            disabled={isStarting}
          >
            {isStarting ? "Pokretanje..." : "Pokreni rangiranu partiju"}
          </button>
        </>
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
          <h3>Rezultat partije</h3>

          <dl>
            <div>
              <dt>Poeni</dt>
              <dd>{result.score}</dd>
            </div>

            <div>
              <dt>Distanca</dt>
              <dd>{result.distance}</dd>
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

            <div>
              <dt>Nedeljna pozicija</dt>
              <dd>{result.weeklyRank ? `#${result.weeklyRank}` : "—"}</dd>
            </div>
          </dl>

          {result.isPersonalBest && (
            <p className="alert alert--success">Novi lični rekord!</p>
          )}

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleStart()}
            disabled={isStarting}
          >
            {isStarting ? "Pokretanje..." : "Igraj ponovo"}
          </button>
        </div>
      )}

      {error && !(activeRun && hasGameEnded && pendingInputs) && (
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
