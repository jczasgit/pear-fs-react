import { useRef } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { Load } from "./components/Load";
import Room from "./components/Room";
import { SocketProvider } from "./hooks/useSocket";

const SOCKET_URL = "http://localhost:3001";

function App() {
  // const [theme, setTheme] = useState("dark-theme");
  const themeRef = useRef<string>("dark-theme");
  const bodyRef = useRef<HTMLElement>(document.querySelector("body"));

  const toggleTheme = () => {
    if (themeRef.current === "dark-theme") {
      bodyRef.current.classList.remove("dark-theme");
      bodyRef.current.classList.add("light-theme");
      themeRef.current = "light-theme";
    } else {
      bodyRef.current.classList.remove("light-theme");
      bodyRef.current.classList.add("dark-theme");
      themeRef.current = "dark-theme";
    }
  };

  return (
    <SocketProvider url={SOCKET_URL}>
      <BrowserRouter>
        <Switch>
          <Route path="/" exact component={Load} />
          <Route
            path="/room/:id"
            render={(props) => <Room setTheme={toggleTheme} />}
          />
        </Switch>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
