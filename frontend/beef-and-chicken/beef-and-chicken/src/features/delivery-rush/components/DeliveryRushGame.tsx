import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateDeliveryRushObstacles,
  isLaneBlocked,
  type DeliveryRushObstacle,
} from "../engine/deliveryRushObstacles";
import {
  deliveryRushGameRules,
  getDeliveryRushDifficultyLevel,
  type DeliveryRushDifficultyLevel,
} from "../engine/deliveryRushRules";
import type {
  DeliveryRushDirection,
  DeliveryRushInput,
  DeliveryRushLiveStats,
} from "../types/deliveryRush.types";
import { simulateDeliveryRushUntilTick } from "../engine/deliveryRushSimulator";
import "./DeliveryRushGame.scss";

const canvasWidth = 720;
const canvasHeight = 480;
const roadLeft = 90;
const roadWidth = 540;
const playerY = 390;
const obstacleApproachTicks = 90;
const initialLiveStats: DeliveryRushLiveStats = {
  score: 0,
  distance: 0,
  avoidedObstacles: 0,
  collisionCount: 0,
  currentCombo: 0,
  maxCombo: 0,
};

interface DeliveryRushDifficulty {
  level: DeliveryRushDifficultyLevel;
  label: string;
}

const difficultyLabels: Record<DeliveryRushDifficultyLevel, string> = {
  easy: "Lagano",
  medium: "Srednje",
  hard: "Teško",
  extreme: "Ekstremno",
};

function getDeliveryRushDifficulty(
  secondsRemaining: number,
): DeliveryRushDifficulty {
  const elapsedSeconds =
    deliveryRushGameRules.durationSeconds - secondsRemaining;

  const elapsedTicks = elapsedSeconds * deliveryRushGameRules.tickRate;

  const level = getDeliveryRushDifficultyLevel(elapsedTicks);

  return {
    level,
    label: difficultyLabels[level],
  };
}

interface DeliveryRushGameProps {
  seed: number;
  onFinished: (inputs: DeliveryRushInput[]) => void;
}

