import { forwardRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { NavLink } from "react-router-dom";
import { navItems } from "../../data/navigation";
import { useSettings } from "../../contexts/SettingsContext";

const HeaderNavigation = forwardRef<HTMLElement>(function HeaderNavigation(
  _props,
  ref
) {
  const { isSettingsOpen, toggleSettings } = useSettings();

  return (
    <header ref={ref} className="site-header">
      <NavLink className="site-header__brand" to="/" aria-label="Kareem Sasa home">
        <span className="site-header__brand-mark" aria-hidden="true">
          KS
        </span>
        <span className="site-header__brand-name">Kareem Sasa</span>
      </NavLink>

      <nav className="site-header__nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `site-header__link ${isActive ? "active" : ""}`
            }
          >
            <FontAwesomeIcon className="site-header__link-icon" icon={item.icon} />
            <span className="site-header__link-label">{item.label}</span>
          </NavLink>
        ))}
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
