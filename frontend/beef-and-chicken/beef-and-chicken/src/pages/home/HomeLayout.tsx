import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../../components/layout/SiteFooter";

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
        <div className="container home-header__inner">
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

      <SiteFooter />
    </div>
  );
}