export default function DeliveryRushGame({
  seed,
  onFinished,
}: DeliveryRushGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const animationFrameRef = useRef<number | null>(null);

  const startTimeRef = useRef(0);
  const currentTickRef = useRef(0);
  const lastProcessedTickRef = useRef(-1);
  const collisionFlashUntilTickRef = useRef(-1);
  const finishedRef = useRef(false);

  const playerLaneRef = useRef<number>(deliveryRushGameRules.startingLane);

  const inputsRef = useRef<DeliveryRushInput[]>([]);

  const onFinishedRef = useRef(onFinished);

  const [playerLane, setPlayerLane] = useState<number>(
    deliveryRushGameRules.startingLane,
  );

  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    deliveryRushGameRules.durationSeconds,
  );

  const [countdown, setCountdown] = useState<number | null>(3);

  const [liveStats, setLiveStats] =
    useState<DeliveryRushLiveStats>(initialLiveStats);

  const obstacles = useMemo(() => generateDeliveryRushObstacles(seed), [seed]);

  const difficulty = useMemo(
    () => getDeliveryRushDifficulty(secondsRemaining),
    [secondsRemaining],
  );

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const movePlayer = useCallback((direction: DeliveryRushDirection) => {
    if (finishedRef.current || startTimeRef.current === 0) {
      return;
    }

    const elapsedMilliseconds = performance.now() - startTimeRef.current;

    const inputTick = Math.min(
      deliveryRushGameRules.totalTicks - 1,
      Math.floor((elapsedMilliseconds / 1000) * deliveryRushGameRules.tickRate),
    );

    const currentLane = playerLaneRef.current;

    const nextLane = clamp(
      currentLane + direction,
      0,
      deliveryRushGameRules.laneCount - 1,
    );

    if (nextLane === currentLane) {
      return;
    }

    const previousInput = inputsRef.current[inputsRef.current.length - 1];

    if (
      previousInput &&
      inputTick - previousInput.tick <
        deliveryRushGameRules.minimumTicksBetweenInputs
    ) {
      return;
    }

    if (inputsRef.current.length >= deliveryRushGameRules.maximumInputEvents) {
      return;
    }

    inputsRef.current.push({
      tick: inputTick,
      direction,
    });

    playerLaneRef.current = nextLane;
    setPlayerLane(nextLane);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        movePlayer(-1);
      }

      if (key === "arrowright" || key === "d") {
        event.preventDefault();
        movePlayer(1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [movePlayer]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const drawingContext: CanvasRenderingContext2D = context;

    const countdownTimeouts: number[] = [];

    inputsRef.current = [];

    playerLaneRef.current = deliveryRushGameRules.startingLane;

    currentTickRef.current = 0;
    lastProcessedTickRef.current = -1;
    collisionFlashUntilTickRef.current = -1;
    finishedRef.current = false;
    startTimeRef.current = 0;

    setPlayerLane(deliveryRushGameRules.startingLane);

    setSecondsRemaining(deliveryRushGameRules.durationSeconds);

    setLiveStats(initialLiveStats);

    function showCountdown(value: number) {
      setCountdown(value);

      drawGame(
        drawingContext,
        0,
        deliveryRushGameRules.startingLane,
        obstacles,
        -1,
      );

      drawCountdown(drawingContext, value);
    }

    function animate(currentTime: number) {
      const elapsedMilliseconds = currentTime - startTimeRef.current;

      const calculatedTick = Math.min(
        deliveryRushGameRules.totalTicks,
        Math.floor(
          (elapsedMilliseconds / 1000) * deliveryRushGameRules.tickRate,
        ),
      );

      currentTickRef.current = calculatedTick;

      if (calculatedTick !== lastProcessedTickRef.current) {
        processPassedObstacles(
          obstacles,
          lastProcessedTickRef.current,
          calculatedTick,
          inputsRef.current,
          collisionFlashUntilTickRef,
        );

        const completedTicks = Math.min(
          deliveryRushGameRules.totalTicks,
          calculatedTick + 1,
        );

        const calculatedStats = simulateDeliveryRushUntilTick(
          seed,
          inputsRef.current,
          completedTicks,
        );

        setLiveStats(calculatedStats);

        lastProcessedTickRef.current = calculatedTick;
      }

      const remainingSeconds = Math.max(
        0,
        Math.ceil(
          (deliveryRushGameRules.totalTicks - calculatedTick) /
            deliveryRushGameRules.tickRate,
        ),
      );

      setSecondsRemaining((currentValue) =>
        currentValue === remainingSeconds ? currentValue : remainingSeconds,
      );

      drawGame(
        drawingContext,
        calculatedTick,
        playerLaneRef.current,
        obstacles,
        collisionFlashUntilTickRef.current,
      );

      if (calculatedTick >= deliveryRushGameRules.totalTicks) {
        finishedRef.current = true;

        onFinishedRef.current([...inputsRef.current]);

        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    showCountdown(3);

    countdownTimeouts.push(
      window.setTimeout(() => {
        showCountdown(2);
      }, 1000),
    );

    countdownTimeouts.push(
      window.setTimeout(() => {
        showCountdown(1);
      }, 2000),
    );

    countdownTimeouts.push(
      window.setTimeout(() => {
        setCountdown(null);

        startTimeRef.current = performance.now();

        animationFrameRef.current = requestAnimationFrame(animate);
      }, 3000),
    );

    return () => {
      for (const timeoutId of countdownTimeouts) {
        window.clearTimeout(timeoutId);
      }

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      startTimeRef.current = 0;
    };
  }, [obstacles, seed]);

  return (
    <section className="delivery-rush-game">
      <div className="delivery-rush-game__hud">
        <div>
          <span>{countdown !== null ? "Početak za" : "Preostalo vreme"}</span>

          <strong>
            {countdown !== null ? countdown : `${secondsRemaining}s`}
          </strong>
        </div>

        <div>
          <span>Traka</span>
          <strong>{playerLane + 1}</strong>
        </div>
      </div>

      <div
        className={
          `delivery-rush-game__difficulty ` +
          `delivery-rush-game__difficulty--${difficulty.level}`
        }
      >
        <span>Težina</span>
        <strong>{difficulty.label}</strong>
      </div>

      <div>
        <span>Poeni</span>
        <strong>{liveStats.score}</strong>
      </div>

      <div>
        <span>Combo</span>
        <strong>x{liveStats.currentCombo}</strong>
      </div>

      <div>
        <span>Izbegnuto</span>
        <strong>{liveStats.avoidedObstacles}</strong>
      </div>

      <div>
        <span>Sudari</span>
        <strong>{liveStats.collisionCount}</strong>
      </div>

      <div>
        <span>Distanca</span>
        <strong>{liveStats.distance}</strong>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        aria-label="Delivery Rush tabla za igru"
        style={{
          display: "block",
          width: "100%",
          maxWidth: `${canvasWidth}px`,
          height: "auto",
          margin: "0 auto",
        }}
      >
        Tvoj pregledač ne podržava Canvas.
      </canvas>

      <div className="delivery-rush-game__controls">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => movePlayer(-1)}
          aria-label="Pomeri vozilo u levu traku"
        >
          ← Levo
        </button>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => movePlayer(1)}
          aria-label="Pomeri vozilo u desnu traku"
        >
          Desno →
        </button>
      </div>

      <p className="delivery-rush-game__instructions">
        Koristi strelice na tastaturi, tastere A i D ili dugmad ispod igre.
      </p>
    </section>
  );
}

