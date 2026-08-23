import { Link } from "react-router-dom";
import "../../styles/HomePage.scss";
import HomeFeaturedDishes from "../../components/home/HomeFeaturedDishes";

const benefits = [
  {
    number: "01",
    title: "Pripremljeno po porudžbini",
    text: "Jelo kreće na pripremu tek kada poručiš, kako bi do tebe stiglo sveže, toplo i punog ukusa.",
  },
  {
    number: "02",
    title: "Složi obrok po svom",
    text: "Izaberi priloge, dodatke i začine i napravi kombinaciju baš onako kako ti odgovara.",
  },
  {
    number: "03",
    title: "Brzo do tvojih vrata",
    text: "Jednostavno poručivanje, jasni koraci i dostava bez nepotrebnog čekanja.",
  },
];

export default function HomePage() {
  return (
    <main className="home-page">
      <section id="pocetna" className="home-hero">
        <div className="home-hero__media" aria-hidden="true">
          <video
            className="home-hero__video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/videos/home-hero-one.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="home-hero__overlay" />

        <div className="home-hero__inner">
          <div className="home-hero__content">
            <span className="home-hero__eyebrow">
              <span className="home-hero__eyebrow-dot" />
              PRAVO SA ROŠTILJA
            </span>

            <h1 className="home-hero__title">
              <span className="home-hero__title-line">Glad ne čeka.</span>

              <span className="home-hero__title-line home-hero__title-line--accent">
                Ni ti ne moraš.
              </span>
            </h1>

            <p className="home-hero__text">
              Izaberi ono što ti se jede, složi obrok po svom ukusu i poruči ga
              u samo nekoliko klikova. Mi ćemo se pobrinuti za ostalo.
            </p>

            <div className="home-hero__actions">
              <Link to="/menu" className="btn btn--primary btn--lg">
                Pogledaj meni
              </Link>

              <Link to="/register" className="btn btn--ghost btn--lg">
                Napravi nalog
              </Link>
            </div>

            <div className="home-hero__highlights">
              <span>Sveže pripremljeno</span>
              <span>Brzo poručivanje</span>
              <span>Brza dostava</span>
            </div>
          </div>
        </div>
      </section>

      <section id="izdvajamo" className="home-menu-highlights">
        <div className="home-menu-highlights__inner">
          <HomeFeaturedDishes />
        </div>
      </section>

      <section id="zasto-mi" className="home-benefits">
        <div className="home-benefits__inner">
          <header className="home-section-heading">
            <span className="home-section-heading__eyebrow">
              ZAŠTO BEEF N&apos; CHICKEN?
            </span>

            <h2 className="home-section-heading__title">
              Dobar obrok ne mora da bude komplikovan
            </h2>

            <p className="home-section-heading__text">
              Od izbora jela do potvrde porudžbine — sve je napravljeno tako da
              brzo dođeš do ukusa koji želiš.
            </p>
          </header>

          <div className="home-benefits__grid">
            {benefits.map((benefit) => (
              <article key={benefit.number} className="home-benefit-card">
                <span className="home-benefit-card__number">
                  {benefit.number}
                </span>

                <h3 className="home-benefit-card__title">{benefit.title}</h3>

                <p className="home-benefit-card__text">{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="poruci" className="home-cta">
        <div className="home-cta__inner">
          <div className="home-cta__content">
            <div className="home-cta__content">
              <h2 className="home-cta__title">
                Izaberi svoj savršeni obrok u samo nekoliko klikova.
              </h2>
            </div>
          </div>

          <div className="home-cta__actions">
            <Link to="/menu" className="btn btn--accent btn--lg">
              Pogledaj meni
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
