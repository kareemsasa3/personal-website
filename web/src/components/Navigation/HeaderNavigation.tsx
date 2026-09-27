import { forwardRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "react-router-dom";
import { isNavItemActive, navItems } from "../../data/navigation";
import { useSettings } from "../../contexts/SettingsContext";

const HeaderNavigation = forwardRef<HTMLElement>(function HeaderNavigation(
  _props,
  ref
) {
  const { isSettingsOpen, toggleSettings } = useSettings();
  const { pathname } = useLocation();

  return (
    <header ref={ref} className="site-header">
      <Link className="site-header__brand" to="/" aria-label="Kareem Sasa home">
        <span className="site-header__brand-mark" aria-hidden="true">
          KS
        </span>
        <span className="site-header__brand-name">Kareem Sasa</span>
      </Link>

      <nav className="site-header__nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const isActive = isNavItemActive(item, pathname);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`site-header__link ${isActive ? "active" : ""}`}
            >
              <FontAwesomeIcon className="site-header__link-icon" icon={item.icon} />
              <span className="site-header__link-label">{item.label}</span>
              <span className="site-header__tooltip" aria-hidden="true">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="site-header__actions">
        <button
          type="button"
          className={`site-header__settings-button ${
            isSettingsOpen ? "active" : ""
          }`}
          onClick={toggleSettings}
          aria-label="Open settings"
          aria-pressed={isSettingsOpen}
        >
          <FontAwesomeIcon icon={faCog} />
        </button>
      </div>
    </header>
  );
});

export default HeaderNavigation;
