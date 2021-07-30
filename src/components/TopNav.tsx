import "./TopNav.css";
import { FC, Fragment, MouseEventHandler, useState } from "react";
import { useEffect } from "react";

declare interface TopNavProps {}
declare interface TopNavItemContainerProps {
  toggle?: boolean;
  onClick?: MouseEventHandler;
}
declare interface TopNavItemProps {}

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
  onClick,
}) => {
  const [activeChild, setActiveChild] = useState(0);

  useEffect(() => {
    if (Array.isArray(children)) {
      setActiveChild((active) => (active === 0 ? 1 : 0));
    }
  }, [toggle, children]);

  return (
    <Fragment>
      <div className="item-container" onClick={onClick}>
        {Array.isArray(children) ? children[activeChild] : children}
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
