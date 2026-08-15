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
import {
  isDeliveryRushJumpActive,
  simulateDeliveryRushUntilTick,
} from "../engine/deliveryRushSimulator";
import "./DeliveryRushGame.scss";
import { useDeliveryRushSound } from "../hooks/useDeliveryRushSound";

const canvasWidth = 720;
const canvasHeight = 480;
const roadLeft = 90;
const roadWidth = 540;
const playerY = 390;
const playerJumpHeight = 82;
const obstacleApproachTicks = 90;
const obstacleHeight = 34;
const obstacleSpawnY = 20;
const collisionFlashDurationTicks = 8;
const initialLiveStats: DeliveryRushLiveStats = {
  score: 0,
  distance: 0,
  avoidedObstacles: 0,
  collisionCount: 0,
  currentCombo: 0,
  maxCombo: 0,
};

const musicPlaybackRates: Record<DeliveryRushDifficultyLevel, number> = {
  easy: 1,
  medium: 1.01,
  hard: 1.02,
  "very-hard": 1.03,
  extreme: 1.04,
  "rush-hour": 1.06,
};

function triggerHapticFeedback(pattern: number | number[]): void {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return;
  }

  navigator.vibrate(pattern);
}

interface DeliveryRushDifficulty {
  level: DeliveryRushDifficultyLevel;
  label: string;
}

