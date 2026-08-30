import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getRestaurantSettings,
  type RestaurantWorkingHourDto,
} from "../../api/restaurantSettingsApi";

const RESTAURANT_PHONE = "066 286858";
const RESTAURANT_PHONE_HREF = "tel:+38166286858";

const RESTAURANT_EMAIL = "beefnchickengrill@gmail.com";
const RESTAURANT_EMAIL_HREF = "mailto:beefnchickengrill@gmail.com";

/*
 * Replace this value with the exact restaurant Instagram URL.
 */
const RESTAURANT_INSTAGRAM_URL = "https://www.instagram.com/OVDE_TACAN_PROFIL";

const dayOrder: RestaurantWorkingHourDto["dayOfWeek"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const shortDayNames: Record<RestaurantWorkingHourDto["dayOfWeek"], string> = {
  Monday: "Pon",
  Tuesday: "Uto",
  Wednesday: "Sre",
  Thursday: "Čet",
  Friday: "Pet",
  Saturday: "Sub",
  Sunday: "Ned",
};

type WorkingHoursGroup = {
  label: string;
  value: string;
  isClosed: boolean;
};

function getWorkingHoursValue(day: RestaurantWorkingHourDto) {
  if (day.isClosed) {
    return "Zatvoreno";
  }

  if (!day.openTime || !day.closeTime) {
    return "Nije podešeno";
  }

  return `${day.openTime}–${day.closeTime}`;
}

function getWorkingHoursKey(day: RestaurantWorkingHourDto) {
  if (day.isClosed) {
    return "closed";
  }

  return [
    day.openTime ?? "",
    day.closeTime ?? "",
    day.closesNextDay ? "next-day" : "",
  ].join("|");
}

function groupWorkingHours(
  workingHours: RestaurantWorkingHourDto[],
): WorkingHoursGroup[] {
  const sorted = [...workingHours].sort(
    (first, second) =>
      dayOrder.indexOf(first.dayOfWeek) - dayOrder.indexOf(second.dayOfWeek),
  );

  if (sorted.length === 0) {
    return [];
  }

  const groups: {
    first: RestaurantWorkingHourDto;
    last: RestaurantWorkingHourDto;
  }[] = [];

  for (const day of sorted) {
    const previousGroup = groups.at(-1);

    if (
      previousGroup &&
      getWorkingHoursKey(previousGroup.last) === getWorkingHoursKey(day)
    ) {
      previousGroup.last = day;

      continue;
    }

    groups.push({
      first: day,
      last: day,
    });
  }

  return groups.map(({ first, last }) => {
    const firstLabel = shortDayNames[first.dayOfWeek];

    const lastLabel = shortDayNames[last.dayOfWeek];

    return {
      label:
        first.dayOfWeek === last.dayOfWeek
          ? firstLabel
          : `${firstLabel}–${lastLabel}`,

      value: getWorkingHoursValue(first),

      isClosed: first.isClosed,
    };
  });
}

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  const [workingHours, setWorkingHours] = useState<RestaurantWorkingHourDto[]>(
    [],
  );

  const [loadingWorkingHours, setLoadingWorkingHours] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadWorkingHours() {
      try {
        setLoadingWorkingHours(true);

        const settings = await getRestaurantSettings();

        if (!mounted) {
          return;
        }

        setWorkingHours(settings.workingHours ?? []);
      } catch {
        if (!mounted) {
          return;
        }

        setWorkingHours([]);
      } finally {
        if (mounted) {
          setLoadingWorkingHours(false);
        }
      }
    }

    void loadWorkingHours();

    return () => {
      mounted = false;
    };
  }, []);

  const groupedWorkingHours = useMemo(
    () => groupWorkingHours(workingHours),
    [workingHours],
  );

  return (
    <footer className="home-footer">
      <div className="home-footer__inner">
        {/* Brand */}
        <div className="home-footer__about">
          <Link
            to="/"
            className="home-footer__brand"
            aria-label="Beef n' Chicken početna"
          >
            <img src="/logo.png" alt="" className="home-footer__logo" />

            <span className="home-footer__brand-content">
              <strong className="home-footer__brand-name">
                Beef n&apos; Chicken
              </strong>

              <span className="home-footer__brand-description">
                Grill • Fast Food
              </span>
            </span>
          </Link>

          <p className="home-footer__text">
            Sveže pripremljena jela sa roštilja, obroci po tvom ukusu i
            jednostavno poručivanje bez nepotrebnog čekanja.
          </p>
        </div>

        {/* Quick links */}
        <nav className="home-footer__section" aria-label="Brzi linkovi">
          <span className="home-footer__section-title">Brzi linkovi</span>

          <Link to="/menu">Meni</Link>

          <Link to="/#izdvajamo">Preporuka kuće</Link>

          <Link to="/#zasto-mi">Zašto mi</Link>

          <Link to="/login">Prijavi se</Link>
        </nav>

        {/* Contact */}
        <address className="home-footer__section home-footer__contact">
          <span className="home-footer__section-title">Kontakt</span>

          <a href={RESTAURANT_PHONE_HREF} className="home-footer__contact-link">
            <span className="home-footer__contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M7.2 3.5 10 7.9 8.2 9.7c.9 1.9 2.3 3.3 4.2 4.2l1.8-1.8 4.3 2.7-.8 3.8c-.2 1-1.1 1.6-2.1 1.5C9.4 19.2 4.8 14.6 4 8.4c-.1-1 .5-1.9 1.5-2.1l1.7-.4V3.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span>
              <small>Telefon</small>

              <strong>{RESTAURANT_PHONE}</strong>
            </span>
          </a>

          <a href={RESTAURANT_EMAIL_HREF} className="home-footer__contact-link">
            <span className="home-footer__contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="m4.5 7 7.5 6 7.5-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span>
              <small>Email</small>

              <strong>{RESTAURANT_EMAIL}</strong>
            </span>
          </a>

          <a
            href={RESTAURANT_INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="home-footer__contact-link"
          >
            <span className="home-footer__contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <circle cx="17.3" cy="6.8" r="1" fill="currentColor" />
              </svg>
            </span>

            <span>
              <small>Instagram</small>

              <strong>Poseti profil</strong>
            </span>
          </a>
        </address>

        {/* Working hours */}
        <section className="home-footer__section home-footer__hours">
          <span className="home-footer__section-title">Radno vreme</span>

          <div className="home-footer__hours-card">
            <header className="home-footer__hours-header">
              <span className="home-footer__contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="8.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="M12 7.5V12l3.1 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <div>
                <strong>Restoran</strong>

                <span>Radno vreme iz podešavanja</span>
              </div>
            </header>

            <div className="home-footer__hours-list">
              {loadingWorkingHours ? (
                <div className="home-footer__hours-loading">
                  <span
                    className="home-footer__hours-spinner"
                    aria-hidden="true"
                  />
                  Učitavamo...
                </div>
              ) : groupedWorkingHours.length > 0 ? (
                groupedWorkingHours.map((group) => (
                  <div
                    key={`${group.label}-${group.value}`}
                    className={[
                      "home-footer__hours-row",
                      group.isClosed ? "home-footer__hours-row--closed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span>{group.label}</span>

                    <strong>{group.value}</strong>
                  </div>
                ))
              ) : (
                <p className="home-footer__hours-unavailable">
                  Radno vreme trenutno nije dostupno.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="home-footer__bottom">
        <p>© {currentYear} Beef n&apos; Chicken Grill. Sva prava zadržana.</p>

        <span>Pravo sa roštilja.</span>
      </div>
    </footer>
  );
}
