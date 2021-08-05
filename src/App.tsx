import { useEffect, useRef } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { Load } from "./components/Load";
import Room from "./components/Room";
import { SocketProvider } from "./hooks/useSocket";
import { NotificationProvider } from "./hooks/useNotification";

function App() {
  const themeRef = useRef<string>(
    window.localStorage.getItem("theme") ?? "dark-theme"
  );
  const bodyRef = useRef<HTMLElement>(document.querySelector("body"));

  const toggleTheme = (init: boolean = false) => {
    if (init) {
      bodyRef.current.classList.add(themeRef.current);
      return;
    }

    if (themeRef.current === "dark-theme") {
      bodyRef.current.classList.remove("dark-theme");
      bodyRef.current.classList.add("light-theme");
      themeRef.current = "light-theme";
    } else {
      bodyRef.current.classList.remove("light-theme");
      bodyRef.current.classList.add("dark-theme");
      themeRef.current = "dark-theme";
    }

    // Store theme setting for persistance in localstorage
    window.localStorage.setItem("theme", themeRef.current);
  };

  useEffect(() => {
    toggleTheme(true);
  }, []);

  return (
    <SocketProvider url="http://localhost:3001">
      <NotificationProvider>
        <BrowserRouter>
          <Switch>
            <Route path="/" exact component={Load} />
            <Route
              path="/room/:id"
              render={(props) => (
                <Room
                  setTheme={toggleTheme}
                  history={props.history}
                  location={props.location}
                  match={props.match}
                  staticContext={props.staticContext}
                />
              )}
            />
          </Switch>
        </BrowserRouter>
      </NotificationProvider>
    </SocketProvider>
  );
}

export default App;
