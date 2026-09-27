import { forwardRef, useCallback, useRef } from "react";
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
  forwardedRef
) {
  const { isSettingsOpen, toggleSettings } = useSettings();
  const { pathname } = useLocation();
  const headerRef = useRef<HTMLElement | null>(null);
  const setHeaderRef = useCallback(
    (node: HTMLElement | null) => {
      headerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );
  const activeExploreItem = exploreNavItems.find((item) =>
    isNavItemActive(item, pathname)
  );
  const layout = useHeaderLayout(headerRef, activeExploreItem?.label ?? "");
  const explore = useDisclosure<HTMLElement>(layout);
  const menu = useDisclosure<HTMLElement>(layout);
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

  const menuNav = (
    <nav
      ref={menu.containerRef}
      className="site-header__nav site-header__menu"
      aria-label="Primary navigation"
      {...menu.containerProps}
    >
      <button {...menu.buttonProps} className="site-header__disclosure-toggle">
        Menu
        <FontAwesomeIcon className="site-header__caret" icon={faChevronDown} />
      </button>
      <div
        id={menu.panelId}
        className="site-header__panel site-header__menu-panel"
        hidden={!menu.isOpen}
      >
        <HeaderLinkList items={coreNavItems} pathname={pathname} onNavigate={menu.close} />
        <span id={EXPLORE_LABEL_ID} className="site-header__panel-heading">
          Explore
        </span>
        <HeaderLinkList
          items={exploreNavItems}
          pathname={pathname}
          labelledBy={EXPLORE_LABEL_ID}
          onNavigate={menu.close}
        />
      </div>
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

  let body;
  if (layout === "menu") {
    body = (
      <>
        {menuNav}
        {actions}
      </>
    );
  } else if (layout === "phone") {
    body = (
      <>
        {exploreNav}
        {actions}
        {coreNav}
      </>
    );
  } else {
    body = (
      <>
        {coreNav}
        {exploreNav}
        {actions}
      </>
    );
  }

  return (
    <header ref={setHeaderRef} className="site-header" data-layout={layout}>
      {brand}
      {body}
    </header>
  );
});

export default HeaderNavigation;
