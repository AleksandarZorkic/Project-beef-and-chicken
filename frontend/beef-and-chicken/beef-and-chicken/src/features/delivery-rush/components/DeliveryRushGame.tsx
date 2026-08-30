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
import type {
  DeliveryRushSound,
  DeliveryRushSoundOptions,
} from "../audio/deliveryRushAudio";
import "./DeliveryRushGame.scss";
import { useDeliveryRushSound } from "../hooks/useDeliveryRushSound";
import type { PointerEvent as ReactPointerEvent } from "react";

const canvasWidth = 720;
const canvasHeight = 480;
const roadLeft = 90;
const roadWidth = 540;
const playerY = 390;
const playerJumpHeight = 82;
const obstacleApproachTicks = 90;
const obstacleEntryBottomY = -12;
const landingImpactDurationTicks = 7;
const obstaclePassFeedbackDurationTicks = 13;
const difficultyBannerDurationTicks = 36;
const roadScrollPixelsPerTick = 4;
const collisionFlashDurationTicks = 8;
const carHornWarningTicks = 24;
const hudRefreshIntervalTicks = 3;

const deliveryRushLogoImage: HTMLImageElement | null =
  typeof Image === "undefined" ? null : new Image();

if (deliveryRushLogoImage) {
  deliveryRushLogoImage.src = "/logo.png";
}

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

const difficultyTransitionStartTicks: Partial<
  Record<DeliveryRushDifficultyLevel, number>
