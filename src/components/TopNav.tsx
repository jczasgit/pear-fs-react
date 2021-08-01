import "./TopNav.css";
import { FC, Fragment, MouseEventHandler, useState } from "react";
import { useEffect } from "react";

declare interface TopNavProps {}
declare interface TopNavItemContainerProps {
  toggle?: boolean;
  initialIndex?: number; // index of the initial active nav item
  disabled?: boolean;
  onClick?: MouseEventHandler;
}
declare interface TopNavItemProps {
  for?: string;
}

export const TopNavItem: FC<TopNavItemProps> = ({ children }) => {
  return (
    <Fragment>
      <span className="item">{children}</span>
    </Fragment>
  );
};

export const TopNavItemContainer: FC<TopNavItemContainerProps> = ({
  children,
  toggle,
  initialIndex,
  disabled,
  onClick,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (Array.isArray(children)) {
      setActiveIndex((i) => (i < children.length - 1 ? ++i : 0));
    }
  }, [toggle, children]);

  if (disabled) return null;

  return (
    <Fragment>
      <div className="item-container" onClick={onClick}>
        {Array.isArray(children) ? children[activeIndex] : children}
      </div>
    </Fragment>
  );
};

export const TopNav: FC<TopNavProps> = ({ children }) => {
  return (
    <Fragment>
      <nav className="topnav">{children}</nav>
    </Fragment>
  );
};
