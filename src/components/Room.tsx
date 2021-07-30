import { useState } from "react";
import { FC, Fragment } from "react";
import { TopNav, TopNavItem, TopNavItemContainer } from "./TopNav";
import "./Room.css";
import { Avatar } from "./Avatar";

declare interface Props {
  setTheme: Function;
}

const Room: FC<Props> = ({ setTheme }) => {
  const [toggleThemeIcon, setToggleThemeIcon] = useState(false);

  const toggleTheme = () => {
    setTheme();
    setToggleThemeIcon((t) => !t);
  };

  return (
    <Fragment>
      <TopNav>
        <TopNavItemContainer>
          <TopNavItem>
            {/* Share Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                className="primary-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </TopNavItem>
        </TopNavItemContainer>
        <TopNavItemContainer>
          <TopNavItem>
            {/* Network Traffic Icon */}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="secondary-path traffic-arrow"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 17l-4 4m0 0l-4-4m4 4V3"
              />
              <path
                className="primary-path traffic-arrow"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 7l4-4m0 0l4 4m-4-4v18"
              />
            </svg>
          </TopNavItem>
        </TopNavItemContainer>
        <TopNavItemContainer toggle={toggleThemeIcon} onClick={toggleTheme}>
          <TopNavItem>
            {/* Sun Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                className="primary-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </TopNavItem>
          <TopNavItem>
            {/* Moon Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                className="primary-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </TopNavItem>
        </TopNavItemContainer>
      </TopNav>
      <h1>Header</h1>
      <Avatar id={1} />
    </Fragment>
  );
};

export default Room;