> = {
  medium: 600,
  hard: 1200,
  "very-hard": 1800,
  extreme: 2400,
  "rush-hour": 3000,
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

  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const animationFrameRef = useRef<number | null>(null);

  const startTimeRef = useRef(0);
  const currentTickRef = useRef(0);
  const lastProcessedTickRef = useRef(-1);
  const collisionFlashUntilTickRef = useRef(-1);
  const lastCollisionCountRef = useRef(0);
  const lastAvoidedObstaclesRef = useRef(0);
  const obstaclePassFeedbackUntilTickRef = useRef(-1);
  const obstaclePassFeedbackComboRef = useRef(0);
  const lastJumpTickRef = useRef<number | null>(null);
  const lastLandedJumpTickRef = useRef<number | null>(null);
  const lastDifficultyLevelRef = useRef<DeliveryRushDifficultyLevel>("easy");
  const warnedCarTicksRef = useRef<Set<number>>(new Set());
  const finishedRef = useRef(false);

  const playerLaneRef = useRef<number>(deliveryRushGameRules.startingLane);

  const visualPlayerLaneRef = useRef<number>(
    deliveryRushGameRules.startingLane,
  );

  const previousAnimationTimeRef = useRef<number | null>(null);

  const inputsRef = useRef<DeliveryRushInput[]>([]);

  const onFinishedRef = useRef(onFinished);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    deliveryRushGameRules.durationSeconds,
  );

  const [countdown, setCountdown] = useState<number | null>(3);

  const [isJumpOnCooldown, setIsJumpOnCooldown] = useState(false);

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

    setIsJumpOnCooldown(true);

    triggerHapticFeedback(18);
    playSound("jump");
  }, [playSound]);

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (
        event.pointerType === "mouse" ||
        countdown !== null ||
        finishedRef.current ||
        startTimeRef.current === 0
      ) {
        return;
      }

      event.preventDefault();

      swipeStartRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [countdown],
  );

  const handleCanvasPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const swipeStart = swipeStartRef.current;

      if (!swipeStart || swipeStart.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      swipeStartRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const horizontalDistance = event.clientX - swipeStart.x;
      const verticalDistance = event.clientY - swipeStart.y;

      const minimumSwipeDistance = Math.max(
        28,
        Math.min(
          event.currentTarget.clientWidth,
          event.currentTarget.clientHeight,
        ) * 0.09,
      );

      const horizontalSwipe = Math.abs(horizontalDistance);
      const verticalSwipe = Math.abs(verticalDistance);

      if (
        horizontalSwipe < minimumSwipeDistance &&
        verticalSwipe < minimumSwipeDistance
      ) {
        return;
      }

      if (horizontalSwipe > verticalSwipe) {
        movePlayer(horizontalDistance < 0 ? -1 : 1);
        return;
      }

      if (verticalDistance < -minimumSwipeDistance) {
        jumpPlayer();
      }
    },
    [jumpPlayer, movePlayer],
  );

  const handleCanvasPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (swipeStartRef.current?.pointerId === event.pointerId) {
        swipeStartRef.current = null;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

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

    const canvasPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    canvas.width = Math.round(canvasWidth * canvasPixelRatio);
    canvas.height = Math.round(canvasHeight * canvasPixelRatio);

    drawingContext.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0);

    drawingContext.imageSmoothingEnabled = true;
    drawingContext.imageSmoothingQuality = "high";

    const countdownTimeouts: number[] = [];

    inputsRef.current = [];

    playerLaneRef.current = deliveryRushGameRules.startingLane;

    visualPlayerLaneRef.current = deliveryRushGameRules.startingLane;

    previousAnimationTimeRef.current = null;

    currentTickRef.current = 0;
    lastProcessedTickRef.current = -1;
    collisionFlashUntilTickRef.current = -1;
    lastCollisionCountRef.current = 0;
    lastAvoidedObstaclesRef.current = 0;
    obstaclePassFeedbackUntilTickRef.current = -1;
    obstaclePassFeedbackComboRef.current = 0;
    lastJumpTickRef.current = null;
    lastLandedJumpTickRef.current = null;
    lastDifficultyLevelRef.current = "easy";
    warnedCarTicksRef.current.clear();
    finishedRef.current = false;
    startTimeRef.current = 0;

    setSecondsRemaining(deliveryRushGameRules.durationSeconds);

    setLiveStats(initialLiveStats);

    setIsJumpOnCooldown(false);

    function showCountdown(value: number) {
      setCountdown(value);
      playSound("countdown-tick");

      drawGame(
        drawingContext,
        0,
        deliveryRushGameRules.startingLane,
        0,
        obstacles,
        -1,
        null,
        -1,
        0,
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

      const previousAnimationTime = previousAnimationTimeRef.current;

      const frameDeltaSeconds =
        previousAnimationTime === null
          ? 0
          : Math.min((currentTime - previousAnimationTime) / 1000, 0.05);

      previousAnimationTimeRef.current = currentTime;

      const laneDifference =
        playerLaneRef.current - visualPlayerLaneRef.current;

      const laneSmoothing = 1 - Math.exp(-18 * frameDeltaSeconds);

      visualPlayerLaneRef.current += laneDifference * laneSmoothing;

      if (Math.abs(laneDifference) < 0.001) {
        visualPlayerLaneRef.current = playerLaneRef.current;
      }

      const steeringAmount = clamp(laneDifference * 1.25, -1, 1);

      playUpcomingCarHorn(
        calculatedTick,
        obstacles,
        warnedCarTicksRef.current,
        playSound,
      );

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

      const jumpIsCurrentlyOnCooldown =
        getJumpCooldownTicksRemaining(calculatedTick, lastJumpTickRef.current) >
        0;

      setIsJumpOnCooldown((currentValue) =>
        currentValue === jumpIsCurrentlyOnCooldown
          ? currentValue
          : jumpIsCurrentlyOnCooldown,
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

        const collisionCountChanged =
          calculatedStats.collisionCount > lastCollisionCountRef.current;

        const avoidedObstaclesChanged =
          calculatedStats.avoidedObstacles > lastAvoidedObstaclesRef.current;

        if (collisionCountChanged) {
          collisionFlashUntilTickRef.current =
            calculatedTick + collisionFlashDurationTicks;

          triggerHapticFeedback([70, 35, 70]);

          const collisionObstacle = findCollisionObstacle(
            obstacles,
            calculatedTick,
            playerLaneRef.current,
          );

          if (collisionObstacle?.type === "car") {
            playSound("car-collision", {
              pan: getObstacleStereoPan(collisionObstacle.blockedLaneMask),
            });
          } else if (collisionObstacle?.type === "pothole") {
            playSound("pothole-hit", {
              pan: getObstacleStereoPan(collisionObstacle.blockedLaneMask),
            });
          } else {
            playSound("collision", {
              pan: collisionObstacle
                ? getObstacleStereoPan(collisionObstacle.blockedLaneMask)
                : 0,
            });
          }

          playSound("life-lost");
        }

        if (avoidedObstaclesChanged) {
          obstaclePassFeedbackUntilTickRef.current =
            calculatedTick + obstaclePassFeedbackDurationTicks;

          obstaclePassFeedbackComboRef.current = calculatedStats.currentCombo;
        }

        reachedCollisionLimit =
          calculatedStats.collisionCount >=
          deliveryRushGameRules.maximumCollisions;

        const shouldRefreshHud =
          calculatedTick % hudRefreshIntervalTicks === 0 ||
          collisionCountChanged ||
          avoidedObstaclesChanged ||
          reachedCollisionLimit;

        if (shouldRefreshHud) {
          setLiveStats(calculatedStats);
        }

        lastCollisionCountRef.current = calculatedStats.collisionCount;

        lastAvoidedObstaclesRef.current = calculatedStats.avoidedObstacles;

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
        visualPlayerLaneRef.current,
        steeringAmount,
        obstacles,
        collisionFlashUntilTickRef.current,
        lastJumpTickRef.current,
        obstaclePassFeedbackUntilTickRef.current,
        obstaclePassFeedbackComboRef.current,
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

  const remainingLives = Math.max(
    0,
    deliveryRushGameRules.maximumCollisions - liveStats.collisionCount,
  );

  const isTimeCritical =
    countdown === null && secondsRemaining > 0 && secondsRemaining <= 20;

  const isLastLife = remainingLives === 1;

  return (
    <section className="delivery-rush-game">
      <div className="delivery-rush-game__hud">
        <div
          className={
            `delivery-rush-game__stat` +
            (isTimeCritical ? " delivery-rush-game__stat--time-critical" : "")
          }
        >
          <span>{countdown !== null ? "Početak za" : "Preostalo vreme"}</span>

          <strong>
            {countdown !== null ? countdown : `${secondsRemaining}s`}
          </strong>
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
          <strong>{liveStats.score.toLocaleString("sr-RS")}</strong>
        </div>

        <div className="delivery-rush-game__stat">
          <span>Combo</span>
          <strong>x{liveStats.currentCombo}</strong>
        </div>

        <div
          className={
            `delivery-rush-game__stat ` +
            `delivery-rush-game__stat--lives` +
            (isLastLife ? " delivery-rush-game__stat--last-life" : "")
          }
        >
          <span>Životi</span>
          <strong>{remainingLives}</strong>
        </div>
      </div>

      <canvas
        className="delivery-rush-game__canvas"
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerCancel}
        aria-label="Delivery Rush tabla za igru. Prevuci levo ili desno za promenu trake, a nagore za skok."
      >
        Tvoj pregledač ne podržava Canvas.
      </canvas>

      <div className="delivery-rush-game__controls">
        <button
          type="button"
          className="btn btn--primary delivery-rush-game__control-button"
          onClick={() => movePlayer(-1)}
          disabled={countdown !== null}
          aria-label="Pomeri vozilo u levu traku"
          aria-keyshortcuts="ArrowLeft A"
        >
          <span className="delivery-rush-game__control-icon" aria-hidden="true">
            ←
          </span>

          <span>Levo</span>
        </button>

        <button
          type="button"
          className={[
            "btn",
            "btn--primary",
            "delivery-rush-game__control-button",
            "delivery-rush-game__control-button--jump",
            isJumpOnCooldown
              ? "delivery-rush-game__control-button--cooldown"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={jumpPlayer}
          disabled={countdown !== null || isJumpOnCooldown}
          aria-label="Preskoči prepreku"
          aria-keyshortcuts="ArrowUp W Space"
        >
          <span className="delivery-rush-game__control-icon" aria-hidden="true">
            ↑
          </span>

          <span>{isJumpOnCooldown ? "Skok se puni…" : "Skok"}</span>
        </button>

        <button
          type="button"
          className="btn btn--primary delivery-rush-game__control-button"
          onClick={() => movePlayer(1)}
          disabled={countdown !== null}
          aria-label="Pomeri vozilo u desnu traku"
          aria-keyshortcuts="ArrowRight D"
        >
          <span>Desno</span>

          <span className="delivery-rush-game__control-icon" aria-hidden="true">
            →
          </span>
        </button>
      </div>

      <div className="delivery-rush-game__footer">
        <div
          className="delivery-rush-game__instructions"
          aria-label="Kontrole igre"
        >
          <span>
            <kbd>A / D</kbd>
            <span>promena trake</span>
          </span>

          <span>
            <kbd>Space / W</kbd>
            <span>skok</span>
          </span>

          <span className="delivery-rush-game__instructions-tip">
            Auto zaobiđi • rupu i radove preskoči
          </span>
        </div>

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

function playUpcomingCarHorn(
  currentTick: number,
  obstacles: readonly DeliveryRushObstacle[],
  warnedCarTicks: Set<number>,
  playSound: (
    sound: DeliveryRushSound,
    options?: DeliveryRushSoundOptions,
  ) => void,
): void {
  for (const obstacle of obstacles) {
    if (obstacle.type !== "car" || warnedCarTicks.has(obstacle.tick)) {
      continue;
    }

    const warningTick = obstacle.tick - carHornWarningTicks;

    const collisionWindowStartTick =
      obstacle.tick - deliveryRushGameRules.collisionWindowBeforeTicks;

    if (currentTick < warningTick || currentTick >= collisionWindowStartTick) {
      continue;
    }

    warnedCarTicks.add(obstacle.tick);

    playSound("car-horn", {
      pan: getObstacleStereoPan(obstacle.blockedLaneMask),
    });
  }
}

function findCollisionObstacle(
  obstacles: readonly DeliveryRushObstacle[],
  currentTick: number,
  playerLane: number,
): DeliveryRushObstacle | undefined {
  return obstacles.find((obstacle) => {
    const collisionWindowStartTick =
      obstacle.tick - deliveryRushGameRules.collisionWindowBeforeTicks;

    const collisionWindowEndTick =
      obstacle.tick + deliveryRushGameRules.collisionWindowAfterTicks;

    return (
      currentTick >= collisionWindowStartTick &&
      currentTick <= collisionWindowEndTick &&
      isLaneBlocked(obstacle.blockedLaneMask, playerLane)
    );
  });
}

function getObstacleStereoPan(blockedLaneMask: number): number {
  let blockedLaneTotal = 0;
  let blockedLaneCount = 0;

  for (let lane = 0; lane < deliveryRushGameRules.laneCount; lane++) {
    if (isLaneBlocked(blockedLaneMask, lane)) {
      blockedLaneTotal += lane;
      blockedLaneCount++;
    }
  }

  if (blockedLaneCount === 0 || deliveryRushGameRules.laneCount <= 1) {
    return 0;
  }

  const averageLane = blockedLaneTotal / blockedLaneCount;

  const centeredLane =
    (averageLane / (deliveryRushGameRules.laneCount - 1)) * 2 - 1;

  return centeredLane * 0.7;
}

function drawGame(
  context: CanvasRenderingContext2D,
  currentTick: number,
  playerLane: number,
  steeringAmount: number,
  obstacles: readonly DeliveryRushObstacle[],
  collisionFlashUntilTick: number,
  jumpStartTick: number | null,
  obstaclePassFeedbackUntilTick: number,
  obstaclePassFeedbackCombo: number,
): void {
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  const laneWidth = roadWidth / deliveryRushGameRules.laneCount;
  const collisionActive = currentTick <= collisionFlashUntilTick;

  const collisionIntensity = collisionActive
    ? clamp(
        (collisionFlashUntilTick - currentTick) / collisionFlashDurationTicks,
        0,
        1,
      )
    : 0;

  const playerWidth = laneWidth * 0.34;
  const playerHeight = 76;

  const playerX =
    roadLeft + playerLane * laneWidth + (laneWidth - playerWidth) / 2;

  const jumpProgress = getJumpVisualProgress(currentTick, jumpStartTick);

  const jumpOffset = getJumpVisualOffset(currentTick, jumpStartTick);
  const renderedPlayerY = playerY - jumpOffset;

  drawGameBackground(context, currentTick);
  drawRoad(context, currentTick, laneWidth);
  drawPlayerHeadlights(
    context,
    playerX,
    renderedPlayerY,
    playerWidth,
    steeringAmount,
  );
  drawSpeedLines(context, currentTick);
  drawUpcomingObstacles(context, currentTick, obstacles, laneWidth);

  const shadowScale = 1 - Math.min(jumpOffset / playerJumpHeight, 0.48);
  const collisionShake = collisionActive ? Math.sin(currentTick * 2.6) * 5 : 0;

  const steeringAngle = steeringAmount * 0.12;

  const jumpLift = Math.sin(jumpProgress * Math.PI);

  const landingImpactProgress = getLandingImpactProgress(
    currentTick,
    jumpStartTick,
  );

  const landingCompression =
    landingImpactProgress === null ? 0 : (1 - landingImpactProgress) * 0.065;

  const carScaleX = 1 + jumpLift * 0.04 + landingCompression * 0.55;

  const carScaleY = 1 + jumpLift * 0.06 - landingCompression;

  if (jumpOffset > 8) {
    drawJumpTrails(
      context,
      playerX + playerWidth / 2,
      renderedPlayerY + playerHeight,
      jumpOffset,
    );
  }

  if (landingImpactProgress !== null) {
    drawLandingImpact(
      context,
      playerX + playerWidth / 2,
      playerY + playerHeight + 3,
      landingImpactProgress,
    );
  }
  const playerGroundGlow = context.createRadialGradient(
    playerX + playerWidth / 2,
    playerY + playerHeight + 3,
    2,
    playerX + playerWidth / 2,
    playerY + playerHeight + 3,
    playerWidth * 0.66,
  );

  playerGroundGlow.addColorStop(
    0,
    collisionActive ? "rgba(255, 48, 38, 0.24)" : "rgba(255, 103, 34, 0.17)",
  );

  playerGroundGlow.addColorStop(1, "rgba(255, 103, 34, 0)");

  context.fillStyle = playerGroundGlow;
  context.beginPath();

  context.ellipse(
    playerX + playerWidth / 2,
    playerY + playerHeight + 3,
    playerWidth * 0.66 * shadowScale,
    13 * shadowScale,
    steeringAngle * 0.35,
    0,
    Math.PI * 2,
  );

  context.fill();

  context.fillStyle = "rgba(0, 0, 0, 0.42)";
  context.beginPath();
  context.ellipse(
    playerX + playerWidth / 2,
    playerY + playerHeight + 3,
    playerWidth * 0.48 * shadowScale,
    9 * shadowScale,
    steeringAngle * 0.35,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.save();

  context.translate(
    playerX + playerWidth / 2 + collisionShake,
    renderedPlayerY + playerHeight / 2,
  );

  context.rotate(steeringAngle);

  context.scale(carScaleX, carScaleY);

  drawDeliveryCar(
    context,
    -playerWidth / 2,
    -playerHeight / 2,
    playerWidth,
    playerHeight,
    collisionActive,
  );

  context.restore();

  if (collisionIntensity > 0) {
    drawCollisionSparks(
      context,
      playerX + playerWidth / 2,
      renderedPlayerY + 13,
      collisionIntensity,
    );
  }

  if (currentTick <= obstaclePassFeedbackUntilTick) {
    const feedbackProgress = clamp(
      1 -
        (obstaclePassFeedbackUntilTick - currentTick) /
          obstaclePassFeedbackDurationTicks,
      0,
      1,
    );

    drawObstaclePassFeedback(
      context,
      playerX + playerWidth / 2,
      renderedPlayerY - 8,
      feedbackProgress,
      obstaclePassFeedbackCombo,
    );
  }

  drawDifficultyVignette(context, currentTick);

  drawDifficultyTransitionBanner(context, currentTick);

  if (collisionActive) {
    drawCollisionFlash(context, currentTick, collisionIntensity);
  }
}

function getJumpVisualOffset(
  currentTick: number,
  jumpStartTick: number | null,
): number {
  const jumpProgress = getJumpVisualProgress(currentTick, jumpStartTick);

  return Math.sin(jumpProgress * Math.PI) * playerJumpHeight;
}

function getJumpVisualProgress(
  currentTick: number,
  jumpStartTick: number | null,
): number {
  if (
    jumpStartTick === null ||
    !isDeliveryRushJumpActive(currentTick, jumpStartTick)
  ) {
    return 0;
  }

  return (
    (currentTick - jumpStartTick + 1) /
    (deliveryRushGameRules.jumpDurationTicks + 1)
  );
}

function getLandingImpactProgress(
  currentTick: number,
  jumpStartTick: number | null,
): number | null {
  if (jumpStartTick === null) {
    return null;
  }

  const landingTick = jumpStartTick + deliveryRushGameRules.jumpDurationTicks;

  const ticksSinceLanding = currentTick - landingTick;

  if (
    ticksSinceLanding < 0 ||
    ticksSinceLanding >= landingImpactDurationTicks
  ) {
    return null;
  }

  return ticksSinceLanding / landingImpactDurationTicks;
}

function drawLandingImpact(
  context: CanvasRenderingContext2D,
  centerX: number,
  groundY: number,
  progress: number,
): void {
  const easedProgress = 1 - Math.pow(1 - progress, 2);

  const opacity = (1 - progress) * 0.52;
  const horizontalRadius = 21 + easedProgress * 35;

  const verticalRadius = 5 + easedProgress * 7;

  context.save();

  context.strokeStyle = `rgba(255, 135, 56, ${opacity})`;

  context.lineWidth = 2.4 - progress * 1.4;

  context.shadowColor = "rgba(255, 97, 31, 0.45)";

  context.shadowBlur = 6 * (1 - progress);

  context.beginPath();

  context.ellipse(
    centerX,
    groundY,
    horizontalRadius,
    verticalRadius,
    0,
    0,
    Math.PI * 2,
  );

  context.stroke();

  for (const direction of [-1, 1]) {
    context.beginPath();

    context.moveTo(centerX + direction * 18, groundY - 1);

    context.lineTo(
      centerX + direction * (29 + easedProgress * 15),
      groundY - 5 - easedProgress * 4,
    );

    context.stroke();
  }

  context.restore();
}

function drawGameBackground(
  context: CanvasRenderingContext2D,
  currentTick: number,
): void {
  const backgroundGradient = context.createLinearGradient(
    0,
    0,
    0,
    canvasHeight,
  );

  backgroundGradient.addColorStop(0, "#05080b");
  backgroundGradient.addColorStop(0.55, "#07130f");
  backgroundGradient.addColorStop(1, "#0b1c14");

  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  const sidewalkGradient = context.createLinearGradient(0, 0, roadLeft, 0);

  sidewalkGradient.addColorStop(0, "#09110f");
  sidewalkGradient.addColorStop(1, "#153426");

  context.fillStyle = sidewalkGradient;
  context.fillRect(0, 0, roadLeft - 10, canvasHeight);

  const rightSidewalkGradient = context.createLinearGradient(
    roadLeft + roadWidth,
    0,
    canvasWidth,
    0,
  );

  rightSidewalkGradient.addColorStop(0, "#153426");
  rightSidewalkGradient.addColorStop(1, "#09110f");

  context.fillStyle = rightSidewalkGradient;
  context.fillRect(
    roadLeft + roadWidth + 10,
    0,
    canvasWidth - roadLeft - roadWidth - 10,
    canvasHeight,
  );

  context.fillStyle = "rgba(255, 106, 37, 0.08)";
  context.fillRect(roadLeft - 34, 0, 24, canvasHeight);
  context.fillRect(roadLeft + roadWidth + 10, 0, 24, canvasHeight);

  const tileOffset = (currentTick * 4) % 44;

  context.strokeStyle = "rgba(139, 190, 161, 0.08)";
  context.lineWidth = 1;

  for (let y = -44 + tileOffset; y < canvasHeight; y += 44) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(roadLeft - 10, y);
    context.stroke();

    context.beginPath();
    context.moveTo(roadLeft + roadWidth + 10, y);
    context.lineTo(canvasWidth, y);
    context.stroke();
  }

  const lightOffset = (currentTick * 5) % 48;

  for (let y = -48 + lightOffset; y < canvasHeight; y += 48) {
    drawRoadsideLight(context, roadLeft - 24, y);
    drawRoadsideLight(context, roadLeft + roadWidth + 24, y);
  }

  const signOffset = (currentTick * 3) % 176;

  for (let index = -1; index < 4; index++) {
    const y = index * 176 + signOffset - 48;
    const variant = Math.abs(index) % 3;

    drawNeonRoadsideSign(context, 8, y, false, variant);
    drawNeonRoadsideSign(
      context,
      canvasWidth - 72,
      y + 88,
      true,
      (variant + 1) % 3,
    );
  }
}

function drawNeonRoadsideSign(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  alignRight: boolean,
  variant: number,
): void {
  const designs = [
    {
      title: "BEEF",
      subtitle: "SMASH",
      color: "#ff6b29",
    },
    {
      title: "CHICKEN",
      subtitle: "GRILL",
      color: "#ffd247",
    },
    {
      title: "DELIVERY",
      subtitle: "RUSH",
      color: "#57dc7b",
    },
  ] as const;

  const design = designs[variant % designs.length];
  const width = 64;
  const height = 38;
  const textCenterX = x + 43;

  context.save();

  const signVisibility = Math.min(1, Math.max(0, (y + 60) / 160));

  context.globalAlpha = 0.45 + signVisibility * 0.37;

  // Metal support
  context.strokeStyle = "rgba(139, 157, 147, 0.38)";
  context.lineWidth = 2;

  context.beginPath();
  context.moveTo(alignRight ? x : x + width, y + height / 2);
  context.lineTo(
    alignRight ? roadLeft + roadWidth + 8 : roadLeft - 8,
    y + height / 2,
  );
  context.stroke();

  // Sign shadow
  context.shadowColor = design.color;
  context.shadowBlur = 7;
  context.fillStyle = "rgba(2, 8, 5, 0.96)";
  context.fillRect(x, y, width, height);

  context.shadowBlur = 0;

  // Outer frame
  context.strokeStyle = design.color;
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, width - 2, height - 2);

  // Inner frame
  context.strokeStyle = "rgba(255, 255, 255, 0.13)";
  context.lineWidth = 1;
  context.strokeRect(x + 5, y + 5, width - 10, height - 10);

  // Colored top stripe
  context.fillStyle = design.color;
  context.fillRect(x + 5, y + 5, width - 10, 2);

  drawBeefAndChickenLogo(context, x + 15, y + height / 2, 17);

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = "#fff8e9";
  context.font =
    design.title === "DELIVERY"
      ? "900 6.5px system-ui, sans-serif"
      : design.title === "CHICKEN"
        ? "900 7px system-ui, sans-serif"
        : "900 9px system-ui, sans-serif";

  context.fillText(design.title, textCenterX, y + 15);

  context.fillStyle = design.color;
  context.font = "800 5.5px system-ui, sans-serif";

  context.fillText(design.subtitle, textCenterX, y + 26);

  context.restore();
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
  context.fillStyle = "#050708";
  context.fillRect(roadLeft - 11, 0, roadWidth + 22, canvasHeight);

  const asphaltGradient = context.createLinearGradient(
    roadLeft,
    0,
    roadLeft + roadWidth,
    0,
  );

  asphaltGradient.addColorStop(0, "#111619");
  asphaltGradient.addColorStop(0.14, "#20272b");
  asphaltGradient.addColorStop(0.5, "#2a3135");
  asphaltGradient.addColorStop(0.86, "#20272b");
  asphaltGradient.addColorStop(1, "#111619");

  context.fillStyle = asphaltGradient;
  context.fillRect(roadLeft, 0, roadWidth, canvasHeight);

  const wetSheen = context.createLinearGradient(
    roadLeft,
    0,
    roadLeft + roadWidth,
    0,
  );

  wetSheen.addColorStop(0, "rgba(255, 255, 255, 0)");
  wetSheen.addColorStop(0.28, "rgba(178, 213, 207, 0.025)");
  wetSheen.addColorStop(0.5, "rgba(226, 238, 231, 0.07)");
  wetSheen.addColorStop(0.72, "rgba(178, 213, 207, 0.025)");
  wetSheen.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = wetSheen;
  context.fillRect(roadLeft, 0, roadWidth, canvasHeight);

  drawRoadReflections(context, currentTick);
  drawAsphaltDetails(context, currentTick);

  const curbOffset = (currentTick * roadScrollPixelsPerTick) % 32;

  for (let y = -32 + curbOffset; y < canvasHeight; y += 32) {
    context.fillStyle = "#ff5722";
    context.fillRect(roadLeft - 8, y, 8, 16);
    context.fillRect(roadLeft + roadWidth, y, 8, 16);

    context.fillStyle = "#f4e4cd";
    context.fillRect(roadLeft - 8, y + 16, 8, 16);
    context.fillRect(roadLeft + roadWidth, y + 16, 8, 16);
  }

  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.fillRect(roadLeft - 10, 0, 2, canvasHeight);
  context.fillRect(roadLeft + roadWidth + 8, 0, 2, canvasHeight);

  const difficultyLevel = getDeliveryRushDifficultyLevel(currentTick);
  const rushHourActive = difficultyLevel === "rush-hour";

  context.strokeStyle = rushHourActive
    ? "rgba(226, 160, 255, 0.82)"
    : "rgba(255, 246, 228, 0.72)";

  context.lineWidth = 3.2;

  context.shadowColor = rushHourActive
    ? "rgba(214, 108, 255, 0.75)"
    : "rgba(255, 126, 54, 0.24)";

  context.shadowBlur = rushHourActive ? 9 : 4;
  context.setLineDash([27, 20]);
  context.lineDashOffset = -((currentTick * roadScrollPixelsPerTick) % 47);

  for (let lane = 1; lane < deliveryRushGameRules.laneCount; lane++) {
    const laneX = roadLeft + laneWidth * lane;

    context.beginPath();
    context.moveTo(laneX, 0);
    context.lineTo(laneX, canvasHeight);
    context.stroke();
  }

  context.setLineDash([]);
  context.shadowBlur = 0;

  context.fillStyle = "rgba(255, 115, 40, 0.24)";
  context.fillRect(roadLeft + 2, 0, 2, canvasHeight);
  context.fillRect(roadLeft + roadWidth - 4, 0, 2, canvasHeight);
}

function drawRoadReflections(
  context: CanvasRenderingContext2D,
  currentTick: number,
): void {
  const scrollDistance = currentTick * roadScrollPixelsPerTick;
  const reflectionCycleHeight = canvasHeight + 160;

  const rushHourActive =
    getDeliveryRushDifficultyLevel(currentTick) === "rush-hour";

  const reflectionColors = [
    "rgba(255, 82, 24, 0.1)",
    "rgba(255, 177, 61, 0.065)",
    "rgba(79, 225, 130, 0.055)",
    rushHourActive ? "rgba(211, 106, 255, 0.09)" : "rgba(255, 112, 44, 0.05)",
  ] as const;

  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < 6; index++) {
    const x = roadLeft + 34 + ((index * 107) % (roadWidth - 68));

    const y = ((index * 118 + scrollDistance) % reflectionCycleHeight) - 80;

    const width = 9 + (index % 2) * 5;
    const height = 76 + (index % 3) * 14;
    const color = reflectionColors[index % reflectionColors.length];

    const gradient = context.createLinearGradient(x, y, x, y + height);

    gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(0.28, color);
    gradient.addColorStop(0.64, color);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.fillStyle = gradient;
    context.shadowColor = color;
    context.shadowBlur = 3;
    context.fillRect(x, y, width, height);
  }

  context.restore();
}

function drawAsphaltDetails(
  context: CanvasRenderingContext2D,
  currentTick: number,
): void {
  const scrollDistance = currentTick * roadScrollPixelsPerTick;
  const detailCycleHeight = canvasHeight + 40;

  for (let index = 0; index < 12; index++) {
    const x = roadLeft + 18 + ((index * 97) % (roadWidth - 36));
    const y = ((index * 71 + scrollDistance) % detailCycleHeight) - 20;
    const size = index % 4 === 0 ? 2 : 1;

    context.fillStyle =
      index % 2 === 0 ? "rgba(231, 239, 234, 0.07)" : "rgba(0, 0, 0, 0.22)";

    context.fillRect(x, y, size, size * 2);
  }

  const patchCycleHeight = canvasHeight + 100;

  for (let index = 0; index < 3; index++) {
    const width = 34 + (index % 2) * 18;
    const height = 15 + (index % 3) * 3;
    const x = roadLeft + 42 + ((index * 137) % (roadWidth - 110));

    const y = ((index * 173 + scrollDistance) % patchCycleHeight) - 50;

    context.fillStyle = "rgba(8, 11, 13, 0.2)";
    context.fillRect(x, y, width, height);

    context.strokeStyle = "rgba(151, 163, 166, 0.08)";
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    context.strokeStyle = "rgba(5, 7, 8, 0.38)";
    context.beginPath();
    context.moveTo(x + width * 0.2, y + height);
    context.lineTo(x + width * 0.38, y + height + 8);
    context.lineTo(x + width * 0.3, y + height + 15);
    context.stroke();
  }
}

function drawPlayerHeadlights(
  context: CanvasRenderingContext2D,
  playerX: number,
  renderedPlayerY: number,
  playerWidth: number,
  steeringAmount: number,
): void {
  const beamStartY = renderedPlayerY + 5;
  const beamEndY = Math.max(28, renderedPlayerY - 230);

  const playerCenterX = playerX + playerWidth / 2;
  const lightOffset = playerWidth * 0.27;
  const steeringShift = steeringAmount * 34;

  const beamOutwardOffset = 19;
  const beamHalfWidth = 24;

  context.save();
  context.globalCompositeOperation = "screen";

  for (const direction of [-1, 1] as const) {
    const lightX = playerCenterX + direction * lightOffset;

    const beamEndCenterX =
      lightX + direction * beamOutwardOffset + steeringShift;

    const beamGradient = context.createLinearGradient(
      0,
      beamStartY,
      0,
      beamEndY,
    );

    beamGradient.addColorStop(0, "rgba(255, 241, 175, 0.18)");

    beamGradient.addColorStop(0.55, "rgba(255, 224, 145, 0.06)");

    beamGradient.addColorStop(1, "rgba(255, 224, 145, 0)");

    context.fillStyle = beamGradient;
    context.beginPath();

    context.moveTo(lightX - 5, beamStartY);

    context.lineTo(beamEndCenterX - beamHalfWidth, beamEndY);

    context.lineTo(beamEndCenterX + beamHalfWidth, beamEndY);

    context.lineTo(lightX + 5, beamStartY);

    context.closePath();
    context.fill();

    // Small glow at the source of each headlight
    const sourceGlow = context.createRadialGradient(
      lightX,
      beamStartY,
      0,
      lightX,
      beamStartY,
      10,
    );

    sourceGlow.addColorStop(0, "rgba(255, 247, 195, 0.42)");

    sourceGlow.addColorStop(1, "rgba(255, 225, 145, 0)");

    context.fillStyle = sourceGlow;
    context.beginPath();

    context.ellipse(lightX, beamStartY, 10, 6, 0, 0, Math.PI * 2);

    context.fill();
  }

  context.restore();
}

function drawSpeedLines(
  context: CanvasRenderingContext2D,
  currentTick: number,
): void {
  const intensity = getDifficultyVisualIntensity(currentTick);

  if (intensity <= 0.12) {
    return;
  }

  const speed = 7 + intensity * 10;
  const lineLength = 8 + intensity * 28;

  context.save();
  context.strokeStyle = `rgba(255, 255, 255, ${0.025 + intensity * 0.09})`;
  context.lineWidth = 1 + intensity;

  for (let index = 0; index < 18; index++) {
    const x = roadLeft + 14 + ((index * 83) % (roadWidth - 28));
    const y = ((index * 61 + currentTick * speed) % (canvasHeight + 60)) - 30;

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x, y + lineLength);
    context.stroke();
  }

  context.restore();
}

function drawDifficultyVignette(
  context: CanvasRenderingContext2D,
  currentTick: number,
): void {
  const intensity = getDifficultyVisualIntensity(currentTick);

  if (intensity < 0.55) {
    return;
  }

  const rushHourActive =
    getDeliveryRushDifficultyLevel(currentTick) === "rush-hour";

  const vignette = context.createRadialGradient(
    canvasWidth / 2,
    canvasHeight / 2,
    canvasWidth * 0.22,
    canvasWidth / 2,
    canvasHeight / 2,
    canvasWidth * 0.66,
  );

  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(
    1,
    rushHourActive
      ? `rgba(156, 48, 195, ${0.08 + intensity * 0.06})`
      : `rgba(255, 67, 28, ${0.045 + intensity * 0.045})`,
  );

  context.fillStyle = vignette;
  context.fillRect(0, 0, canvasWidth, canvasHeight);
}

function drawDifficultyTransitionBanner(
  context: CanvasRenderingContext2D,
  currentTick: number,
): void {
  const difficultyLevel = getDeliveryRushDifficultyLevel(currentTick);

  const transitionStartTick = difficultyTransitionStartTicks[difficultyLevel];

  if (transitionStartTick === undefined) {
    return;
  }

  const elapsedTicks = currentTick - transitionStartTick;

  if (elapsedTicks < 0 || elapsedTicks >= difficultyBannerDurationTicks) {
    return;
  }

  const progress = elapsedTicks / difficultyBannerDurationTicks;

  const enterProgress = clamp(progress / 0.2, 0, 1);

  const exitProgress = clamp((1 - progress) / 0.28, 0, 1);

  const opacity = Math.min(enterProgress, exitProgress);

  const scale = 0.9 + enterProgress * 0.1;

  const color = getDifficultyBannerColor(difficultyLevel);

  const label =
    difficultyLevel === "rush-hour"
      ? "RUSH HOUR"
      : difficultyLabels[difficultyLevel].toUpperCase();

  context.save();

  context.translate(canvasWidth / 2, 72 - (1 - enterProgress) * 8);

  context.scale(scale, scale);
  context.globalAlpha = opacity;
  context.shadowColor = color;

  context.shadowBlur = difficultyLevel === "rush-hour" ? 22 : 14;

  const bannerGradient = context.createLinearGradient(-138, 0, 138, 0);

  bannerGradient.addColorStop(0, "rgba(5, 9, 8, 0.15)");

  bannerGradient.addColorStop(0.5, "rgba(9, 12, 11, 0.9)");

  bannerGradient.addColorStop(1, "rgba(5, 9, 8, 0.15)");

  context.fillStyle = bannerGradient;

  context.fillRect(-138, -29, 276, 58);

  context.strokeStyle = color;
  context.lineWidth = 1.5;

  context.beginPath();

  context.moveTo(-118, -28);
  context.lineTo(118, -28);

  context.moveTo(-118, 28);
  context.lineTo(118, 28);

  context.stroke();

  context.shadowBlur = 10;
  context.fillStyle = color;
  context.font = "900 22px system-ui, sans-serif";

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillText(label, 0, -4);

  context.shadowBlur = 0;

  context.fillStyle = "rgba(255, 244, 225, 0.78)";

  context.font = "800 9px system-ui, sans-serif";

  context.fillText("BRZINA RASTE", 0, 17);

  context.restore();
}

function getDifficultyBannerColor(
  difficultyLevel: DeliveryRushDifficultyLevel,
): string {
  switch (difficultyLevel) {
    case "easy":
      return "#62dc78";

    case "medium":
      return "#f5ce55";

    case "hard":
      return "#ff984f";

    case "very-hard":
      return "#ff7444";

    case "extreme":
      return "#ff6262";

    case "rush-hour":
      return "#dc82ff";
  }
}

function getDifficultyVisualIntensity(currentTick: number): number {
  const difficultyLevel = getDeliveryRushDifficultyLevel(currentTick);

  switch (difficultyLevel) {
    case "easy":
      return 0;

    case "medium":
      return 0.2;

    case "hard":
      return 0.4;

    case "very-hard":
      return 0.6;

    case "extreme":
      return 0.8;

    case "rush-hour":
      return 1;
  }
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
  for (
    let obstacleIndex = obstacles.length - 1;
    obstacleIndex >= 0;
    obstacleIndex--
  ) {
    const obstacle = obstacles[obstacleIndex];

    const firstVisibleTick = obstacle.tick - obstacleApproachTicks;

    const collisionWindowStartTick =
      obstacle.tick - deliveryRushGameRules.collisionWindowBeforeTicks;

    const lastVisibleTick =
      obstacle.tick + deliveryRushGameRules.collisionWindowAfterTicks;

    if (currentTick < firstVisibleTick || currentTick > lastVisibleTick) {
      continue;
    }

    const ticksBeforeFirstContact = collisionWindowStartTick - firstVisibleTick;

    const dimensions = getObstacleDimensions(obstacle.type, laneWidth);

    const travelProgress =
      (currentTick - firstVisibleTick) / ticksBeforeFirstContact;

    const perspectiveProgress = clamp(travelProgress, 0, 1);

    const obstacleScale = 0.58 + perspectiveProgress * 0.42;

    const obstacleBottomY =
      obstacleEntryBottomY + travelProgress * (playerY - obstacleEntryBottomY);

    for (let lane = 0; lane < deliveryRushGameRules.laneCount; lane++) {
      if (!isLaneBlocked(obstacle.blockedLaneMask, lane)) {
        continue;
      }

      const obstacleCenterX = roadLeft + lane * laneWidth + laneWidth / 2;

      const variant = Math.abs(obstacle.tick + lane * 17) % 3;

      context.save();

      context.translate(obstacleCenterX, obstacleBottomY);

      context.scale(obstacleScale, obstacleScale);

      drawObstacle(
        context,
        -dimensions.width / 2,
        -dimensions.height,
        dimensions.width,
        dimensions.height,
        obstacle.type,
        variant,
      );

      context.restore();
    }
  }
}
function getObstacleDimensions(
  type: DeliveryRushObstacle["type"],
  laneWidth: number,
): { width: number; height: number } {
  switch (type) {
    case "car":
      return {
        width: laneWidth * 0.42,
        height: 82,
      };

    case "pothole":
      return {
        width: laneWidth * 0.5,
        height: 20,
      };

    case "barrier":
      return {
        width: laneWidth * 0.58,
        height: 34,
      };
  }
}

function drawObstacle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  type: DeliveryRushObstacle["type"],
  variant: number,
): void {
  if (type === "car") {
    drawTrafficCar(context, x, y, width, height, variant);
    return;
  }

  if (type === "pothole") {
    drawPothole(context, x, y, width, height, variant);
    return;
  }

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

function drawTrafficCar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  variant: number,
): void {
  const carVariant = variant % 3;

  const bodyColors = ["#376fae", "#c53f39", "#e0ad2d"] as const;

  const glowColors = [
    "rgba(75, 158, 255, 0.42)",
    "rgba(255, 72, 54, 0.4)",
    "rgba(255, 193, 59, 0.42)",
  ] as const;

  const bodyColor = bodyColors[carVariant];

  context.fillStyle = "rgba(0, 0, 0, 0.42)";

  context.beginPath();

  context.ellipse(
    x + width / 2,
    y + height + 5,
    width * 0.52,
    8,
    0,
    0,
    Math.PI * 2,
  );

  context.fill();

  context.fillStyle = "#0e1113";

  context.fillRect(x - 4, y + 14, 6, 20);

  context.fillRect(x + width - 2, y + 14, 6, 20);

  context.fillRect(x - 4, y + height - 34, 6, 19);

  context.fillRect(x + width - 2, y + height - 34, 6, 19);

  context.fillStyle = "#15191b";

  context.fillRect(x - 3, y + height * 0.3, 5, 9);

  context.fillRect(x + width - 2, y + height * 0.3, 5, 9);

  context.shadowColor = glowColors[carVariant];

  context.shadowBlur = 11;

  fillCapsule(context, x, y, width, height, bodyColor);

  context.shadowBlur = 0;

  context.fillStyle = "rgba(255, 255, 255, 0.16)";

  context.fillRect(x + width * 0.48, y + 4, width * 0.07, height - 8);

  if (carVariant === 0) {
    context.fillStyle = "rgba(215, 231, 241, 0.32)";

    context.fillRect(x + 7, y + height * 0.48, width - 14, 2);
  } else if (carVariant === 1) {
    context.fillStyle = "rgba(31, 24, 25, 0.72)";

    context.fillRect(x + width * 0.39, y + 4, width * 0.08, height - 8);

    context.fillRect(x + width * 0.54, y + 4, width * 0.08, height - 8);

    context.fillStyle = "#282b2d";

    context.fillRect(x + 5, y + 2, width - 10, 4);
  } else {
    const checkSize = Math.max(3, width * 0.075);

    for (let index = 0; index < 6; index++) {
      context.fillStyle = index % 2 === 0 ? "#1b1d1f" : "#f5e4bd";

      context.fillRect(
        x + width * 0.13 + index * checkSize,
        y + height * 0.53,
        checkSize,
        4,
      );
    }
  }

  fillCapsule(
    context,
    x + width * 0.17,
    y + 13,
    width * 0.66,
    22,
    carVariant === 2 ? "#26322f" : "#132129",
  );

  context.fillStyle = "rgba(135, 211, 235, 0.58)";

  context.fillRect(x + width * 0.24, y + 18, width * 0.52, 5);

  fillCapsule(
    context,
    x + width * 0.22,
    y + height - 28,
    width * 0.56,
    15,
    "#19262c",
  );

  context.fillStyle = "rgba(167, 220, 228, 0.42)";

  context.fillRect(x + width * 0.29, y + height - 23, width * 0.42, 3);

  if (carVariant === 2) {
    context.shadowColor = "rgba(255, 205, 62, 0.75)";

    context.shadowBlur = 5;
    context.fillStyle = "#ffd34d";

    context.fillRect(x + width * 0.32, y + height * 0.43, width * 0.36, 8);

    context.shadowBlur = 0;
    context.fillStyle = "#181b1c";

    context.font = "900 6px system-ui, sans-serif";

    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillText("TAXI", x + width / 2, y + height * 0.43 + 4);
  }

  context.shadowColor = "rgba(255, 244, 177, 0.9)";

  context.shadowBlur = 10;
  context.fillStyle = "#fff2aa";

  context.fillRect(x + 7, y + height - 9, 10, 5);

  context.fillRect(x + width - 17, y + height - 9, 10, 5);

  context.shadowBlur = 0;
  context.fillStyle = "#ff473e";

  context.fillRect(x + 7, y + 5, 9, 4);

  context.fillRect(x + width - 16, y + 5, 9, 4);

  context.fillStyle = "rgba(235, 238, 231, 0.82)";

  context.fillRect(x + width * 0.38, y + height - 5, width * 0.24, 3);
}

function drawPothole(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  variant: number,
): void {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const pointCount = 14;

  context.save();
  context.translate(centerX, centerY);

  context.fillStyle = "rgba(0, 0, 0, 0.38)";

  context.beginPath();

  context.ellipse(2, 5, width * 0.55, height * 0.66, 0, 0, Math.PI * 2);

  context.fill();
  context.beginPath();

  for (let index = 0; index < pointCount; index++) {
    const angle = (index / pointCount) * Math.PI * 2;

    const irregularity = 0.8 + ((index * 7 + variant * 5) % 6) * 0.04;

    const pointX = Math.cos(angle) * width * 0.5 * irregularity;

    const pointY = Math.sin(angle) * height * 0.54 * irregularity;

    if (index === 0) {
      context.moveTo(pointX, pointY);
    } else {
      context.lineTo(pointX, pointY);
    }
  }

  context.closePath();

  context.fillStyle = "#2b2e2f";
  context.fill();

  context.strokeStyle = "rgba(143, 132, 112, 0.68)";

  context.lineWidth = 1.8;
  context.stroke();

  const depthGradient = context.createRadialGradient(
    -width * 0.08,
    -height * 0.12,
    1,
    0,
    1,
    width * 0.42,
  );

  depthGradient.addColorStop(0, "#010203");

  depthGradient.addColorStop(0.58, "#07090a");

  depthGradient.addColorStop(1, "#1a1d1e");

  context.fillStyle = depthGradient;
  context.beginPath();

  context.ellipse(0, 1, width * 0.38, height * 0.35, 0, 0, Math.PI * 2);

  context.fill();

  context.strokeStyle = "rgba(6, 8, 9, 0.92)";

  context.lineWidth = 1.7;

  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2 + variant * 0.31;

    const innerX = Math.cos(angle) * width * 0.34;

    const innerY = Math.sin(angle) * height * 0.31;

    const middleX = Math.cos(angle + 0.09) * width * 0.48;

    const middleY = Math.sin(angle + 0.09) * height * 0.55;

    const outerX = Math.cos(angle - 0.07) * width * 0.63;

    const outerY = Math.sin(angle - 0.07) * height * 0.8;

    context.beginPath();

    context.moveTo(innerX, innerY);

    context.lineTo(middleX, middleY);

    context.lineTo(outerX, outerY);

    context.stroke();
  }

  context.strokeStyle =
    variant % 2 === 0
      ? "rgba(131, 202, 207, 0.24)"
      : "rgba(255, 177, 86, 0.16)";

  context.lineWidth = 1.2;
  context.beginPath();

  context.moveTo(-width * 0.2, -1);

  context.quadraticCurveTo(0, -height * 0.12, width * 0.22, -2);

  context.stroke();

  for (let index = 0; index < 5; index++) {
    const angle = (index / 5) * Math.PI * 2 + variant * 0.47;

    const rubbleX = Math.cos(angle) * width * (0.42 + (index % 2) * 0.08);

    const rubbleY = Math.sin(angle) * height * (0.44 + (index % 3) * 0.08);

    context.fillStyle = index % 2 === 0 ? "#4a4842" : "#242728";

    context.beginPath();

    context.ellipse(
      rubbleX,
      rubbleY,
      2 + (index % 2),
      1.2,
      angle,
      0,
      Math.PI * 2,
    );

    context.fill();
  }

  context.restore();
}

