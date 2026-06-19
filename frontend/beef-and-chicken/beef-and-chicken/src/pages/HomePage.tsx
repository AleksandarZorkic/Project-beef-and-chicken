import { Link } from "react-router-dom";
import "../styles/HomePage.scss";

const highlights = [
  "Fresh Off The Grill",
  "Premium Fast Food",
  "Fast Delivery",
];

const features = [
  {
    title: "Fire Grilled Taste",
    text: "Sočno meso, pun ukus i pravi američki grill karakter u svakom zalogaju.",
  },
  {
    title: "Fast & Simple Ordering",
    text: "Registracija, odabir jela i porudžbina bez komplikacije i gubljenja vremena.",
  },
  {
    title: "Modern Food Experience",
    text: "Moderan dizajn, jasna navigacija i iskustvo koje deluje brzo, čisto i premium.",
  },
];

const categories = [
  {
    name: "Burgers",
    desc: "Veliki burgeri, topljeni sir i jaki sosevi.",
  },
  {
    name: "Chicken",
    desc: "Crispy, spicy i grilled opcije za svaki ukus.",
  },
  {
    name: "Wraps",
    desc: "Brz, praktičan i pun pogodak za svaki dan.",
  },
  {
    name: "Combos",
    desc: "Obrok koji rešava sve: glavno jelo, pomfrit i piće.",
  },
];

const featuredItems = [
  {
    badge: "BEST SELLER",
    title: "Smoky Beef Burger",
    text: "Double beef, cheddar, smoky sos, karamelizovani luk i grill vibe.",
    price: "od 690 RSD",
  },
  {
    badge: "HOT PICK",
    title: "Crispy Chicken Box",
    text: "Hrskava piletina, pomfrit, dip sos i ozbiljan fast-food osećaj.",
    price: "od 590 RSD",
  },
  {
    badge: "COMBO DEAL",
    title: "Grill Combo Meal",
    text: "Burger ili chicken + fries + drink. Najbolja opcija za brz i jak obrok.",
    price: "od 890 RSD",
  },
];