const difficultyLabels: Record<DeliveryRushDifficultyLevel, string> = {
  easy: "Lagano",
  medium: "Srednje",
  hard: "Teško",
  "very-hard": "Vrlo teško",
  extreme: "Ekstremno",
  "rush-hour": "Špic",
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
  const {
    isSoundEnabled,
    playSound,
    setMusicPlaybackRate,
    startMusic,
    stopMusic,
    toggleSound,
  } = useDeliveryRushSound();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const animationFrameRef = useRef<number | null>(null);

  const startTimeRef = useRef(0);
  const currentTickRef = useRef(0);
  const lastProcessedTickRef = useRef(-1);
  const collisionFlashUntilTickRef = useRef(-1);
  const lastCollisionCountRef = useRef(0);
  const lastJumpTickRef = useRef<number | null>(null);
  const lastLandedJumpTickRef = useRef<number | null>(null);
  const lastDifficultyLevelRef = useRef<DeliveryRushDifficultyLevel>("easy");
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

  const [jumpCooldownTicksRemaining, setJumpCooldownTicksRemaining] =
    useState(0);

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

  const movePlayer = useCallback(
    (direction: DeliveryRushDirection) => {
      if (finishedRef.current || startTimeRef.current === 0) {
        return;
      }

      const elapsedMilliseconds = performance.now() - startTimeRef.current;

      const inputTick = Math.min(
        deliveryRushGameRules.totalTicks - 1,
        Math.floor(
          (elapsedMilliseconds / 1000) * deliveryRushGameRules.tickRate,
        ),
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

      if (
        inputsRef.current.length >= deliveryRushGameRules.maximumInputEvents
      ) {
        return;
      }

      inputsRef.current.push({
        tick: inputTick,
        action: "move",
        direction,
      });

      playerLaneRef.current = nextLane;
      setPlayerLane(nextLane);

      triggerHapticFeedback(10);
      playSound("lane-whoosh", { pan: direction * 0.7 });
    },
    [playSound],
  );

  const jumpPlayer = useCallback(() => {
    if (finishedRef.current || startTimeRef.current === 0) {
      return;
    }

    const elapsedMilliseconds = performance.now() - startTimeRef.current;

    const inputTick = Math.min(
      deliveryRushGameRules.totalTicks - 1,
      Math.floor((elapsedMilliseconds / 1000) * deliveryRushGameRules.tickRate),
    );

    const previousJumpTick = lastJumpTickRef.current;

    if (previousJumpTick !== null) {
      const nextAllowedJumpTick =
        previousJumpTick +
        deliveryRushGameRules.jumpDurationTicks +
        deliveryRushGameRules.jumpCooldownTicks;

      if (inputTick < nextAllowedJumpTick) {
        return;
      }
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
      action: "jump",
    });

    lastJumpTickRef.current = inputTick;

    setJumpCooldownTicksRemaining(
      deliveryRushGameRules.jumpDurationTicks +
        deliveryRushGameRules.jumpCooldownTicks,
    );

    triggerHapticFeedback(18);
    playSound("jump");
  }, [playSound]);

  const handleToggleSound = useCallback(() => {
    const soundIsNowEnabled = toggleSound();

    if (
      soundIsNowEnabled &&
      startTimeRef.current !== 0 &&
      !finishedRef.current
    ) {
      const currentLevel = getDeliveryRushDifficultyLevel(
        currentTickRef.current,
      );

      startMusic(musicPlaybackRates[currentLevel]);
    }
  }, [startMusic, toggleSound]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        movePlayer(-1);
        return;
      }

      if (key === "arrowright" || key === "d") {
        event.preventDefault();
        movePlayer(1);
        return;
      }

      if (event.code === "Space" || key === "arrowup" || key === "w") {
        event.preventDefault();
        jumpPlayer();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [jumpPlayer, movePlayer]);

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
    lastCollisionCountRef.current = 0;
    lastJumpTickRef.current = null;
    lastLandedJumpTickRef.current = null;
    lastDifficultyLevelRef.current = "easy";
    finishedRef.current = false;
    startTimeRef.current = 0;

    setPlayerLane(deliveryRushGameRules.startingLane);

    setSecondsRemaining(deliveryRushGameRules.durationSeconds);

    setLiveStats(initialLiveStats);

    setJumpCooldownTicksRemaining(0);

    function showCountdown(value: number) {
      setCountdown(value);
      playSound("countdown-tick");

      drawGame(
        drawingContext,
        0,
        deliveryRushGameRules.startingLane,
        obstacles,
        -1,
        null,
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

      const jumpStartTick = lastJumpTickRef.current;

      if (
        jumpStartTick !== null &&
        calculatedTick >=
          jumpStartTick + deliveryRushGameRules.jumpDurationTicks &&
        lastLandedJumpTickRef.current !== jumpStartTick
      ) {
        lastLandedJumpTickRef.current = jumpStartTick;
        playSound("landing");
      }

      const currentDifficultyLevel =
        getDeliveryRushDifficultyLevel(calculatedTick);

      if (currentDifficultyLevel !== lastDifficultyLevelRef.current) {
        lastDifficultyLevelRef.current = currentDifficultyLevel;

        setMusicPlaybackRate(musicPlaybackRates[currentDifficultyLevel]);

        playSound(
          currentDifficultyLevel === "rush-hour"
            ? "rush-hour"
            : "difficulty-up",
        );
      }

      const cooldownTicksRemaining = getJumpCooldownTicksRemaining(
        calculatedTick,
        lastJumpTickRef.current,
      );

      setJumpCooldownTicksRemaining((currentValue) =>
        currentValue === cooldownTicksRemaining
          ? currentValue
          : cooldownTicksRemaining,
      );

      let reachedCollisionLimit = false;

      if (calculatedTick > lastProcessedTickRef.current) {
        const completedTicks = Math.min(
          deliveryRushGameRules.totalTicks,
          calculatedTick + 1,
        );

        const calculatedStats = simulateDeliveryRushUntilTick(
          seed,
          inputsRef.current,
          completedTicks,
        );

        if (calculatedStats.collisionCount > lastCollisionCountRef.current) {
          collisionFlashUntilTickRef.current =
            calculatedTick + collisionFlashDurationTicks;

          triggerHapticFeedback([70, 35, 70]);
          playSound("collision");
          playSound("life-lost");
        }

        lastCollisionCountRef.current = calculatedStats.collisionCount;

        setLiveStats(calculatedStats);

        reachedCollisionLimit =
          calculatedStats.collisionCount >=
          deliveryRushGameRules.maximumCollisions;

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
        lastJumpTickRef.current,
      );

      if (
        reachedCollisionLimit ||
        calculatedTick >= deliveryRushGameRules.totalTicks
      ) {
        finishedRef.current = true;

        if (reachedCollisionLimit) {
          playSound("game-over");
        }

        stopMusic(0.18);
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
        playSound("countdown-go");
        startMusic(musicPlaybackRates.easy);

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
      triggerHapticFeedback(0);
      stopMusic(0.12);
    };
  }, [obstacles, playSound, seed, setMusicPlaybackRate, startMusic, stopMusic]);

  return (
    <section className="delivery-rush-game">
      <div className="delivery-rush-game__hud">
        <div className="delivery-rush-game__stat">
          <span>{countdown !== null ? "Početak za" : "Preostalo vreme"}</span>

          <strong>
            {countdown !== null ? countdown : `${secondsRemaining}s`}
          </strong>
        </div>

        <div className="delivery-rush-game__stat">
          <span>Traka</span>
          <strong>{playerLane + 1}</strong>
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

        <div className="delivery-rush-game__stat delivery-rush-game__stat--score">
          <span>Poeni</span>
          <strong>{liveStats.score}</strong>
        </div>

        <div className="delivery-rush-game__stat">
          <span>Combo</span>
          <strong>x{liveStats.currentCombo}</strong>
        </div>

        <div className="delivery-rush-game__stat">
          <span>Izbegnuto</span>
          <strong>{liveStats.avoidedObstacles}</strong>
        </div>

        <div className="delivery-rush-game__stat delivery-rush-game__stat--lives">
          <span>Životi</span>
          <strong>
            {Math.max(
              0,
              deliveryRushGameRules.maximumCollisions -
                liveStats.collisionCount,
            )}
          </strong>
        </div>

        <div className="delivery-rush-game__stat">
          <span>Distanca</span>
          <strong>{liveStats.distance}</strong>
        </div>
      </div>

      <canvas
        className="delivery-rush-game__canvas"
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        aria-label="Delivery Rush tabla za igru"
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
          onClick={jumpPlayer}
          disabled={countdown !== null || jumpCooldownTicksRemaining > 0}
          aria-label="Preskoči prepreku"
        >
          {jumpCooldownTicksRemaining > 0 ? "Skok se puni…" : "↑ Skok"}
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

      <div className="delivery-rush-game__footer">
        <p className="delivery-rush-game__instructions">
          Levo/desno: strelice ili A/D. Skok: Space, strelica nagore ili W.
        </p>

        <button
          type="button"
          className="delivery-rush-game__sound-toggle"
          onClick={handleToggleSound}
          aria-pressed={isSoundEnabled}
          aria-label={
            isSoundEnabled ? "Isključi zvuk igre" : "Uključi zvuk igre"
          }
          title={isSoundEnabled ? "Isključi zvuk" : "Uključi zvuk"}
        >
          <span aria-hidden="true">{isSoundEnabled ? "🔊" : "🔇"}</span>

          <span className="delivery-rush-game__sound-text">
            {isSoundEnabled ? "Zvuk" : "Bez zvuka"}
          </span>
        </button>
      </div>
    </section>
  );
}