function drawBarrier(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.save();

  context.fillStyle = "#121516";
  context.fillRect(x + 7, y + height - 10, 8, 11);
  context.fillRect(x + width - 15, y + height - 10, 8, 11);

  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.fillRect(x - 4, y + 6, width + 8, height - 13);

  context.fillStyle = "#3a1c14";
  context.fillRect(x - 2, y + 3, width + 4, height - 14);

  const segmentWidth = width / 6;

  for (let index = 0; index < 6; index++) {
    context.fillStyle = index % 2 === 0 ? "#ff5a1f" : "#f7ead3";

    context.fillRect(
      x + index * segmentWidth,
      y + 5,
      segmentWidth + 1,
      height - 18,
    );

    context.fillStyle = "rgba(255, 255, 255, 0.12)";

    context.fillRect(x + index * segmentWidth + 2, y + 6, 2, height - 20);
  }

  context.strokeStyle = "rgba(44, 22, 17, 0.9)";
  context.lineWidth = 2;

  context.strokeRect(x, y + 5, width, height - 18);

  context.fillStyle = "#ffb15f";
  context.fillRect(x + 3, y + 3, width - 6, 3);

  for (const lightX of [x + width * 0.2, x + width * 0.8]) {
    context.shadowColor = "rgba(255, 152, 46, 0.9)";
    context.shadowBlur = 8;
    context.fillStyle = "#ff9f32";

    context.beginPath();
    context.ellipse(lightX, y + 1, 4, 4, 0, 0, Math.PI * 2);
    context.fill();

    context.shadowBlur = 0;
    context.fillStyle = "#4a2516";

    context.fillRect(lightX - 1.5, y + 4, 3, 4);
  }

  context.fillStyle = "#24130f";

  for (const boltX of [x + 6, x + width - 6]) {
    context.beginPath();

    context.ellipse(boltX, y + height * 0.45, 1.7, 1.7, 0, 0, Math.PI * 2);

    context.fill();
  }

  context.restore();
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

    const coneCenterX = coneX + coneWidth / 2;

    context.fillStyle = "rgba(0, 0, 0, 0.34)";

    context.beginPath();

    context.ellipse(
      coneCenterX,
      y + height,
      coneWidth * 0.72,
      3.5,
      0,
      0,
      Math.PI * 2,
    );

    context.fill();

    const coneGradient = context.createLinearGradient(
      coneX,
      0,
      coneX + coneWidth,
      0,
    );

    coneGradient.addColorStop(0, "#c63d10");

    coneGradient.addColorStop(0.5, "#ff7a27");

    coneGradient.addColorStop(1, "#d74714");

    context.fillStyle = coneGradient;
    context.beginPath();

    context.moveTo(coneCenterX, y);

    context.lineTo(coneX + coneWidth, y + height - 7);

    context.lineTo(coneX, y + height - 7);

    context.closePath();
    context.fill();

    context.fillStyle = "rgba(255, 190, 103, 0.62)";

    context.beginPath();

    context.moveTo(coneCenterX, y + 3);

    context.lineTo(coneCenterX + 2, y + height - 9);

    context.lineTo(coneCenterX - 1, y + height - 9);

    context.closePath();
    context.fill();

    context.fillStyle = "#fff0d5";

    context.fillRect(
      coneX + coneWidth * 0.23,
      y + height * 0.48,
      coneWidth * 0.54,
      5,
    );

    context.fillStyle = "#202426";

    context.fillRect(coneX - 3, y + height - 7, coneWidth + 6, 7);

    context.fillStyle = "rgba(255, 255, 255, 0.2)";

    context.fillRect(coneX - 1, y + height - 6, coneWidth + 2, 1.5);
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

    const woodGradient = context.createLinearGradient(
      crateX,
      y,
      crateX + crateWidth,
      y + height,
    );

    woodGradient.addColorStop(0, "#e58a43");

    woodGradient.addColorStop(0.52, "#bb5c29");

    woodGradient.addColorStop(1, "#7c371d");

    context.fillStyle = "#3a2016";

    context.fillRect(crateX - 3, y + 2, crateWidth + 6, height);

    context.fillStyle = woodGradient;

    context.fillRect(crateX, y, crateWidth, height - 3);

    context.strokeStyle = "rgba(76, 34, 20, 0.82)";

    context.lineWidth = 3;
    context.beginPath();

    context.moveTo(crateX + 4, y + 4);

    context.lineTo(crateX + crateWidth - 4, y + height - 7);

    context.moveTo(crateX + crateWidth - 4, y + 4);

    context.lineTo(crateX + 4, y + height - 7);

    context.stroke();

    context.strokeStyle = "rgba(255, 177, 104, 0.5)";

    context.lineWidth = 1.2;

    context.strokeRect(crateX + 2, y + 2, crateWidth - 4, height - 7);

    context.fillStyle = "#2c1710";

    for (const cornerX of [crateX + 2, crateX + crateWidth - 5]) {
      context.fillRect(cornerX, y + 2, 3, 3);

      context.fillRect(cornerX, y + height - 8, 3, 3);
    }

    if (index === 0) {
      context.fillStyle = "rgba(255, 239, 207, 0.82)";

      context.font = "900 7px system-ui, sans-serif";

      context.textAlign = "center";
      context.textBaseline = "middle";

      context.fillText("B+C", crateX + crateWidth / 2, y + height / 2);
    }
  }
}

