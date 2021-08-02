// todo: Refactor code ♻
import { FC, Fragment, useEffect, useRef, useState } from "react";
import { TopNav, TopNavItem, TopNavItemContainer } from "./TopNav";
import "./Room.css";
import { Avatar } from "./Avatar";
import { RouteComponentProps } from "react-router-dom";
import { Header } from "./Header";
import Modal from "./Modal";
import { Socket } from "socket.io-client";
import { useSocket } from "../hooks/useSocket";
import { WRTC } from "../services/wrtc";

declare interface Props extends RouteComponentProps<{ id: string }> {
  setTheme: Function;
}

const Room: FC<Props> = ({ setTheme, match }) => {
  const [toggleThemeIcon, setToggleThemeIcon] = useState(false);
  const [roomId, setRoomId] = useState(match.params.id);
  const [switchModal, setSwitchModal] = useState(false);
  const [peers, setPeers] = useState([]);
  const [fileConfirm, setFileConfirm] = useState(false);

  const socketRef = useRef<Socket>(useSocket());
  const switchRoomInputRef = useRef<HTMLInputElement>();

  /**
   * WRTC object has properties:
   * * peerConnection: RTCPeerConnection - this is null until "you" decide to connect to a peer or receive an offer.
   * * dataChannel: RTCDataChannel - main data channel.
   * WRTC object has methods:
   * * sendBinary(data: ArrayBuffer, id?: number) - send binary data through dataChannel. Negotiation is needed before sending any binary data.
   * * sendJson(json: any) - send binary data through dataChannel. Negotiation is needed before sending any binary data.
   * * connect(desc: RTCSessionDescription) - connect to peer. If "you" are connecting to peer, then pass true, otherwise leave blank.
   * * connect(initiator: boolean, opts?: { description: RTCSessionDescription }) - connect to peer. If "you" are connecting to peer, then pass true, otherwise leave blank.
   * * connect(initOrDesc: boolean | RTCSessionDescription) - connect to peer. If "you" are connecting to peer, then pass true, otherwise leave blank.
   * * disconnect() - disconnect from peer.
   * WRTC object events:
   * * signal - ready to signal ICE to peer.
   * * data - receiving binary data
   */
  const [wrtcPool, setWrtcPool] = useState<Map<string, WRTC>>(new Map());
  const [confirmationInfo, setConfirmatioInfo] =
    useState<{ id: string; file: File }>(null);

  useEffect(() => {
    if (socketRef.current.disconnected) {
      socketRef.current.connect();
      socketRef.current.emit("greetings");
      socketRef.current.once("greetings", (id) => {
        console.log("greetings from server");
        if (socketRef.current.id !== id) socketRef.current.id = id;

        socketRef.current.emit("join-room", roomId);
        socketRef.current.once("room-joined", ({ joined, roomId, peers }) => {
          if (joined) {
            console.log("Join room: " + roomId);
            socketRef.current
              .off("new-peer", onNewPeer)
              .on("new-peer", onNewPeer);
            socketRef.current
              .off("peer-exit", onPeerExit)
              .on("peer-exit", onPeerExit);
            socketRef.current
              .off("new-nickname", onNewNickname)
              .on("new-nickname", onNewNickname);
            socketRef.current.off("signal", onSignal).on("signal", onSignal);
            socketRef.current.off("ping-peer", onPing).on("ping-peer", onPing);

            setPeers((_peers) => {
              for (let p of peers) {
                wrtcPool.set(
                  p.peerId,
                  new WRTC(socketRef.current.id, p.peerId)
                );
              }

              return peers;
            });
          } else {
            alert("Could not join room: " + roomId);
            // todo: route to error page
          }
        });
      });
    }
  }, [roomId, wrtcPool]);

  const onSignal = (signal: string, from: string) => {
    if (!wrtcPool.has(from)) {
      console.warn("Received signal from unknown peer: " + from);
      console.warn("Received signal: " + signal);
      return;
    }

    let wrtc = wrtcPool.get(from);

    wrtc.once("answer", (answer) => {
      socketRef.current.emit("answer", answer);
      window["dc"] = wrtcPool.get(from);
    });

    wrtc.on("close", () => {
      console.log("data channel closed.");
      wrtc.peerConnection.close();
    });

    wrtc.connect(new RTCSessionDescription(JSON.parse(signal)));
  };

  const onPing = (id: string) => {
    socketRef.current.emit("pong-peer", id);
  };

  const onNewPeer = (peer: {
    peerId: string;
    avatarId: string;
    nickname: string;
  }) => {
    // do someting
    console.log("new peer", peer);
    wrtcPool.set(peer.peerId, new WRTC(socketRef.current.id, peer.peerId));
    setPeers((peers) => [...peers, peer]);
  };

  const onPeerExit = (peerId: string) => {
    // do something
    console.log("peer exit", peerId);
    wrtcPool.delete(peerId);
    setPeers((peers) => peers.filter((p) => p.peerId !== peerId));
  };

  const toggleTheme = () => {
    setTheme();
    setToggleThemeIcon((t) => !t);
  };

  const onNewNickname = ({
    nickname,
    peerId,
  }: {
    nickname: string;
    peerId: string;
  }) => {
    setPeers((peers) =>
      peers.map((p) => {
        if (p.peerId === peerId) {
          return {
            peerId: p.peerId,
            avatarId: p.avatarId,
            nickname, // register new nickname
          };
        }

        return p;
      })
    );
  };

  const onNicknameChange = (nickname: string) => {
    if (socketRef.current.connected) {
      socketRef.current.emit("new-nickname", nickname);
    }
  };

  const toggleSwitchModal = () => {
    setSwitchModal((b) => !b);
  };

  const switchRoom = () => {
    toggleSwitchModal(); // close the modal
    let roomToSwitch = switchRoomInputRef.current.value;
    if (roomToSwitch && /^[A-Za-z0-9]{8}$/.test(roomToSwitch)) {
      // setRoomId(roomToSwitch);
      socketRef.current.emit("switch-room", roomToSwitch);
      socketRef.current.once("room-switched", ({ joined, roomId, peers }) => {
        // joined is empty string if not joined successfully.
        if (joined) {
          console.log("switched to " + roomId);
          setRoomId(roomId);
          setPeers(peers);
        } else {
          // todo: Route to error page ❌
          // todo: instead of an error page,
          // todo: allow user to copy and paste 📝
          // todo: ice candidate and manually connect
          alert("Could not join room");
        }
      });
    } else {
      alert(
        "Invalid room id. Only Alphanumeric characters are allowed and with length of 8 characters."
      );
    }
  };

  // the peerId so we know how to manage and send the file
  // to the correct peer.
  const manageSelectedFile = (peerId: string, input: HTMLInputElement) => {
    setConfirmatioInfo({
      id: peerId,
      file: input.files[0],
    });
    toggleFileModal();
  };

  const readFile = (file: File, id: string) => {
    const reader = file.stream().getReader();
    const read = async () => {
      let { value, done } = await reader.read();

      if (done) return console.log("done");

      wrtcPool.get(id).send(value.buffer);

      return read();
    };

    read();
  };

  const toggleFileModal = () => {
    if (fileConfirm && confirmationInfo !== null) {
      // cancel / exit from file confirmation modal
      // without confirming file submition
      // clear the currentFileConfirmationRef
      setConfirmatioInfo(null);
    }

    setFileConfirm((b) => !b);
  };

  const onFileConfirmed = () => {
    // start file share
    // 1. negotiate file share with peer
    // check if we actually have a current file confirmation
    if (confirmationInfo !== null) {
      let wrtc = wrtcPool.get(confirmationInfo.id);

      wrtc.once("signal", (signal) => {
        console.log(signal);

        console.log("Ping peer " + confirmationInfo.id);
        socketRef.current.emit("ping-peer", confirmationInfo.id);

        let timeout = setTimeout(() => {
          console.error("Timeout, could not reach peer " + confirmationInfo.id);
        }, 10000);

        socketRef.current.once("pong-peer", (id) => {
          clearTimeout(timeout);
          console.log("Pong from peer " + id);

          socketRef.current.emit("signal", signal);
          socketRef.current.once("answer", (answer) => {
            wrtc
              .setAnswer(new RTCSessionDescription(JSON.parse(answer)))
              .then(() => console.log("Answer set as remote description."))
              .catch(console.error)
              .finally(() => {
                // todo: remove when done testing

                wrtc.on("open", () => {
                  console.log("data channel opened.");
                  readFile(confirmationInfo.file, confirmationInfo.id);
                });
              });
          });
        });

        wrtc.on("close", () => {
          console.log("data channel closed.");
          wrtc.peerConnection.close();
        });
      });

      wrtc.connect(true);
    }

    setFileConfirm(false);
  };

  const allPeers = peers.map((peer, index) => {
    if (index === 0)
      return (
        <Avatar
          key={index}
          id={peer.avatarId}
          disableEdit={false}
          prefix="You"
          peerId={peer.peerId}
          onNicknameChange={onNicknameChange}
        />
      );

    return (
      <Avatar
        key={index}
        id={peer.avatarId}
        disableEdit={true}
        customNickname={peer.nickname}
        peerId={peer.peerId}
        onFileSelected={manageSelectedFile}
      />
    );
  });

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
        <TopNavItemContainer
          toggle={toggleThemeIcon}
          onClick={toggleTheme}
          initialIndex={
            window.localStorage.getItem("theme") &&
            window.localStorage.getItem("theme") === "dark-theme"
              ? 0
              : 1
          }
        >
          <TopNavItem for="dark-theme">
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
          <TopNavItem for="light-theme">
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
        <TopNavItemContainer onClick={toggleSwitchModal} disabled={true}>
          <TopNavItem>
            {/* Key icon (swith room) */}
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="primary-path"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </TopNavItem>
        </TopNavItemContainer>
      </TopNav>
      <Header />
      <div className="peer-field">{allPeers}</div>
      <Modal
        isOpen={switchModal}
        onClose={toggleSwitchModal}
        title="Switch Room"
        onSubmit={switchRoom}
      >
        <input
          type="text"
          name="roomId"
          maxLength={8}
          placeholder="Enter room id"
          ref={switchRoomInputRef}
        />
      </Modal>
      <Modal
        isOpen={fileConfirm}
        onClose={toggleFileModal}
        onSubmit={onFileConfirmed}
        title="File Confirmation"
      >
        {/* put file card in here */}
      </Modal>
    </Fragment>
  );
};

export default Room;
