import "./TopNav.css";
import { FC, Fragment, MouseEventHandler } from "react";

declare interface TopNavProps {}
declare interface TopNavItemContainerProps {
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
  initialIndex,
  disabled,
  onClick,
}) => {
  if (disabled) return null;

  return (
    <Fragment>
      <div className="item-container" onClick={onClick}>
        {Array.isArray(children) ? children[initialIndex] : children}
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