function drawBeefAndChickenLogo(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
): void {
  context.save();

  context.beginPath();
  context.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  context.clip();

  if (
    deliveryRushLogoImage?.complete &&
    deliveryRushLogoImage.naturalWidth > 0
  ) {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(
      deliveryRushLogoImage,
      centerX - size / 2,
      centerY - size / 2,
      size,
      size,
    );
  } else {
    context.fillStyle = "#07150d";
    context.fillRect(centerX - size / 2, centerY - size / 2, size, size);

    context.fillStyle = "#fff7e8";
    context.font = `900 ${Math.max(5, size * 0.24)}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("B+C", centerX, centerY);
  }

  context.restore();

  context.save();
  context.strokeStyle = "#ff7a28";
  context.lineWidth = Math.max(1, size * 0.06);
  context.shadowColor = "rgba(255, 105, 31, 0.75)";
  context.shadowBlur = 5;

  context.beginPath();
  context.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  context.stroke();

  context.restore();
}

function drawDeliveryCar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  collisionActive: boolean,
): void {
  context.save();

  const centerX = x + width / 2;
  const bodyColor = collisionActive ? "#ff3328" : "#f4511e";

  context.shadowColor = collisionActive
    ? "rgba(255, 55, 40, 0.95)"
    : "rgba(255, 91, 31, 0.52)";

  context.shadowBlur = collisionActive ? 22 : 11;

  // Wheels
  context.fillStyle = "#090c0c";

  context.fillRect(x - 5, y + 13, 7, 20);
  context.fillRect(x + width - 2, y + 13, 7, 20);
  context.fillRect(x - 5, y + height - 31, 7, 19);
  context.fillRect(x + width - 2, y + height - 31, 7, 19);

  // Wheel rims
  context.fillStyle = "#59615e";

  context.fillRect(x - 3, y + 18, 3, 10);
  context.fillRect(x + width, y + 18, 3, 10);
  context.fillRect(x - 3, y + height - 27, 3, 10);
  context.fillRect(x + width, y + height - 27, 3, 10);

  // Main body
  fillCapsule(context, x, y, width, height, bodyColor);
  context.shadowBlur = 0;

  // Side panels
  context.fillStyle = "#ff9b42";

  context.fillRect(x + width * 0.09, y + 11, width * 0.1, height - 22);
  context.fillRect(x + width * 0.81, y + 11, width * 0.1, height - 22);

  context.fillStyle = "rgba(255, 217, 129, 0.58)";

  context.fillRect(x + width * 0.135, y + 14, 2, height - 28);
  context.fillRect(x + width * 0.845, y + 14, 2, height - 28);

  // Central body shading
  const bodyHighlight = context.createLinearGradient(x, 0, x + width, 0);

  bodyHighlight.addColorStop(0, "rgba(0, 0, 0, 0.18)");
  bodyHighlight.addColorStop(0.35, "rgba(255, 255, 255, 0.08)");
  bodyHighlight.addColorStop(0.5, "rgba(255, 255, 255, 0.22)");
  bodyHighlight.addColorStop(0.68, "rgba(255, 255, 255, 0.06)");
  bodyHighlight.addColorStop(1, "rgba(0, 0, 0, 0.2)");

  context.fillStyle = bodyHighlight;
  context.fillRect(x + width * 0.2, y + 7, width * 0.6, height - 14);

  // Front windshield
  fillCapsule(context, x + width * 0.19, y + 13, width * 0.62, 19, "#09251a");

  context.fillStyle = "rgba(138, 224, 197, 0.5)";
  context.fillRect(x + width * 0.26, y + 17, width * 0.48, 4);

  context.fillStyle = "rgba(255, 255, 255, 0.2)";
  context.fillRect(x + width * 0.47, y + 15, width * 0.06, 13);

  // Rear window
  fillCapsule(
    context,
    x + width * 0.22,
    y + height - 25,
    width * 0.56,
    14,
    "#0b2118",
  );

  context.fillStyle = "rgba(130, 211, 187, 0.35)";
  context.fillRect(x + width * 0.3, y + height - 21, width * 0.4, 3);

  // Branded roof panel
  context.shadowColor = "rgba(255, 119, 38, 0.65)";
  context.shadowBlur = 7;
  context.fillStyle = "#071b11";

  context.beginPath();
  context.ellipse(
    centerX,
    y + height * 0.54,
    width * 0.24,
    width * 0.24,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.shadowBlur = 0;

  drawBeefAndChickenLogo(
    context,
    centerX,
    y + height * 0.54,
    Math.min(width * 0.42, 26),
  );

  // Front flame detail
  context.fillStyle = "#ffd133";
  context.shadowColor = "rgba(255, 202, 44, 0.85)";
  context.shadowBlur = 5;

  context.beginPath();
  context.moveTo(centerX, y + 3);
  context.bezierCurveTo(
    centerX - width * 0.08,
    y + 7,
    centerX - width * 0.04,
    y + 11,
    centerX,
    y + 12,
  );
  context.bezierCurveTo(
    centerX + width * 0.08,
    y + 9,
    centerX + width * 0.06,
    y + 6,
    centerX,
    y + 3,
  );
  context.fill();

  context.shadowBlur = 0;

  // Headlights
  context.fillStyle = "#fff0a7";
  context.shadowColor = "rgba(255, 239, 164, 0.9)";
  context.shadowBlur = 8;

  context.fillRect(x + 7, y + 4, 10, 5);
  context.fillRect(x + width - 17, y + 4, 10, 5);

  context.shadowBlur = 0;

  // Rear lights
  context.fillStyle = "#ff302b";

  context.fillRect(x + 7, y + height - 9, 10, 5);
  context.fillRect(x + width - 17, y + height - 9, 10, 5);

  // Bumpers
  context.fillStyle = "#17201c";

  context.fillRect(x + 5, y, width - 10, 3);
  context.fillRect(x + 6, y + height - 3, width - 12, 3);

  context.fillStyle = "rgba(245, 239, 220, 0.82)";
  context.fillRect(x + width * 0.37, y + height - 4, width * 0.26, 2.5);

  context.restore();
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
  intensity: number,
): void {
  const pulse =
    (0.08 + Math.abs(Math.sin(currentTick * 1.8)) * 0.1) * intensity;

  context.fillStyle = `rgba(255, 45, 35, ${pulse})`;

  context.fillRect(0, 0, canvasWidth, canvasHeight);

  context.fillStyle = `rgba(255, 66, 45, ${0.68 * intensity})`;

  context.fillRect(0, 0, canvasWidth, 6);

  context.fillRect(0, canvasHeight - 6, canvasWidth, 6);

  context.fillRect(0, 0, 6, canvasHeight);

  context.fillRect(canvasWidth - 6, 0, 6, canvasHeight);
}

function drawObstaclePassFeedback(
  context: CanvasRenderingContext2D,
  centerX: number,
  startY: number,
  progress: number,
  combo: number,
): void {
  const opacity = Math.pow(1 - progress, 1.35);

  const riseOffset = progress * 34;

  const popScale =
    0.86 + Math.sin(Math.min(progress * 1.6, 1) * Math.PI) * 0.16;

  context.save();

  context.translate(centerX, startY - riseOffset);

  context.scale(popScale, popScale);

  context.globalAlpha = opacity;
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.shadowColor = "rgba(255, 95, 31, 0.8)";

  context.shadowBlur = 10 * opacity;

  context.fillStyle = "#ff9b4a";
  context.font = "900 20px system-ui, sans-serif";

  context.fillText(`+${deliveryRushGameRules.avoidedObstaclePoints}`, 0, 0);

  if (combo > 1) {
    context.shadowBlur = 5 * opacity;

    context.fillStyle = "#fff0cf";
    context.font = "900 10px system-ui, sans-serif";

    context.fillText(`COMBO x${combo}`, 0, 16);
  }

  context.restore();
}

function drawCollisionSparks(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  intensity: number,
): void {
  const progress = 1 - intensity;

  context.save();

  context.globalCompositeOperation = "screen";
  context.lineCap = "round";

  for (let index = 0; index < 12; index++) {
    const normalizedIndex = index / 11;

    const angle = Math.PI * (0.12 + normalizedIndex * 0.76);

    const direction = index % 2 === 0 ? -1 : 1;

    const distance = 8 + progress * (24 + (index % 4) * 7);

    const sparkX = centerX + Math.cos(angle) * distance * direction;

    const sparkY = centerY - Math.sin(angle) * distance;

    const tailLength = 5 + intensity * (5 + (index % 3) * 2);

    const opacity = intensity * (0.55 + (index % 3) * 0.15);

    context.strokeStyle = `rgba(255, ${
      145 + (index % 3) * 35
    }, 55, ${opacity})`;

    context.lineWidth = index % 4 === 0 ? 2.4 : 1.4;

    context.shadowColor = "rgba(255, 103, 31, 0.8)";

    context.shadowBlur = 5 * intensity;

    context.beginPath();

    context.moveTo(sparkX, sparkY);

    context.lineTo(
      sparkX - Math.cos(angle) * tailLength * direction,
      sparkY + Math.sin(angle) * tailLength,
    );

    context.stroke();
  }

  context.restore();
}

function shouldShowSwipeHint(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  if (navigator.maxTouchPoints > 0) {
    return true;
  }

  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
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

  if (shouldShowSwipeHint()) {
    context.shadowBlur = 0;
    context.fillStyle = "rgba(255, 255, 255, 0.72)";
    context.font = "800 11px system-ui, sans-serif";

    context.fillText(
      "← PREVUCI ZA PROMENU TRAKE →",
      canvasWidth / 2,
      canvasHeight / 2 + 122,
    );

    context.fillStyle = "rgba(255, 174, 82, 0.82)";

    context.fillText(
      "PREVUCI NAGORE ZA SKOK ↑",
      canvasWidth / 2,
      canvasHeight / 2 + 142,
    );
  }

  context.shadowBlur = 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
