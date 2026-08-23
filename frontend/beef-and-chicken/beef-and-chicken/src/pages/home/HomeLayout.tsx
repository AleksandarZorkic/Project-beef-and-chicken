import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

type HomeLayoutProps = {
  children: ReactNode;
};

const HEADER_DARK_START = 24;

export default function HomeLayout({ children }: HomeLayoutProps) {
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsHeaderScrolled(window.scrollY > HEADER_DARK_START);
    }

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const headerClassName = isHeaderScrolled
    ? "home-header home-header--scrolled"
    : "home-header";

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="home-layout">
      <header className={headerClassName}>
        <div className="home-header__inner">
          <Link
            to="/"
            className="home-header__brand"
            aria-label="Beef n' Chicken početna stranica"
            onClick={scrollToTop}
          >
            <img
              src="/logo.png"
              alt="Beef n' Chicken Grill"
              className="home-header__logo"
            />

            <span className="home-header__brand-content">
              <span className="home-header__brand-name">
                Beef n&apos; Chicken
              </span>

              <span className="home-header__brand-description">
                Burgeri • piletina • giros
              </span>
            </span>
          </Link>

          <nav
            className="home-header__nav"
            aria-label="Navigacija početne stranice"
          >
            <a href="#akcije" className="home-header__nav-link">
              Akcije
            </a>

            <a href="#preporuka-kuce" className="home-header__nav-link">
              Preporuka kuće
            </a>

            <a href="#najprodavanije" className="home-header__nav-link">
              Najprodavanije
            </a>

            <a href="#zasto-mi" className="home-header__nav-link">
              Zašto mi
            </a>

            <a href="#poruci" className="home-header__nav-link">
              Poruči
            </a>
          </nav>
        </div>
      </header>

      <div className="home-layout__content">{children}</div>

      <footer className="home-footer">
        <div className="home-footer__inner">
          <Link
            to="/"
            className="home-footer__brand"
            aria-label="Beef n' Chicken početna stranica"
            onClick={scrollToTop}
          >
            <img src="/logo.png" alt="" className="home-footer__logo" />

            <span>Beef n&apos; Chicken Grill</span>
          </Link>

          <p className="home-footer__text">
            Burgeri, piletina i grill obroci pripremljeni sveže i poručeni bez
            komplikacija.
          </p>

          <nav className="home-footer__nav" aria-label="Navigacija u podnožju">
            <Link to="/menu">Meni</Link>
            <Link to="/login">Prijava</Link>
            <Link to="/register">Registracija</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
