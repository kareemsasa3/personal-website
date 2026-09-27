import { forwardRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faCog } from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "react-router-dom";
import {
  coreNavItems,
  exploreNavItems,
  isNavItemActive,
  type SiteNavItem,
} from "../../data/navigation";
import { useSettings } from "../../contexts/SettingsContext";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useHeaderLayout } from "./useHeaderLayout";

const EXPLORE_LABEL_ID = "site-nav-explore-label";

interface HeaderLinkListProps {
  items: SiteNavItem[];
  pathname: string;
  id?: string;
  className?: string;
  hidden?: boolean;
  labelledBy?: string;
  onNavigate?: () => void;
}

const HeaderLinkList = ({
  items,
  pathname,
  id,
  className = "",
  hidden,
  labelledBy,
  onNavigate,
}: HeaderLinkListProps) => (
  <ul
    id={id}
    className={`site-header__list ${className}`.trim()}
    hidden={hidden}
    aria-labelledby={labelledBy}
  >
    {items.map((item) => {
      const isActive = isNavItemActive(item, pathname);

      return (
        <li key={item.path}>
          <Link
            to={item.path}
            className={`site-header__link ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        </li>
      );
    })}
  </ul>
);

const HeaderNavigation = forwardRef<HTMLElement>(function HeaderNavigation(
  _props,
  ref
) {
  const { isSettingsOpen, toggleSettings } = useSettings();
  const { pathname } = useLocation();
  const layout = useHeaderLayout();
  const explore = useDisclosure<HTMLElement>(layout);
  const activeExploreItem = exploreNavItems.find((item) =>
    isNavItemActive(item, pathname)
  );
  const isExploreDisclosed = layout !== "wide";

  const brand = (
    <Link
      className="site-header__brand"
      to="/"
      aria-label="Kareem Sasa home"
      aria-current={pathname === "/" ? "page" : undefined}
    >
      <span className="site-header__brand-mark" aria-hidden="true">
        KS
      </span>
      <span className="site-header__brand-name">Kareem Sasa</span>
    </Link>
  );

  const coreNav = (
    <nav className="site-header__nav site-header__core" aria-label="Primary navigation">
      <HeaderLinkList items={coreNavItems} pathname={pathname} />
    </nav>
  );

  const exploreNav = (
    <nav
      ref={explore.containerRef}
      className="site-header__nav site-header__explore"
      aria-labelledby={EXPLORE_LABEL_ID}
      {...explore.containerProps}
    >
      <span id={EXPLORE_LABEL_ID} className="site-header__explore-label">
        Explore
      </span>
      {isExploreDisclosed && (
        <button
          {...explore.buttonProps}
          className={`site-header__disclosure-toggle ${activeExploreItem ? "active" : ""}`}
        >
          {activeExploreItem && layout !== "phone"
            ? `Explore: ${activeExploreItem.label}`
            : "Explore"}
          <FontAwesomeIcon className="site-header__caret" icon={faChevronDown} />
        </button>
      )}
      <HeaderLinkList
        id={explore.panelId}
        items={exploreNavItems}
        pathname={pathname}
        className={isExploreDisclosed ? "site-header__panel" : ""}
        hidden={isExploreDisclosed && !explore.isOpen}
        onNavigate={explore.close}
      />
    </nav>
  );

  const actions = (
    <div className="site-header__actions">
      <button
        type="button"
        className={`site-header__settings-button ${isSettingsOpen ? "active" : ""}`}
        onClick={toggleSettings}
        aria-label="Open settings"
        aria-pressed={isSettingsOpen}
      >
        <FontAwesomeIcon icon={faCog} />
      </button>
    </div>
  );

  return (
    <header ref={ref} className="site-header" data-layout={layout}>
      {brand}
      {layout === "phone" ? (
        <>
          {exploreNav}
          {actions}
          {coreNav}
        </>
      ) : (
        <>
          {coreNav}
          {exploreNav}
          {actions}
        </>
      )}
    </header>
  );
});

export default HeaderNavigation;
