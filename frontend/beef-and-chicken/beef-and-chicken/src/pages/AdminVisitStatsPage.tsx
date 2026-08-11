import { useEffect, useState } from "react";
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

  if (loading) {
    return (
      <main className="admin-visit-stats-page">
        <section className="admin-visit-stats-loading">
          <strong>Učitavamo statistiku poseta...</strong>
          <p>Sačekajte trenutak.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-visit-stats-page">
      <header className="admin-visit-stats-page__header">
        <div>
          <span className="admin-visit-stats-page__eyebrow">
            ANALITIKA POSETA
          </span>

          <h1 className="admin-visit-stats-page__title">Statistika poseta</h1>

          <p className="admin-visit-stats-page__description">
            Pregled anonimnih posetilaca i registrovanih kupaca. Interni
            korisnici kao admin, zaposleni i kuriri nisu uključeni u glavnu
            statistiku.
          </p>
        </div>

        <button
          type="button"
          className="admin-visit-stats-page__refresh"
          disabled={refreshing}
          onClick={() => void loadStats(false)}
        >
          {refreshing ? "Osvežavam..." : "Učitaj ponovo"}
        </button>
      </header>

      {error && (
        <div className="admin-visit-stats-alert" role="alert">
          <strong>Došlo je do greške</strong>
          <p>{error}</p>
        </div>
      )}

      {stats && (
        <>
          <section className="admin-visit-stats-grid">
            <article className="admin-visit-stat-card admin-visit-stat-card--primary">
              <span>Danas</span>
              <strong>{stats.totalVisitsToday}</strong>
              <p>Ukupno poseta danas</p>
            </article>

            <article className="admin-visit-stat-card">
              <span>7 dana</span>
              <strong>{stats.totalVisitsLast7Days}</strong>
              <p>Ukupno poseta u poslednjih 7 dana</p>
            </article>

            <article className="admin-visit-stat-card">
              <span>Jedinstveni posetioci</span>
              <strong>{stats.uniqueVisitorsLast7Days}</strong>
              <p>Različiti visitorId u poslednjih 7 dana</p>
            </article>

            <article className="admin-visit-stat-card">
              <span>Registrovani kupci</span>
              <strong>{stats.customerVisitsLast7Days}</strong>
              <p>Posete Customer korisnika</p>
            </article>

            <article className="admin-visit-stat-card">
              <span>Anonimni posetioci</span>
              <strong>{stats.anonymousVisitsLast7Days}</strong>
              <p>Posete pre prijave ili registracije</p>
            </article>
          </section>

          <section className="admin-visit-stats-layout">
            <article className="admin-visit-panel">
              <header className="admin-visit-panel__header">
                <div>
                  <span>DNEVNI PREGLED</span>
                  <h2>Posete po danima</h2>
                </div>
              </header>

              {stats.dailyVisits.length === 0 ? (
                <p className="admin-visit-panel__empty">
                  Još nema zabeleženih poseta.
                </p>
              ) : (
                <div className="admin-visit-days">
                  {stats.dailyVisits.map((day) => (
                    <div key={day.date} className="admin-visit-day">
                      <div className="admin-visit-day__label">
                        <strong>{formatDate(day.date)}</strong>
                        <span>{day.uniqueVisitors} jedinstvenih</span>
                      </div>

                      <div className="admin-visit-day__bar">
                        <span
                          style={{
                            width: `${Math.min(day.visits * 8, 100)}%`,
                          }}
                        />
                      </div>

                      <strong className="admin-visit-day__value">
                        {day.visits}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="admin-visit-panel">
              <header className="admin-visit-panel__header">
                <div>
                  <span>NAJGLEDANIJE STRANICE</span>
                  <h2>Top putanje</h2>
                </div>
              </header>

              {stats.topPaths.length === 0 ? (
                <p className="admin-visit-panel__empty">
                  Još nema dovoljno podataka.
                </p>
              ) : (
                <div className="admin-visit-paths">
                  {stats.topPaths.map((item) => (
                    <div key={item.path} className="admin-visit-path">
                      <div>
                        <strong>{item.path}</strong>
                        <span>{item.uniqueVisitors} jedinstvenih</span>
                      </div>

                      <b>{item.visits}</b>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </main>
  );
}