function getJumpCooldownTicksRemaining(
  currentTick: number,
  jumpStartTick: number | null,
): number {
  if (jumpStartTick === null) {
    return 0;
  }

  const nextAllowedJumpTick =
    jumpStartTick +
    deliveryRushGameRules.jumpDurationTicks +
    deliveryRushGameRules.jumpCooldownTicks;

  return Math.max(0, nextAllowedJumpTick - currentTick);
}

function drawGame(
  context: CanvasRenderingContext2D,
  currentTick: number,
  playerLane: number,
  obstacles: readonly DeliveryRushObstacle[],
  collisionFlashUntilTick: number,
  jumpStartTick: number | null,
): void {
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  const laneWidth = roadWidth / deliveryRushGameRules.laneCount;
  const collisionActive = currentTick <= collisionFlashUntilTick;

  drawGameBackground(context, currentTick);
  drawRoad(context, currentTick, laneWidth);
  drawUpcomingObstacles(context, currentTick, obstacles, laneWidth);

  const playerWidth = laneWidth * 0.34;
  const playerHeight = 76;

  const playerX =
    roadLeft + playerLane * laneWidth + (laneWidth - playerWidth) / 2;

  const jumpOffset = getJumpVisualOffset(currentTick, jumpStartTick);
  const renderedPlayerY = playerY - jumpOffset;

  const shadowScale = 1 - Math.min(jumpOffset / playerJumpHeight, 0.48);
  const collisionShake = collisionActive ? Math.sin(currentTick * 2.6) * 5 : 0;

  if (jumpOffset > 8) {
    drawJumpTrails(
      context,
      playerX + playerWidth / 2,
      renderedPlayerY + playerHeight,
      jumpOffset,
    );
  }

  context.fillStyle = "rgba(0, 0, 0, 0.42)";
  context.beginPath();
  context.ellipse(
    playerX + playerWidth / 2,
    playerY + playerHeight + 3,
    playerWidth * 0.48 * shadowScale,
    9 * shadowScale,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  drawDeliveryCar(
    context,
    playerX + collisionShake,
    renderedPlayerY,
    playerWidth,
    playerHeight,
    collisionActive,
  );

  if (collisionActive) {
    drawCollisionFlash(context, currentTick);
  }
}

function getJumpVisualOffset(
  currentTick: number,
  jumpStartTick: number | null,
): number {
  if (
    jumpStartTick === null ||
    !isDeliveryRushJumpActive(currentTick, jumpStartTick)
  ) {
    return 0;
  }

  const jumpProgress =
    (currentTick - jumpStartTick + 1) /
    (deliveryRushGameRules.jumpDurationTicks + 1);

  return Math.sin(jumpProgress * Math.PI) * playerJumpHeight;
}

function drawGameBackground(
  context: CanvasRenderingContext2D,
  currentTick: number,
): void {
  context.fillStyle = "#07140e";
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  context.fillStyle = "#0d2a1d";
  context.fillRect(0, 0, roadLeft - 10, canvasHeight);
  context.fillRect(
    roadLeft + roadWidth + 10,
    0,
    canvasWidth - roadLeft - roadWidth - 10,
    canvasHeight,
  );

  context.fillStyle = "rgba(255, 106, 37, 0.08)";
  context.fillRect(roadLeft - 34, 0, 24, canvasHeight);
  context.fillRect(roadLeft + roadWidth + 10, 0, 24, canvasHeight);

  const lightOffset = (currentTick * 5) % 48;

  for (let y = -48 + lightOffset; y < canvasHeight; y += 48) {
    drawRoadsideLight(context, roadLeft - 24, y);
    drawRoadsideLight(context, roadLeft + roadWidth + 24, y);
  }

  context.fillStyle = "rgba(255, 255, 255, 0.035)";

  for (let index = 0; index < 24; index++) {
    const leftX = 12 + ((index * 31) % Math.max(1, roadLeft - 38));
    const rightX = roadLeft + roadWidth + 38 + ((index * 27) % 45);
    const y = (index * 67 + currentTick * 3) % canvasHeight;

    context.fillRect(leftX, y, 2, 8);
    context.fillRect(rightX, y, 2, 8);
  }
}

function drawRoadsideLight(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  context.fillStyle = "rgba(255, 111, 35, 0.12)";
  context.beginPath();
  context.ellipse(x, y, 10, 10, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ff7a2f";
  context.beginPath();
  context.ellipse(x, y, 3, 3, 0, 0, Math.PI * 2);
  context.fill();
}

function drawRoad(
  context: CanvasRenderingContext2D,
  currentTick: number,
  laneWidth: number,
): void {
  context.fillStyle = "#080a0b";
  context.fillRect(roadLeft - 10, 0, roadWidth + 20, canvasHeight);

  context.fillStyle = "#202428";
  context.fillRect(roadLeft, 0, roadWidth, canvasHeight);

  context.fillStyle = "rgba(255, 255, 255, 0.025)";
  context.fillRect(
    roadLeft + roadWidth * 0.2,
    0,
    roadWidth * 0.6,
    canvasHeight,
  );

  for (let index = 0; index < 42; index++) {
    const x = roadLeft + 12 + ((index * 97) % (roadWidth - 24));
    const y = (index * 59 + currentTick * 4) % canvasHeight;
    const size = index % 3 === 0 ? 2 : 1;

    context.fillStyle =
      index % 2 === 0 ? "rgba(255, 255, 255, 0.075)" : "rgba(0, 0, 0, 0.18)";

    context.fillRect(x, y, size, size * 2);
  }

  const curbOffset = (currentTick * 6) % 32;

  for (let y = -32 + curbOffset; y < canvasHeight; y += 32) {
    context.fillStyle = "#ff5a1f";
    context.fillRect(roadLeft - 6, y, 6, 16);
    context.fillRect(roadLeft + roadWidth, y, 6, 16);

    context.fillStyle = "#f7e8d1";
    context.fillRect(roadLeft - 6, y + 16, 6, 16);
    context.fillRect(roadLeft + roadWidth, y + 16, 6, 16);
  }

  context.strokeStyle = "rgba(255, 246, 228, 0.72)";
  context.lineWidth = 3;
  context.setLineDash([25, 21]);
  context.lineDashOffset = -((currentTick * 6) % 46);

  for (let lane = 1; lane < deliveryRushGameRules.laneCount; lane++) {
    const laneX = roadLeft + laneWidth * lane;

    context.beginPath();
    context.moveTo(laneX, 0);
    context.lineTo(laneX, canvasHeight);
    context.stroke();
  }

  context.setLineDash([]);

  context.fillStyle = "rgba(255, 111, 35, 0.18)";
  context.fillRect(roadLeft + 3, 0, 2, canvasHeight);
  context.fillRect(roadLeft + roadWidth - 5, 0, 2, canvasHeight);
}

function drawJumpTrails(
  context: CanvasRenderingContext2D,
  centerX: number,
  carBottom: number,
  jumpOffset: number,
): void {
  const trailLength = Math.min(48, 18 + jumpOffset * 0.35);

  context.strokeStyle = "rgba(255, 151, 67, 0.55)";
  context.lineWidth = 3;

  for (const offset of [-15, 0, 15]) {
    context.beginPath();
    context.moveTo(centerX + offset, carBottom + 5);
    context.lineTo(centerX + offset, carBottom + trailLength);
    context.stroke();
  }
}

function drawUpcomingObstacles(
  context: CanvasRenderingContext2D,
  currentTick: number,
  obstacles: readonly DeliveryRushObstacle[],
  laneWidth: number,
): void {
  for (const obstacle of obstacles) {
    const firstVisibleTick = obstacle.tick - obstacleApproachTicks;

    const collisionWindowStartTick =
      obstacle.tick - deliveryRushGameRules.collisionWindowBeforeTicks;

    const lastVisibleTick =
      obstacle.tick + deliveryRushGameRules.collisionWindowAfterTicks;

    if (currentTick < firstVisibleTick || currentTick > lastVisibleTick) {
      continue;
    }

    const ticksBeforeFirstContact = collisionWindowStartTick - firstVisibleTick;

    const pixelsBeforeFirstContact = playerY - obstacleHeight - obstacleSpawnY;

    const obstaclePixelsPerTick =
      pixelsBeforeFirstContact / ticksBeforeFirstContact;

    const obstacleY =
      obstacleSpawnY + (currentTick - firstVisibleTick) * obstaclePixelsPerTick;

    for (let lane = 0; lane < deliveryRushGameRules.laneCount; lane++) {
      if (!isLaneBlocked(obstacle.blockedLaneMask, lane)) {
        continue;
      }

      const obstacleWidth = laneWidth * 0.58;

      const obstacleX =
        roadLeft + lane * laneWidth + (laneWidth - obstacleWidth) / 2;

      const variant = Math.abs(obstacle.tick + lane * 17) % 3;

      drawObstacle(
        context,
        obstacleX,
        obstacleY,
        obstacleWidth,
        obstacleHeight,
        variant,
      );
    }
  }
}

function drawObstacle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  variant: number,
): void {
  context.fillStyle = "rgba(0, 0, 0, 0.32)";
  context.beginPath();
  context.ellipse(
    x + width / 2,
    y + height + 5,
    width * 0.46,
    6,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  if (variant === 0) {
    drawBarrier(context, x, y, width, height);
    return;
  }

  if (variant === 1) {
    drawConeGroup(context, x, y, width, height);
    return;
  }

  drawDeliveryCrates(context, x, y, width, height);
}

function drawBarrier(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.fillStyle = "#2c1510";
  context.fillRect(x - 3, y + 5, width + 6, height - 7);

  const segmentWidth = width / 6;

  for (let index = 0; index < 6; index++) {
    context.fillStyle = index % 2 === 0 ? "#ff5a1f" : "#fff0d8";
    context.fillRect(
      x + index * segmentWidth,
      y + 3,
      segmentWidth + 1,
      height - 12,
    );
  }

  context.fillStyle = "#151718";
  context.fillRect(x + 8, y + height - 8, 7, 8);
  context.fillRect(x + width - 15, y + height - 8, 7, 8);

  context.fillStyle = "#ffb15f";
  context.fillRect(x + 4, y, width - 8, 3);
}

function drawConeGroup(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const coneWidth = Math.min(22, width / 4);
  const spacing = (width - coneWidth * 3) / 2;

  for (let index = 0; index < 3; index++) {
    const coneX = x + index * (coneWidth + spacing);

    context.fillStyle = "#ff6a21";
    context.beginPath();
    context.moveTo(coneX + coneWidth / 2, y);
    context.lineTo(coneX + coneWidth, y + height - 7);
    context.lineTo(coneX, y + height - 7);
    context.lineTo(coneX + coneWidth / 2, y);
    context.fill();

    context.fillStyle = "#fff2dc";
    context.fillRect(
      coneX + coneWidth * 0.23,
      y + height * 0.48,
      coneWidth * 0.54,
      5,
    );

    context.fillStyle = "#242729";
    context.fillRect(coneX - 3, y + height - 7, coneWidth + 6, 7);
  }
}

function drawDeliveryCrates(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const gap = 6;
  const crateWidth = (width - gap) / 2;

  for (let index = 0; index < 2; index++) {
    const crateX = x + index * (crateWidth + gap);

    context.fillStyle = "#4a2717";
    context.fillRect(crateX - 2, y + 2, crateWidth + 4, height);

    context.fillStyle = "#c66a2e";
    context.fillRect(crateX, y, crateWidth, height - 3);

    context.fillStyle = "#f0a05e";
    context.fillRect(crateX + 4, y + 4, crateWidth - 8, 3);
    context.fillRect(crateX + crateWidth / 2 - 2, y, 4, height - 3);

    context.fillStyle = "#2b1710";
    context.fillRect(crateX + 4, y + height - 9, crateWidth - 8, 3);
  }
}

function drawDeliveryCar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  collisionActive: boolean,
): void {
  context.shadowColor = collisionActive
    ? "rgba(255, 55, 40, 0.9)"
    : "rgba(255, 91, 31, 0.62)";
  context.shadowBlur = collisionActive ? 22 : 13;

  context.fillStyle = "#111416";
  context.fillRect(x - 4, y + 14, 6, 18);
  context.fillRect(x + width - 2, y + 14, 6, 18);
  context.fillRect(x - 4, y + height - 31, 6, 18);
  context.fillRect(x + width - 2, y + height - 31, 6, 18);

  fillCapsule(
    context,
    x,
    y,
    width,
    height,
    collisionActive ? "#ff3328" : "#ff5a1f",
  );

  context.shadowBlur = 0;

  context.fillStyle = "#ff9b45";
  context.fillRect(x + width * 0.12, y + 11, width * 0.1, height - 22);

  context.fillStyle = "#14221d";
  fillCapsule(context, x + width * 0.18, y + 12, width * 0.64, 19, "#14221d");

  context.fillStyle = "rgba(132, 213, 190, 0.55)";
  context.fillRect(x + width * 0.24, y + 17, width * 0.52, 4);

  fillCapsule(
    context,
    x + width * 0.23,
    y + height - 24,
    width * 0.54,
    13,
    "#241a16",
  );

  context.fillStyle = "#fff1ba";
  context.fillRect(x + 7, y + 4, 10, 5);
  context.fillRect(x + width - 17, y + 4, 10, 5);

  context.fillStyle = "#ff342d";
  context.fillRect(x + 7, y + height - 9, 10, 5);
  context.fillRect(x + width - 17, y + height - 9, 10, 5);

  context.fillStyle = "#fff7e8";
  context.font = "900 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("B+C", x + width / 2, y + height * 0.58);
}

function fillCapsule(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  const radius = Math.min(width / 2, height * 0.2);

  context.fillStyle = color;
  context.fillRect(x, y + radius, width, height - radius * 2);

  context.beginPath();
  context.ellipse(
    x + width / 2,
    y + radius,
    width / 2,
    radius,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.beginPath();
  context.ellipse(
    x + width / 2,
    y + height - radius,
    width / 2,
    radius,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
}

function drawCollisionFlash(
  context: CanvasRenderingContext2D,
  currentTick: number,
): void {
  const pulse = 0.16 + Math.abs(Math.sin(currentTick * 1.8)) * 0.12;

  context.fillStyle = `rgba(255, 45, 35, ${pulse})`;
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  context.fillStyle = "rgba(255, 66, 45, 0.75)";
  context.fillRect(0, 0, canvasWidth, 6);
  context.fillRect(0, canvasHeight - 6, canvasWidth, 6);
  context.fillRect(0, 0, 6, canvasHeight);
  context.fillRect(canvasWidth - 6, 0, 6, canvasHeight);
}

function drawCountdown(context: CanvasRenderingContext2D, value: number): void {
  context.fillStyle = "rgba(3, 8, 5, 0.78)";
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  context.fillStyle = "rgba(255, 90, 31, 0.12)";
  context.beginPath();
  context.ellipse(
    canvasWidth / 2,
    canvasHeight / 2,
    122,
    122,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.strokeStyle = "#ff6a28";
  context.lineWidth = 5;
  context.setLineDash([]);
  context.beginPath();
  context.ellipse(canvasWidth / 2, canvasHeight / 2, 88, 88, 0, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#ff9b4a";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 13px system-ui, sans-serif";
  context.fillText("SPREMI SE", canvasWidth / 2, canvasHeight / 2 - 48);

  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(255, 91, 31, 0.9)";
  context.shadowBlur = 24;
  context.font = "900 92px system-ui, sans-serif";
  context.fillText(value.toString(), canvasWidth / 2, canvasHeight / 2 + 16);

  context.shadowBlur = 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
