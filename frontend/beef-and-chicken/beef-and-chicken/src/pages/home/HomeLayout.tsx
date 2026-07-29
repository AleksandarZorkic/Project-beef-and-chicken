import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import HomeAnnouncements from "../../components/home/HomeAnnouncements";

type HomeLayoutProps = {
  children: ReactNode;
};

const SCROLL_DELTA = 8;
const HEADER_HIDE_START = 120;

export default function HomeLayout({ children }: HomeLayoutProps) {
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  const lastScrollY = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    function handleScroll() {
      if (animationFrameId.current !== null) {
        return;
      }

      animationFrameId.current = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDifference = currentScrollY - lastScrollY.current;

        setIsHeaderScrolled(currentScrollY > 20);

        if (currentScrollY < HEADER_HIDE_START) {
          setIsHeaderHidden(false);
        } else if (scrollDifference > SCROLL_DELTA) {
          // Hide while scrolling down.
          setIsHeaderHidden(true);
        } else if (scrollDifference < -SCROLL_DELTA) {
          // Show while scrolling up.
          setIsHeaderHidden(false);
        }

        lastScrollY.current = currentScrollY;
        animationFrameId.current = null;
      });
    }

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (animationFrameId.current !== null) {
        window.cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const headerClassName = [
    "home-header",
    isHeaderScrolled ? "home-header--scrolled" : "",
    isHeaderHidden ? "home-header--hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="home-layout">
      <HomeAnnouncements />

      <header className={headerClassName}>
        <div className="home-header__inner">
          <Link
            to="/"
            className="home-header__brand"
            aria-label="Beef n' Chicken početna stranica"
          >
            <img src="/logo.png" alt="" className="home-header__logo" />

            <div className="home-header__brand-text">
              <span className="home-header__name">Beef n&apos; Chicken</span>

              <span className="home-header__tag">
                Burgeri • piletina • grill
              </span>
            </div>
          </Link>

          <nav className="home-header__nav" aria-label="Glavna navigacija">
            <Link to="/menu" className="btn btn--primary btn--sm">
              Pogledaj meni
            </Link>
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
