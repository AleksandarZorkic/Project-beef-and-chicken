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
    title: "Brzo i jednostavno",
    text: "Izaberi jelo, priloge i adresu, a zatim potvrdi porudžbinu bez nepotrebnih koraka.",
  },
  {
    number: "03",
    title: "Ukus koji se pamti",
    text: "Sočno meso, hrskava piletina, bogati sosevi i kombinacije napravljene za ozbiljan apetit.",
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
              PRAVO SA GRILA
            </span>

            <h1 className="home-hero__title">
              <span className="home-hero__title-line">Veliki ukus.</span>

              <span className="home-hero__title-line home-hero__title-line--accent">
                Bez čekanja.
              </span>
            </h1>

            <p className="home-hero__text">
              Sočni burgeri, hrskava piletina i bogati grill obroci pripremljeni
              za ozbiljan apetit. Izaberi svoje favorite i poruči za nekoliko
              minuta.
            </p>

            <div className="home-hero__actions">
              <Link to="/menu" className="btn btn--primary btn--lg">
                Pogledaj meni
              </Link>

              <Link to="/register" className="btn btn--ghost btn--lg">
                Napravi nalog
              </Link>
            </div>

            <Link to="/login" className="home-hero__login">
              <span>Već imaš nalog?</span>
              <strong>Prijavi se</strong>
            </Link>

            <div className="home-hero__highlights">
              <span>Sveže pripremljeno</span>
              <span>Brzo poručivanje</span>
              <span>Pun grill ukus</span>
            </div>
          </div>
        </div>
      </section>

      <section id="izdvajamo" className="home-menu-highlights">
        <div className="home-menu-highlights__inner">
          <header className="home-section-heading">
            <span className="home-section-heading__eyebrow">IZDVAJAMO</span>

            <h2 className="home-section-heading__title">
              Najtraženije i preporuke kuće
            </h2>

            <p className="home-section-heading__text">
              Otkrij jela koja naši gosti najčešće biraju i posebne ukuse koje
              preporučuje naša kuhinja.
            </p>
          </header>

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

      <section className="home-cta">
        <div className="home-cta__inner">
          <div className="home-cta__content">
            <span className="home-cta__eyebrow">VREME JE ZA GRILL</span>

            <h2 className="home-cta__title">
              Izaberi obrok koji ti se jede danas
            </h2>

            <p className="home-cta__text">
              Otvori meni, izaberi omiljeno jelo i priloge, a zatim završi
              porudžbinu u nekoliko koraka.
            </p>
          </div>

          <div className="home-cta__actions">
            <Link to="/menu" className="btn btn--primary btn--lg">
              Otvori meni
            </Link>

            <Link to="/register" className="btn btn--ghost btn--lg">
              Napravi nalog
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
