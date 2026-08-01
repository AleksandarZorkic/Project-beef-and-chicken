import { Link, useParams } from "react-router-dom";
import "../styles/OrderSuccessPage.scss";

export default function OrderSuccessPage() {
  const { orderId } = useParams();

  return (
    <main className="order-success-page">
      <section
        className="order-success-card"
        aria-labelledby="order-success-title"
      >
        <div className="order-success-card__decoration" aria-hidden="true" />

        <div className="order-success-card__icon-shell" aria-hidden="true">
          <svg className="order-success-card__icon" viewBox="0 0 24 24">
            <path
              d="M5 12.5 9.2 17 19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span className="order-success-card__eyebrow">
          PORUDŽBINA JE PRIMLJENA
        </span>

        <h1 id="order-success-title" className="order-success-card__title">
          Uspešno ste poručili!
        </h1>

        <p className="order-success-card__description">
          Vaša porudžbina je uspešno kreirana. Status i ostale detalje možete
          pratiti u sekciji „Moje porudžbine“.
        </p>

        <div className="order-success-card__number">
          <span>Broj porudžbine</span>

          <strong>#{orderId}</strong>
        </div>

        <div className="order-success-card__info">
          <span className="order-success-card__info-icon" aria-hidden="true">
            i
          </span>

          <p>
            Sačuvajte broj porudžbine radi lakšeg praćenja i komunikacije sa
            restoranom.
          </p>
        </div>

        <div className="order-success-card__actions">
          <Link
            to="/my-orders"
            className="order-success-card__link order-success-card__link--primary"
          >
            <span>Prikaži moje porudžbine</span>

            <span className="order-success-card__link-arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link
            to="/menu"
            className="order-success-card__link order-success-card__link--secondary"
          >
            Nazad na meni
          </Link>
        </div>

        <div className="order-success-card__footer">
          <img src="/logo.png" alt="" className="order-success-card__logo" />

          <span>Hvala na poverenju</span>
        </div>
      </section>
    </main>
  );
}
