import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getBestSellers,
  getMenu,
  getRecommendedDishes,
  type HomepageDishDto,
} from "../../api/menuApi";
import { API_ORIGIN } from "../../api/https";

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function isDishOnSale(dish: HomepageDishDto) {
  return (
    dish.isOnSale &&
    typeof dish.salePrice === "number" &&
    dish.salePrice > 0 &&
    dish.salePrice < dish.price
  );
}

function getDishEffectivePrice(dish: HomepageDishDto) {
  if (isDishOnSale(dish)) {
    return dish.salePrice!;
  }

  return dish.effectivePrice ?? dish.price;
}

function HomeDishCard({
  dish,
  variant,
}: {
  dish: HomepageDishDto;
  variant: "sale" | "recommended" | "best-seller";
}) {
  const imageUrl = resolveImageUrl(dish.imageUrl);
  const dishOnSale = isDishOnSale(dish);
  const effectivePrice = getDishEffectivePrice(dish);

  return (
    <article className="home-featured-dish-card">
      <div className="home-featured-dish-card__image">
        {imageUrl ? (
          <img src={imageUrl} alt={dish.name} loading="lazy" />
        ) : (
          <div className="home-featured-dish-card__image-fallback">
            <img src="/logo.png" alt="" />
            <span>Slika uskoro</span>
          </div>
        )}

        <div className="home-featured-dish-card__badges">
          {variant === "recommended" && (
            <span className="home-featured-dish-card__badge home-featured-dish-card__badge--chef">
              Chef Pick
            </span>
          )}

          {variant === "best-seller" && (
            <span className="home-featured-dish-card__badge home-featured-dish-card__badge--best">
              Najtraženije
            </span>
          )}

          {dishOnSale && (
            <span className="home-featured-dish-card__badge home-featured-dish-card__badge--sale">
              Akcija
            </span>
          )}
        </div>
      </div>

      <div className="home-featured-dish-card__body">
        <span className="home-featured-dish-card__category">
          {dish.categoryName}
        </span>

        <h3 className="home-featured-dish-card__title">{dish.name}</h3>

        <p className="home-featured-dish-card__description">
          {dish.description || "Posebno izdvojeno jelo iz naše ponude."}
        </p>

        <div className="home-featured-dish-card__footer">
          <div
            className={[
              "home-featured-dish-card__price",
              dishOnSale ? "home-featured-dish-card__price--sale" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {dishOnSale ? (
              <>
                <span className="home-featured-dish-card__old-price">
                  {formatPrice(dish.price)}
                </span>

                <strong className="home-featured-dish-card__new-price">
                  {formatPrice(effectivePrice)}
                </strong>
              </>
            ) : (
              <strong>{formatPrice(dish.price)}</strong>
            )}
          </div>

          {typeof dish.soldQuantity === "number" && dish.soldQuantity > 0 && (
            <span className="home-featured-dish-card__sold">
              {dish.soldQuantity} prodato
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function HomeFeaturedDishes() {
  const [recommendedDishes, setRecommendedDishes] = useState<HomepageDishDto[]>(
    [],
  );
  const [bestSellers, setBestSellers] = useState<HomepageDishDto[]>([]);
  const [saleDishes, setSaleDishes] = useState<HomepageDishDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedDishes() {
      try {
        setLoading(true);
        setError(null);

        const [menu, recommended, bestSelling] = await Promise.all([
          getMenu(),
          getRecommendedDishes(12),
          getBestSellers(18, 30),
        ]);

        if (!isMounted) {
          return;
        }

        const activeSaleDishes: HomepageDishDto[] = menu
          .filter((dish) => isDishOnSale(dish))
          .sort((firstDish, secondDish) => {
            const firstDiscount =
              (firstDish.price - getDishEffectivePrice(firstDish)) /
              firstDish.price;

            const secondDiscount =
              (secondDish.price - getDishEffectivePrice(secondDish)) /
              secondDish.price;

            return secondDiscount - firstDiscount;
          })
          .slice(0, 6)
          .map((dish) => ({
            id: dish.id,
            name: dish.name,
            description: dish.description,
            price: dish.price,
            isOnSale: dish.isOnSale,
            salePrice: dish.salePrice,
            effectivePrice: dish.effectivePrice,
            imageUrl: dish.imageUrl,
            categoryId: dish.categoryId,
            categoryName: dish.categoryName,
            soldQuantity: null,
          }));

        setSaleDishes(activeSaleDishes);
        setRecommendedDishes(recommended);
        setBestSellers(bestSelling);
      } catch (error: any) {
        if (!isMounted) {
          return;
        }

        setError(
          error?.response?.data?.message ??
            error?.response?.data?.title ??
            error?.message ??
            "Nismo uspeli da učitamo izdvojena jela.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFeaturedDishes();

    return () => {
      isMounted = false;
    };
  }, []);

  const uniqueRecommendedDishes = useMemo(() => {
    const saleIds = new Set(saleDishes.map((dish) => dish.id));

    return recommendedDishes
      .filter((dish) => !saleIds.has(dish.id))
      .slice(0, 6);
  }, [saleDishes, recommendedDishes]);

  const uniqueBestSellers = useMemo(() => {
    const saleIds = new Set(saleDishes.map((dish) => dish.id));

    const recommendedIds = new Set(
      uniqueRecommendedDishes.map((dish) => dish.id),
    );

    return bestSellers
      .filter((dish) => !saleIds.has(dish.id))
      .filter((dish) => !recommendedIds.has(dish.id))
      .slice(0, 6);
  }, [saleDishes, uniqueRecommendedDishes, bestSellers]);

  if (loading) {
    return (
      <section className="home-featured-dishes home-featured-dishes--state">
        <p>Učitavamo izdvojena jela...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="home-featured-dishes home-featured-dishes--state">
        <p>{error}</p>
      </section>
    );
  }

  if (
    saleDishes.length === 0 &&
    uniqueRecommendedDishes.length === 0 &&
    uniqueBestSellers.length === 0
  ) {
    return (
      <section className="home-featured-dishes home-featured-dishes--state">
        <p>Još nema dovoljno podataka za izdvojena jela.</p>
      </section>
    );
  }

  return (
    <div className="home-featured-dishes">
      {saleDishes.length > 0 && (
        <section id="akcija" className="home-featured-dishes__section">
          <div className="home-featured-dishes__section-header">
            <span>Akcija danas</span>

            <h3>Jela na akciji</h3>
          </div>

          <div className="home-featured-dishes__grid">
            {saleDishes.map((dish) => (
              <HomeDishCard
                key={`sale-${dish.id}`}
                dish={dish}
                variant="sale"
              />
            ))}
          </div>
        </section>
      )}

      {uniqueRecommendedDishes.length > 0 && (
        <section id="chef-pick" className="home-featured-dishes__section">
          <div className="home-featured-dishes__section-header">
            <span>Chef Pick</span>

            <h3>Preporuke kuće</h3>
          </div>

          <div className="home-featured-dishes__grid">
            {uniqueRecommendedDishes.map((dish) => (
              <HomeDishCard
                key={`recommended-${dish.id}`}
                dish={dish}
                variant="recommended"
              />
            ))}
          </div>
        </section>
      )}

      {uniqueBestSellers.length > 0 && (
        <section id="najtrazenije" className="home-featured-dishes__section">
          <div className="home-featured-dishes__section-header">
            <span>Best Sellers</span>

            <h3>Najtraženija jela</h3>
          </div>

          <div className="home-featured-dishes__grid">
            {uniqueBestSellers.map((dish) => (
              <HomeDishCard
                key={`best-seller-${dish.id}`}
                dish={dish}
                variant="best-seller"
              />
            ))}
          </div>
        </section>
      )}

      <div className="home-featured-dishes__actions">
        <Link to="/menu" className="btn btn--primary btn--lg">
          Pogledaj ceo meni
        </Link>
      </div>
    </div>
  );
}
