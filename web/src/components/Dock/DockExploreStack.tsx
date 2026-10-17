import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCompass } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { isNavItemActive, type SiteNavItem } from "../../data/navigation";
import { useDisclosure } from "../../hooks/useDisclosure";
import "./Dock.css";

interface DockExploreStackProps {
  items: SiteNavItem[];
  pathname: string;
  baseSize: number;
}

// Narrow docks group the exploration routes behind one labeled button that
// opens a panel of named links upward.
const DockExploreStack = ({ items, pathname, baseSize }: DockExploreStackProps) => {
  const stack = useDisclosure<HTMLDivElement>();
  const activeItem = items.find((item) => isNavItemActive(item, pathname));

  return (
    <div
      ref={stack.containerRef}
      className="dock-icon-container dock-explore"
      {...stack.containerProps}
    >
      <button
        {...stack.buttonProps}
        className="dock-explore__toggle df-control df-control--latch"
        aria-label={activeItem ? `Explore: ${activeItem.label}` : "Explore"}
      >
        <div
          className="dock-icon"
          style={{
            width: `calc(${baseSize}px - 2 * var(--space-2))`,
            height: `calc(${baseSize}px - 2 * var(--space-2))`,
            fontSize: `calc((${baseSize}px - 2 * var(--space-2)) * 0.75)`,
          }}
        >
          <FontAwesomeIcon icon={faCompass} />
        </div>
      </button>
      <ul id={stack.panelId} className="dock-explore__panel" hidden={!stack.isOpen}>
        {items.map((item) => {
          const isActive = isNavItemActive(item, pathname);

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className="dock-explore__link df-control df-label"
                aria-current={isActive ? "page" : undefined}
                onClick={stack.close}
              >
                <FontAwesomeIcon icon={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DockExploreStack;