const steps = [
  "Registruj se ili se prijavi na aplikaciju",
  "Izaberi jela i dodaj ih u korpu",
  "Unesi adresu i potvrdi porudžbinu za par klikova",
];

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-page__bg home-page__bg--1" />
      <div className="home-page__bg home-page__bg--2" />

      <header className="home-header">
        <div className="home-header__brand">
          <img
            src="/logo.png"
            alt="Beef n' Chicken Grill"
            className="home-header__logo"
          />
          <div className="home-header__brand-text">
            <span className="home-header__name">
              Beef n&apos; Chicken Grill
            </span>
            <span className="home-header__tag">
              American grill ordering app
            </span>
          </div>
        </div>

        <nav className="home-header__nav">
          <Link to="/menu" className="btn btn--ghost">
            Meni
          </Link>

          <Link to="/login" className="btn btn--ghost">
            Prijava
          </Link>

          <Link to="/register" className="btn btn--primary">
            Registracija
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero__content">
            <div className="hero__eyebrow">MODERN AMERICAN GRILL</div>

            <h1 className="hero__title">
              Big flavor.
              <br />
              Fast delivery.
              <br />
              Strong brand.
            </h1>

            <p className="hero__text">
              Aplikacija za poručivanje koja treba da izgleda moćno, moderno i
              ukusno već na prvi pogled. Tamna premium atmosfera, jaki grill
              tonovi i jasan put ka registraciji, prijavi i poručivanju.
            </p>

            <div className="hero__actions">
              <Link to="/register" className="btn btn--primary">
                Registruj se
              </Link>

              <Link to="/login" className="btn btn--ghost">
                Prijavi se
              </Link>

              <Link to="/menu" className="btn btn--accent">
                Pogledaj meni
              </Link>
            </div>

            <div className="hero__highlights">
              {highlights.map((item) => (
                <span key={item} className="hero__pill">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hero__visual">
            <div className="hero-visual">
              <div className="hero-visual__card hero-visual__card--top">
                <span className="hero-visual__label">SMOKY</span>
                <h3>Burger Night</h3>
                <p>Bold taste, premium vibe.</p>
              </div>

              <div className="hero-visual__center">
                <div className="hero-visual__ring">
                  <img
                    src="/logo.png"
                    alt="Beef n' Chicken Grill logo"
                    className="hero-visual__logo"
                  />
                </div>
              </div>

              <div className="hero-visual__card hero-visual__card--bottom">
                <span className="hero-visual__label">CRISPY</span>
                <h3>Chicken Combo</h3>
                <p>Fast, hot and satisfying.</p>
              </div>

              <div className="hero-visual__glow hero-visual__glow--1" />
              <div className="hero-visual__glow hero-visual__glow--2" />
            </div>
          </div>
        </section>

        <section className="brand-strip">
          <div className="brand-strip__inner">
            <span>Bold Taste</span>
            <span>American Style</span>
            <span>Fast Ordering</span>
            <span>Premium Look</span>
            <span>Grill Energy</span>
          </div>
        </section>

        <section className="features section">
          <div className="section-heading">
            <span className="section-heading__eyebrow">WHY THIS STYLE</span>
            <h2 className="section-heading__title">
              Dizajn koji odmah prodaje atmosferu brenda
            </h2>
            <p className="section-heading__text">
              Cilj nije da izgleda kao generična delivery aplikacija, već kao
              ozbiljan fast-food brend sa identitetom.
            </p>
          </div>

          <div className="features__grid">
            {features.map((item) => (
              <article key={item.title} className="feature-card">
                <div className="feature-card__line" />
                <h3 className="feature-card__title">{item.title}</h3>
                <p className="feature-card__text">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="categories section">
          <div className="section-heading">
            <span className="section-heading__eyebrow">MENU PREVIEW</span>
            <h2 className="section-heading__title">
              Kategorije koje treba da dominiraju
            </h2>
          </div>

          <div className="categories__grid">
            {categories.map((category) => (
              <article key={category.name} className="category-card">
                <div className="category-card__top" />
                <h3 className="category-card__name">{category.name}</h3>
                <p className="category-card__desc">{category.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="featured section">
          <div className="featured__content">
            <div className="section-heading section-heading--left">
              <span className="section-heading__eyebrow">SIGNATURE FEEL</span>
              <h2 className="section-heading__title">
                Home page mora da izazove glad i poverenje
              </h2>
              <p className="section-heading__text">
                Krupni blokovi, jak kontrast, tamna premium pozadina i istaknuti
                proizvodi daju osećaj ozbiljnog modernog brenda.
              </p>
            </div>

            <div className="featured__cards">
              {featuredItems.map((item) => (
                <article key={item.title} className="featured-card">
                  <span className="featured-card__badge">{item.badge}</span>
                  <h3 className="featured-card__title">{item.title}</h3>
                  <p className="featured-card__text">{item.text}</p>
                  <div className="featured-card__footer">
                    <span className="featured-card__price">{item.price}</span>
                    <Link to="/menu" className="featured-card__link">
                      Pogledaj
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="steps-section section">
          <div className="section-heading">
            <span className="section-heading__eyebrow">HOW IT WORKS</span>
            <h2 className="section-heading__title">
              Jednostavan put do porudžbine
            </h2>
          </div>

          <div className="steps-section__grid">
            {steps.map((step, index) => (
              <article key={step} className="step-card">
                <div className="step-card__number">0{index + 1}</div>
                <p className="step-card__text">{step}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta section">
          <div className="cta__box">
            <div className="cta__content">
              <span className="cta__eyebrow">READY TO ORDER?</span>
              <h2 className="cta__title">
                Napravi jak prvi utisak i pretvori posetu u porudžbinu
              </h2>
              <p className="cta__text">
                Javna početna strana treba odmah da vodi korisnika ka
                registraciji, prijavi i meniju — brzo, jasno i vizuelno jako.
              </p>
            </div>

            <div className="cta__actions">
              <Link to="/register" className="btn btn--primary">
                Kreni odmah
              </Link>

              <Link to="/menu" className="btn btn--accent">
                Otvori meni
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer__brand">Beef n&apos; Chicken Grill</div>
        <div className="home-footer__text">
          Modern american grill experience built for fast ordering.
        </div>
      </footer>
    </div>
  );
}
