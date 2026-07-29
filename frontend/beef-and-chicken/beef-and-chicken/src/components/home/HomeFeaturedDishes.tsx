import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_ORIGIN } from "../../api/https";
import {
  getBestSellers,
  getRecommendedDishes,
  type HomepageDishDto,
} from "../../api/menuApi";
import "./HomeFeaturedDishes.scss";

type FeaturedDishesState = {
  bestSellers: HomepageDishDto[];
  recommended: HomepageDishDto[];
  loading: boolean;
};

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

function formatPrice(price: number) {
  return `${price.toLocaleString("sr-RS")} RSD`;
}

function DishCard({
  dish,
  badge,
  variant,
}: {
  dish: HomepageDishDto;
  badge: string;
  variant: "best-seller" | "recommended";
}) {
  const imageUrl = resolveImageUrl(dish.imageUrl);

  return (
    <article className={`home-dish-card home-dish-card--${variant}`}>
      <div className="home-dish-card__image-wrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={dish.name}
            className="home-dish-card__image"
            loading="lazy"
          />
        ) : (
          <div className="home-dish-card__image-placeholder">
            Beef n&apos; Chicken
          </div>
        )}

        <span className="home-dish-card__badge">{badge}</span>
      </div>

      <div className="home-dish-card__body">
        <div className="home-dish-card__category">{dish.categoryName}</div>

        <h3 className="home-dish-card__title">{dish.name}</h3>

        {dish.description && (
          <p className="home-dish-card__description">{dish.description}</p>
        )}

        {dish.soldQuantity ? (
          <div className="home-dish-card__meta">
            Prodato: <strong>{dish.soldQuantity}</strong>
          </div>
        ) : (
          <div className="home-dish-card__meta">Izbor restorana</div>
        )}

        <div className="home-dish-card__footer">
          <strong className="home-dish-card__price">
            {formatPrice(dish.price)}
          </strong>

          <Link to="/menu" className="home-dish-card__link">
            Poruči
          </Link>
        </div>
      </div>
    </article>
  );
}

function DishSection({
  eyebrow,
  title,
  text,
  dishes,
  badge,
  variant,
}: {
  eyebrow: string;
  title: string;
  text: string;
  dishes: HomepageDishDto[];
  badge: string;
  variant: "best-seller" | "recommended";
}) {
  if (dishes.length === 0) {
    return null;
  }

  return (
    <section className="home-dish-section">
      <div className="home-dish-section__heading">
        <span className="home-dish-section__eyebrow">{eyebrow}</span>
        <h2 className="home-dish-section__title">{title}</h2>
        <p className="home-dish-section__text">{text}</p>
      </div>

      <div className="home-dish-section__grid">
        {dishes.map((dish) => (
          <DishCard
            key={`${variant}-${dish.id}`}
            dish={dish}
            badge={badge}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}

function FeaturedDishesSkeleton() {
  return (
    <section className="home-dish-section">
      <div className="home-dish-section__heading">
        <span className="home-dish-section__eyebrow">Učitavanje</span>
        <h2 className="home-dish-section__title">Izdvojena jela</h2>
      </div>

      <div className="home-dish-section__grid">
        {[1, 2, 3].map((item) => (
          <div key={item} className="home-dish-card home-dish-card--skeleton">
            <div className="home-dish-card__image-wrap" />
            <div className="home-dish-card__body">
              <div className="home-dish-card__skeleton-line home-dish-card__skeleton-line--short" />
              <div className="home-dish-card__skeleton-line" />
              <div className="home-dish-card__skeleton-line" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomeFeaturedDishes() {
  const [state, setState] = useState<FeaturedDishesState>({
    bestSellers: [],
    recommended: [],
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedDishes() {
      try {
        const [bestSellerData, recommendedData] = await Promise.all([
          getBestSellers(6, 30),
          getRecommendedDishes(6),
        ]);

        if (!isMounted) return;

        setState({
          bestSellers: bestSellerData,
          recommended: recommendedData,
          loading: false,
        });
      } catch {
        if (!isMounted) return;

        setState({
          bestSellers: [],
          recommended: [],
          loading: false,
        });
      }
    }

    loadFeaturedDishes();

    return () => {
      isMounted = false;
    };
  }, []);

  const recommendedWithoutDuplicates = useMemo(() => {
    const bestSellerIds = new Set(state.bestSellers.map((dish) => dish.id));

    return state.recommended.filter((dish) => !bestSellerIds.has(dish.id));
  }, [state.bestSellers, state.recommended]);

  if (state.loading) {
    return <FeaturedDishesSkeleton />;
  }

  if (
    state.bestSellers.length === 0 &&
    recommendedWithoutDuplicates.length === 0
  ) {
    return null;
  }

  return (
    <div className="home-featured-dishes">
      <DishSection
        eyebrow="Favoriti gostiju"
        title="Najprodavanija jela"
        text="Jela koja su se najviše poručivala u poslednjih 30 dana."
        dishes={state.bestSellers}
        badge="Best seller"
        variant="best-seller"
      />

      <DishSection
        eyebrow="Preporuka kuće"
        title="Izbor restorana"
        text="Jela koja restoran posebno preporučuje — novo, popularno ili posebno vredno probanja."
        dishes={recommendedWithoutDuplicates}
        badge="Chef pick"
        variant="recommended"
      />
    </div>
  );
}