function processPassedObstacles(
  obstacles: readonly DeliveryRushObstacle[],
  previousTick: number,
  currentTick: number,
  inputs: readonly DeliveryRushInput[],
  collisionFlashUntilTickRef: {
    current: number;
  },
): void {
  for (const obstacle of obstacles) {
    if (obstacle.tick <= previousTick || obstacle.tick > currentTick) {
      continue;
    }

    const lane = getPlayerLaneAtTick(inputs, obstacle.tick);

    if (isLaneBlocked(obstacle.blockedLaneMask, lane)) {
      collisionFlashUntilTickRef.current = obstacle.tick + 8;
    }
  }
}

function getPlayerLaneAtTick(
  inputs: readonly DeliveryRushInput[],
  targetTick: number,
): number {
  let lane: number = deliveryRushGameRules.startingLane;

  for (const input of inputs) {
    if (input.tick > targetTick) {
      break;
    }

    lane = clamp(
      lane + input.direction,
      0,
      deliveryRushGameRules.laneCount - 1,
    );
  }

  return lane;
}

function drawGame(
  context: CanvasRenderingContext2D,
  currentTick: number,
  playerLane: number,
  obstacles: readonly DeliveryRushObstacle[],
  collisionFlashUntilTick: number,
): void {
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  context.fillStyle = "#173524";
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  context.fillStyle = "#25292d";
  context.fillRect(roadLeft, 0, roadWidth, canvasHeight);

  const laneWidth = roadWidth / deliveryRushGameRules.laneCount;

  context.strokeStyle = "rgba(255, 255, 255, 0.65)";

  context.lineWidth = 4;
  context.setLineDash([22, 18]);
  context.lineDashOffset = -(currentTick % 40);

  for (let lane = 1; lane < deliveryRushGameRules.laneCount; lane++) {
    const laneX = roadLeft + laneWidth * lane;

    context.beginPath();
    context.moveTo(laneX, 0);
    context.lineTo(laneX, canvasHeight);
    context.stroke();
  }

  context.setLineDash([]);

  drawUpcomingObstacles(context, currentTick, obstacles, laneWidth);

  const playerWidth = laneWidth * 0.42;
  const playerHeight = 64;

  const playerX =
    roadLeft + playerLane * laneWidth + (laneWidth - playerWidth) / 2;

  context.fillStyle = "#f6b73c";
  context.fillRect(playerX, playerY, playerWidth, playerHeight);

  context.fillStyle = "#202428";
  context.fillRect(
    playerX + playerWidth * 0.2,
    playerY + 10,
    playerWidth * 0.6,
    18,
  );

  if (currentTick <= collisionFlashUntilTick) {
    context.fillStyle = "rgba(220, 40, 40, 0.28)";

    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }
}

function drawUpcomingObstacles(
  context: CanvasRenderingContext2D,
  currentTick: number,
  obstacles: readonly DeliveryRushObstacle[],
  laneWidth: number,
): void {
  for (const obstacle of obstacles) {
    const ticksUntilObstacle = obstacle.tick - currentTick;

    if (ticksUntilObstacle < 0 || ticksUntilObstacle > obstacleApproachTicks) {
      continue;
    }

    const progress = 1 - ticksUntilObstacle / obstacleApproachTicks;

    const obstacleY = 20 + progress * (playerY - 40);

    for (let lane = 0; lane < deliveryRushGameRules.laneCount; lane++) {
      if (!isLaneBlocked(obstacle.blockedLaneMask, lane)) {
        continue;
      }

      const obstacleWidth = laneWidth * 0.58;

      const obstacleX =
        roadLeft + lane * laneWidth + (laneWidth - obstacleWidth) / 2;

      context.fillStyle = "#d94b3d";

      context.fillRect(obstacleX, obstacleY, obstacleWidth, 34);
    }
  }
}

function drawCountdown(context: CanvasRenderingContext2D, value: number): void {
  context.fillStyle = "rgba(0, 0, 0, 0.58)";

  context.fillRect(0, 0, canvasWidth, canvasHeight);

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 104px system-ui, sans-serif";

  context.fillText(value.toString(), canvasWidth / 2, canvasHeight / 2);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
