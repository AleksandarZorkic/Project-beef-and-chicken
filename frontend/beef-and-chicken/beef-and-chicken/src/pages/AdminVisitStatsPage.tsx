import { useEffect, useMemo, useState } from "react";
import { getVisitStats, type VisitStatsDto } from "../api/visitStatsApi";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AdminVisitStatsPage.scss";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatFullDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getPercentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export default function AdminVisitStatsPage() {
  const [stats, setStats] = useState<VisitStatsDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function loadStats(showInitialLoading = true) {
    try {
      setError(null);

      if (showInitialLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const data = await getVisitStats();

      setStats(data);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const analytics = useMemo(() => {
    if (!stats) {
      return {
        maxDailyVisits: 0,
        registeredShare: 0,
        anonymousShare: 0,
        averageVisitsPerDay: 0,
        bestDay: null as VisitStatsDto["dailyVisits"][number] | null,
      };
    }

    const maxDailyVisits = Math.max(
      0,
      ...stats.dailyVisits.map((day) => day.visits),
    );

    const totalAudienceVisits =
      stats.customerVisitsLast7Days + stats.anonymousVisitsLast7Days;

    const registeredShare = getPercentage(
      stats.customerVisitsLast7Days,
      totalAudienceVisits,
    );

    const anonymousShare = getPercentage(
      stats.anonymousVisitsLast7Days,
      totalAudienceVisits,
    );

    const averageVisitsPerDay =
      stats.dailyVisits.length > 0
        ? Math.round(
            stats.dailyVisits.reduce((sum, day) => sum + day.visits, 0) /
              stats.dailyVisits.length,
          )
        : 0;

    const bestDay =
      stats.dailyVisits.length > 0
        ? stats.dailyVisits.reduce((best, current) =>
            current.visits > best.visits ? current : best,
          )
        : null;

    return {
      maxDailyVisits,
      registeredShare,
      anonymousShare,
      averageVisitsPerDay,
      bestDay,
    };
  }, [stats]);

  return (
    <main className="admin-visit-stats-page">
      <section className="admin-visit-stats-hero">
        <div className="admin-visit-stats-hero__content">
          <span className="admin-visit-stats-hero__eyebrow">
            BEEF N&apos; CHICKEN • ANALYTICS
          </span>

          <h1 className="admin-visit-stats-hero__title">Statistika poseta</h1>

          <p className="admin-visit-stats-hero__description">
            Pratite interesovanje korisnika, broj jedinstvenih posetilaca i
            stranice koje privlače najviše pažnje.
          </p>

          <div className="admin-visit-stats-hero__meta">
            <span className="admin-visit-stats-hero__status">
              <span aria-hidden="true" />
              Analitika aktivna
            </span>

            <span className="admin-visit-stats-hero__note">
              Admin, zaposleni i kuriri nisu uključeni
            </span>
          </div>
        </div>

        <aside className="admin-visit-stats-summary">
          <header className="admin-visit-stats-summary__header">
            <span
              className="admin-visit-stats-summary__icon"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 19V10m5 9V5m6 14v-7m5 7V8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="admin-visit-stats-summary__period">
              POSLEDNJIH 7 DANA
            </span>
          </header>

          <div className="admin-visit-stats-summary__value">
            <strong>
              {loading ? "—" : (stats?.totalVisitsLast7Days ?? 0)}
            </strong>

            <span>ukupnih poseta</span>
          </div>

          <footer className="admin-visit-stats-summary__footer">
            <div>
              <span>Prosek po danu</span>
              <strong>{loading ? "—" : analytics.averageVisitsPerDay}</strong>
            </div>

            <button
              type="button"
              className="admin-visit-stats-summary__refresh"
              disabled={loading || refreshing}
              onClick={() => void loadStats(false)}
              aria-label="Osveži statistiku poseta"
            >
              {refreshing ? (
                <span className="admin-visit-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M20 7v5h-5M4 17v-5h5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M18.2 9A7 7 0 0 0 6.4 6.4L4 9m16 6-2.4 2.6A7 7 0 0 1 5.8 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </footer>
        </aside>
      </section>

      {error && (
        <div className="admin-visit-stats-alert" role="alert">
          <span className="admin-visit-stats-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Statistika nije mogla da se učita</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <section className="admin-visit-stats-loading" aria-live="polite">
          <span
            className="admin-visit-stats-loading__spinner"
            aria-hidden="true"
          />

          <div>
            <strong>Pripremamo statistiku poseta</strong>

            <p>Analiziramo saobraćaj i ponašanje korisnika.</p>
          </div>
        </section>
      ) : stats ? (
        <>
          <section className="admin-visit-stats-section">
            <header className="admin-visit-stats-section__header">
              <div>
                <span className="admin-visit-stats-section__eyebrow">
                  PREGLED SAOBRAĆAJA
                </span>

                <h2>Ključni pokazatelji</h2>

                <p>Brzi pregled aktivnosti korisnika u aplikaciji.</p>
              </div>

              {refreshing && (
                <span className="admin-visit-stats-section__refreshing">
                  Sinhronizujem podatke...
                </span>
              )}
            </header>

            <div className="admin-visit-stats-grid">
              <article className="admin-visit-stat-card admin-visit-stat-card--today">
                <div className="admin-visit-stat-card__top">
                  <span className="admin-visit-stat-card__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 6h16v14H4V6Zm4-3v5m8-5v5M4 10h16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <span className="admin-visit-stat-card__indicator" />
                </div>

                <span className="admin-visit-stat-card__label">Danas</span>

                <strong className="admin-visit-stat-card__value">
                  {stats.totalVisitsToday}
                </strong>

                <p>Ukupan broj zabeleženih poseta danas.</p>
              </article>

              <article className="admin-visit-stat-card admin-visit-stat-card--week">
                <div className="admin-visit-stat-card__top">
                  <span className="admin-visit-stat-card__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 18V9m5 9V5m5 13v-6m5 6V7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <span className="admin-visit-stat-card__indicator" />
                </div>

                <span className="admin-visit-stat-card__label">
                  Poslednjih 7 dana
                </span>

                <strong className="admin-visit-stat-card__value">
                  {stats.totalVisitsLast7Days}
                </strong>

                <p>Ukupan saobraćaj u poslednjih sedam dana.</p>
              </article>

              <article className="admin-visit-stat-card admin-visit-stat-card--unique">
                <div className="admin-visit-stat-card__top">
                  <span className="admin-visit-stat-card__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        cx="9"
                        cy="8"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />

                      <circle
                        cx="17"
                        cy="9"
                        r="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />

                      <path
                        d="M3 19c.6-3.3 2.5-5 6-5s5.4 1.7 6 5m1-5c2.7.2 4.2 1.8 4.7 4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <span className="admin-visit-stat-card__indicator" />
                </div>

                <span className="admin-visit-stat-card__label">
                  Jedinstveni posetioci
                </span>

                <strong className="admin-visit-stat-card__value">
                  {stats.uniqueVisitorsLast7Days}
                </strong>

                <p>Različiti posetioci identifikovani u periodu.</p>
              </article>

              <article className="admin-visit-stat-card admin-visit-stat-card--customer">
                <div className="admin-visit-stat-card__top">
                  <span className="admin-visit-stat-card__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="8"
                        r="3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />

                      <path
                        d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <span className="admin-visit-stat-card__indicator" />
                </div>

                <span className="admin-visit-stat-card__label">
                  Registrovani kupci
                </span>

                <strong className="admin-visit-stat-card__value">
                  {stats.customerVisitsLast7Days}
                </strong>

                <p>
                  {analytics.registeredShare}% poseta dolazi od prijavljenih
                  kupaca.
                </p>
              </article>

              <article className="admin-visit-stat-card admin-visit-stat-card--anonymous">
                <div className="admin-visit-stat-card__top">
                  <span className="admin-visit-stat-card__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="12"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />

                      <path
                        d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 2-2.5 2.1-2.5 4M12 17h.01"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <span className="admin-visit-stat-card__indicator" />
                </div>

                <span className="admin-visit-stat-card__label">
                  Anonimni posetioci
                </span>

                <strong className="admin-visit-stat-card__value">
                  {stats.anonymousVisitsLast7Days}
                </strong>

                <p>
                  {analytics.anonymousShare}% poseta nastaje pre prijave ili
                  registracije.
                </p>
              </article>
            </div>
          </section>

          <section className="admin-visit-audience">
            <header className="admin-visit-audience__header">
              <div>
                <span>STRUKTURA PUBLIKE</span>
                <h2>Ko koristi aplikaciju?</h2>
              </div>

              <strong>
                {stats.customerVisitsLast7Days + stats.anonymousVisitsLast7Days}{" "}
                poseta
              </strong>
            </header>

            <div className="admin-visit-audience__bar">
              <span
                className="admin-visit-audience__registered"
                style={{
                  width: `${analytics.registeredShare}%`,
                }}
              />

              <span
                className="admin-visit-audience__anonymous"
                style={{
                  width: `${analytics.anonymousShare}%`,
                }}
              />
            </div>

            <div className="admin-visit-audience__legend">
              <div>
                <span className="admin-visit-audience__dot admin-visit-audience__dot--registered" />

                <span>Registrovani kupci</span>

                <strong>{analytics.registeredShare}%</strong>
              </div>

              <div>
                <span className="admin-visit-audience__dot admin-visit-audience__dot--anonymous" />

                <span>Anonimni posetioci</span>

                <strong>{analytics.anonymousShare}%</strong>
              </div>
            </div>
          </section>

          <section className="admin-visit-stats-layout">
            <article className="admin-visit-panel">
              <header className="admin-visit-panel__header">
                <div>
                  <span>DNEVNI TREND</span>

                  <h2>Posete po danima</h2>

                  <p>Poređenje ukupnih i jedinstvenih poseta.</p>
                </div>

                {analytics.bestDay && (
                  <div className="admin-visit-panel__highlight">
                    <span>Najaktivniji dan</span>

                    <strong>{formatFullDate(analytics.bestDay.date)}</strong>

                    <small>{analytics.bestDay.visits} poseta</small>
                  </div>
                )}
              </header>

              {stats.dailyVisits.length === 0 ? (
                <div className="admin-visit-panel__empty">
                  <strong>Još nema zabeleženih poseta</strong>

                  <p>
                    Dnevni pregled će se pojaviti kada prikupimo dovoljno
                    podataka.
                  </p>
                </div>
              ) : (
                <div className="admin-visit-days">
                  {stats.dailyVisits.map((day) => {
                    const barWidth =
                      analytics.maxDailyVisits > 0
                        ? Math.max(
                            4,
                            (day.visits / analytics.maxDailyVisits) * 100,
                          )
                        : 0;

                    return (
                      <div key={day.date} className="admin-visit-day">
                        <div className="admin-visit-day__label">
                          <strong>{formatDate(day.date)}</strong>

                          <span>{day.uniqueVisitors} jedinstvenih</span>
                        </div>

                        <div className="admin-visit-day__bar">
                          <span
                            style={{
                              width: `${barWidth}%`,
                            }}
                          />
                        </div>

                        <strong className="admin-visit-day__value">
                          {day.visits}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="admin-visit-panel">
              <header className="admin-visit-panel__header">
                <div>
                  <span>INTERESOVANJE KORISNIKA</span>

                  <h2>Najgledanije stranice</h2>

                  <p>Putanje sa najvećim brojem zabeleženih poseta.</p>
                </div>

                <div className="admin-visit-panel__count">
                  <strong>{stats.topPaths.length}</strong>
                  <span>putanja</span>
                </div>
              </header>

              {stats.topPaths.length === 0 ? (
                <div className="admin-visit-panel__empty">
                  <strong>Nema dovoljno podataka</strong>

                  <p>
                    Najgledanije stranice će se prikazati kada se prikupi više
                    poseta.
                  </p>
                </div>
              ) : (
                <div className="admin-visit-paths">
                  {stats.topPaths.map((item, index) => (
                    <div key={item.path} className="admin-visit-path">
                      <span className="admin-visit-path__rank">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="admin-visit-path__content">
                        <strong>{item.path}</strong>

                        <span>
                          {item.uniqueVisitors} jedinstvenih posetilaca
                        </span>
                      </div>

                      <div className="admin-visit-path__visits">
                        <strong>{item.visits}</strong>
                        <span>poseta</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      ) : (
        <section className="admin-visit-stats-empty">
          <div className="admin-visit-stats-empty__icon">
            <svg viewBox="0 0 24 24">
              <path
                d="M4 19V10m5 9V5m6 14v-7m5 7V8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <span>NEMA PODATAKA</span>

          <h2>Statistika još nije dostupna</h2>

          <p>
            Kada aplikacija zabeleži posete, analitika će se prikazati ovde.
          </p>
        </section>
      )}
    </main>
  );
}
